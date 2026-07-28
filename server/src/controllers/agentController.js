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
import { resolveVapiConfig, resolveGeminiConfig } from '../services/apiKeyService.js';
import { env } from '../config/env.js';
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
    // Regenerate the system prompt from the updated details (workspace's Gemini key).
    const gemini = await resolveGeminiConfig(req.workspaceId);
    agent.systemPrompt = await generateSystemPrompt({
      agentName: agent.name,
      businessName: agent.businessName,
      businessType: agent.businessType,
      agentPurpose: agent.purpose,
      services: agent.services,
      tone: agent.tone,
      languages: agent.languages,
      escalationInstructions: agent.escalationInstructions,
    }, gemini).catch(() =>
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

    // Update the assistant on the workspace's Vapi account (preserving its id);
    // save locally only on success.
    const vapiConfig = await resolveVapiConfig(req.workspaceId);
    if (agent.vapiAssistantId && vapiConfig.privateKey) {
      const payload = buildAssistantPayload({
        name: agent.name,
        firstMessage: agent.firstMessage,
        systemPrompt: agent.systemPrompt,
        voiceProvider: agent.voiceProvider,
        voiceId: agent.voiceId,
      });
      await updateAssistant(agent.vapiAssistantId, payload, vapiConfig);
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
  // Use the agent's workspace Vapi account (BYOK). Calls need a public key; when
  // the workspace brings its own key the user pays Vapi directly so app credits
  // don't gate — otherwise (system key) we still require an affordable minute.
  const vapiConfig = await resolveVapiConfig(agent.workspaceId);
  const callsEnabled =
    Boolean(vapiConfig.publicKey) &&
    (vapiConfig.isByo || (await canAfford(agent.userId, VOICE_CREDITS_PER_MINUTE)));
  return ok(res, {
    agent: agent.toPublicView(),
    vapiPublicKey: vapiConfig.publicKey || '',
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

  // BYOK: when the workspace brings its own Gemini key the visitor's chat runs on
  // the owner's account — no app credits are charged or checked. Only the system-
  // key path (the app pays) meters credits.
  const gemini = await resolveGeminiConfig(agent.workspaceId);
  const mustCharge = !gemini.isByo;

  // Strict BYOK with no workspace Gemini key: there is nothing to generate a
  // reply with (system keys are off), so the widget is unavailable — capture the
  // lead but don't fabricate a canned answer.
  if (env.requireByok && !gemini.enabled) {
    await captureChatLead({ agent, sessionId, messages });
    return ok(res, {
      reply: "Thanks for reaching out! I'm unavailable right now — please leave your details and the team will follow up.",
      unavailable: true,
    });
  }

  // System-key path with no balance: still record the lead, but don't spend to reply.
  if (mustCharge && !(await canAfford(agent.userId, CHAT_CREDITS_PER_MESSAGE))) {
    await captureChatLead({ agent, sessionId, messages });
    return ok(res, {
      reply: "Thanks for reaching out! I'm unavailable right now — please leave your details and the team will follow up.",
      unavailable: true,
    });
  }

  const reply = await chatWithAgent(agent, messages, gemini);
  if (mustCharge) {
    await spend(agent.userId, CHAT_CREDITS_PER_MESSAGE, {
      source: 'chat',
      reason: 'Chat reply',
      agentId: agent._id,
    });
  }
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

  const vapiConfig = await resolveVapiConfig(req.workspaceId);
  if (agent.vapiAssistantId && vapiConfig.privateKey) {
    try {
      await deleteAssistant(agent.vapiAssistantId, vapiConfig);
    } catch (err) {
      // If the assistant is already gone on Vapi's side, continue with local cleanup.
      if (!/not found|404/i.test(err?.message || '')) throw err;
    }
  }

  await agent.deleteOne();
  return ok(res, {}, 'Agent deleted.');
});
