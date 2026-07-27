import { Agent } from '../models/Agent.js';
import { ok, AppError } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { updateAgentSchema, publicChatSchema, callLeadSchema } from '../validators/agentValidator.js';
import { chatWithAgent } from '../services/agentChatService.js';
import { captureChatLead, captureCallLead } from '../services/leadService.js';
import { CHAT_CREDITS_PER_MESSAGE, VOICE_CREDITS_PER_MINUTE } from '../config/plans.js';
import { canAfford, spend } from '../services/creditService.js';
import { SUPPORTED_VOICES, getVoiceById } from '../config/voices.js';
import { buildSystemPrompt } from '../services/agentPromptService.js';
import { generateSystemPrompt } from '../services/geminiAgentBuilderService.js';
import { buildAssistantPayload, updateAssistant, deleteAssistant } from '../services/vapiAssistantService.js';
import { env, vapiEnabled } from '../config/env.js';
import { genPublicId } from '../utils/ids.js';

/** An agent is accessible to everyone in its workspace — scope by that, not the caller. */
async function getWorkspaceAgent(agentId, workspaceId) {
  const agent = await Agent.findOne({ _id: agentId, workspaceId });
  if (!agent) throw new AppError('Agent not found.', 404, 'AGENT_NOT_FOUND');
  return agent;
}

/** GET /api/agents */
export const listAgents = asyncHandler(async (req, res) => {
  const { search, status } = req.query;
  const query = { workspaceId: req.workspaceId };
  if (status && ['active', 'draft', 'disabled', 'failed'].includes(status)) query.status = status;
  if (search) {
    const rx = new RegExp(String(search).slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: rx }, { businessName: rx }, { purpose: rx }];
  }
  const agents = await Agent.find(query).sort({ updatedAt: -1 });
  return ok(res, { agents: agents.map((a) => a.toJSONView()) });
});

/** GET /api/agents/summary — dashboard metrics. */
export const summary = asyncHandler(async (req, res) => {
  const agents = await Agent.find({ workspaceId: req.workspaceId });
  const today = new Date().toISOString().slice(0, 10);
  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.status === 'active').length;
  const callsToday = agents.reduce((n, a) => n + (a.stats?.statsDate === today ? a.stats.callsToday : 0), 0);
  const totalSeconds = agents.reduce((n, a) => n + (a.stats?.totalCallSeconds || 0), 0);
  return ok(res, {
    totalAgents,
    activeAgents,
    callsToday,
    totalCallMinutes: Math.round(totalSeconds / 60),
    recentAgents: agents.slice(0, 4).map((a) => a.toJSONView()),
  });
});

/** GET /api/agents/:agentId */
export const getAgent = asyncHandler(async (req, res) => {
  const agent = await getWorkspaceAgent(req.params.agentId, req.workspaceId);
  return ok(res, { agent: agent.toJSONView() });
});

/**
 * PATCH /api/agents/:agentId
 * Updates the local agent AND the existing Vapi assistant (same assistant id).
 * Local DB is only saved after the Vapi update succeeds.
 */
export const updateAgent = asyncHandler(async (req, res) => {
  const agent = await getWorkspaceAgent(req.params.agentId, req.workspaceId);
  const updates = updateAgentSchema.parse(req.body);

  // Fields that affect the Vapi assistant. Appearance/publish/status fields are
  // local-only and never trigger a Vapi call.
  const VAPI_RELEVANT = [
    'name',
    'businessName',
    'businessType',
    'businessLocation',
    'purpose',
    'services',
    'tone',
    'languages',
    'firstMessage',
    'escalationInstructions',
    'selectedVoiceId',
  ];
  const touchesVapi = VAPI_RELEVANT.some((k) => updates[k] !== undefined);

  // Apply plain field updates.
  const map = {
    name: 'name',
    businessName: 'businessName',
    businessType: 'businessType',
    businessLocation: 'businessLocation',
    purpose: 'purpose',
    services: 'services',
    tone: 'tone',
    languages: 'languages',
    firstMessage: 'firstMessage',
    escalationInstructions: 'escalationInstructions',
    status: 'status',
    isPublic: 'isPublic',
    tagline: 'tagline',
    bio: 'bio',
    avatarUrl: 'avatarUrl',
    themeColor: 'themeColor',
  };
  for (const [k, field] of Object.entries(map)) {
    if (updates[k] !== undefined) agent[field] = updates[k];
  }

  // Public-page builder config (local-only, never sent to Vapi). Guard the blob
  // size so a runaway payload (e.g. a huge pasted data URL) can't bloat the doc.
  if (updates.pageSettings !== undefined) {
    if (JSON.stringify(updates.pageSettings).length > 200_000) {
      throw new AppError('Page settings are too large. Use image URLs instead of embedded files.', 413, 'PAGE_SETTINGS_TOO_LARGE');
    }
    agent.pageSettings = updates.pageSettings;
    agent.markModified('pageSettings');
  }

  if (updates.selectedVoiceId) {
    const voice = getVoiceById(updates.selectedVoiceId) ||
      SUPPORTED_VOICES.find((v) => v.voiceId === updates.selectedVoiceId);
    if (!voice) throw new AppError('Unsupported voice.', 422, 'UNSUPPORTED_VOICE');
    agent.voiceProvider = voice.provider;
    agent.voiceId = voice.voiceId;
    agent.voiceName = voice.name;
  }

  // Ensure a share id exists (older agents created before this feature).
  if (!agent.publicId) agent.publicId = genPublicId();

  if (touchesVapi) {
    // Regenerate the system prompt from the updated details.
    agent.systemPrompt = await generateSystemPrompt({
      agentName: agent.name,
      businessName: agent.businessName,
      businessType: agent.businessType,
      agentPurpose: agent.purpose,
      services: agent.services,
      tone: agent.tone,
      languages: agent.languages,
      escalationInstructions: agent.escalationInstructions,
    }).catch(() =>
      buildSystemPrompt({
        agentName: agent.name,
        businessName: agent.businessName,
        businessType: agent.businessType,
        businessLocation: agent.businessLocation,
        agentPurpose: agent.purpose,
        services: agent.services,
        tone: agent.tone,
        languages: agent.languages,
        escalationInstructions: agent.escalationInstructions,
      })
    );

    // Update Vapi first (preserving the existing assistant id); save locally only on success.
    if (agent.vapiAssistantId && vapiEnabled()) {
      const payload = buildAssistantPayload({
        name: agent.name,
        firstMessage: agent.firstMessage,
        systemPrompt: agent.systemPrompt,
        voiceProvider: agent.voiceProvider,
        voiceId: agent.voiceId,
      });
      await updateAssistant(agent.vapiAssistantId, payload);
    }
  }

  await agent.save();
  const message = touchesVapi ? 'Agent updated.' : 'Changes saved.';
  return ok(res, { agent: agent.toJSONView() }, message);
});

/**
 * GET /api/public/agents/:publicId  (NO AUTH)
 * Returns public-safe details for a PUBLISHED agent so anyone with the link can
 * view it and start a browser call. Unpublished / unknown ids return 404.
 */
export const getPublicAgent = asyncHandler(async (req, res) => {
  const agent = await Agent.findOne({ publicId: req.params.publicId });
  if (!agent || !agent.isPublic || agent.status === 'disabled') {
    throw new AppError('This voice agent is not available.', 404, 'AGENT_NOT_AVAILABLE');
  }
  // Voice calls are only offered while the owner can afford at least a minute.
  const callsEnabled = await canAfford(agent.userId, VOICE_CREDITS_PER_MINUTE);
  return ok(res, {
    agent: agent.toPublicView(),
    vapiPublicKey: env.vapi.publicKey || '',
    callsEnabled,
  });
});

/**
 * POST /api/public/agents/:publicId/chat  (NO AUTH)
 * Text chat with a PUBLISHED agent. The agent's system prompt is used
 * server-side only and is never exposed to the browser.
 */
export const publicChat = asyncHandler(async (req, res) => {
  const agent = await Agent.findOne({ publicId: req.params.publicId });
  if (!agent || !agent.isPublic || agent.status === 'disabled') {
    throw new AppError('This voice agent is not available.', 404, 'AGENT_NOT_AVAILABLE');
  }
  const { messages, sessionId } = publicChatSchema.parse(req.body);

  // Out of credits: still record the lead (the visitor engaged), but don't
  // spend money generating a reply.
  if (!(await canAfford(agent.userId, CHAT_CREDITS_PER_MESSAGE))) {
    await captureChatLead({ agent, sessionId, messages });
    return ok(res, {
      reply: "Thanks for reaching out! I'm unavailable right now — please leave your details and the team will follow up.",
      unavailable: true,
    });
  }

  const reply = await chatWithAgent(agent, messages);
  await spend(agent.userId, CHAT_CREDITS_PER_MESSAGE, {
    source: 'chat',
    reason: 'Chat reply',
    agentId: agent._id,
  });
  // Capture / update the lead for this chat session (never blocks the reply).
  await captureChatLead({ agent, sessionId, messages: [...messages, { role: 'assistant', content: reply }] });
  return ok(res, { reply });
});

/**
 * POST /api/public/agents/:publicId/call-lead  (NO AUTH)
 * Records that a visitor started a browser voice call, so a lead is generated
 * even before any transcript is available.
 */
export const publicCallLead = asyncHandler(async (req, res) => {
  const agent = await Agent.findOne({ publicId: req.params.publicId });
  if (!agent || !agent.isPublic || agent.status === 'disabled') {
    throw new AppError('This voice agent is not available.', 404, 'AGENT_NOT_AVAILABLE');
  }
  const { sessionId } = callLeadSchema.parse(req.body || {});
  await captureCallLead({ agent, sessionId });
  return ok(res, { captured: true });
});

/**
 * DELETE /api/agents/:agentId
 * Removes the Vapi assistant (ignoring 404) then deletes the local agent.
 */
export const deleteAgent = asyncHandler(async (req, res) => {
  const agent = await getWorkspaceAgent(req.params.agentId, req.workspaceId);

  if (agent.vapiAssistantId && vapiEnabled()) {
    try {
      await deleteAssistant(agent.vapiAssistantId);
    } catch (err) {
      // If the assistant is already gone on Vapi's side, continue with local cleanup.
      if (!/not found|404/i.test(err?.message || '')) throw err;
    }
  }

  await agent.deleteOne();
  return ok(res, {}, 'Agent deleted.');
});
