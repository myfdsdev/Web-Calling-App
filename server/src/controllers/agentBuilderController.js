import { AgentDraft } from '../models/AgentDraft.js';
import { AgentBuilderMessage } from '../models/AgentBuilderMessage.js';
import { Agent } from '../models/Agent.js';
import { ok, AppError } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  startSchema,
  messageSchema,
  patchDraftSchema,
  generateGreetingSchema,
} from '../validators/agentBuilderValidator.js';
import { SUPPORTED_VOICES, getVoiceById } from '../config/voices.js';
import {
  FLOW,
  TOTAL_STEPS,
  getStep,
  STEP_BY_KEY,
  stepUi,
  normalizeServices,
  isReadyForReview,
  isStepAnswered,
} from '../services/builderFlow.js';
import {
  getOwnedDraft,
  addMessage,
  recomputeAndSave,
  draftProgress,
} from '../services/agentDraftService.js';
import {
  extractAnswer,
  generateGreeting,
  generateSystemPrompt,
  suggestBusinessTypes,
} from '../services/geminiAgentBuilderService.js';
import { getPlan } from '../config/plans.js';
import { getAccount } from '../services/creditService.js';
import { buildAssistantPayload, createAssistant } from '../services/vapiAssistantService.js';

const REVIEW_MESSAGE =
  "That's everything I need! I've put together a summary of your agent. Review the details and, when you're happy, create your voice agent.";

function reviewUi() {
  return { step: TOTAL_STEPS + 1, stepKey: 'review', inputType: 'review' };
}

/** Build the assistant message payload for the draft's current position. */
async function assistantForCurrent(draft, ackPrefix = '') {
  if (draft.currentStep > TOTAL_STEPS) {
    return { content: REVIEW_MESSAGE, stepKey: 'review', structuredData: { ui: reviewUi() } };
  }
  const step = getStep(draft.currentStep);
  let ui = stepUi(step);
  let question = step.question;

  // Business type: infer likely categories from the business name so the user
  // confirms a tailored guess instead of scanning a generic list.
  if (step.stepKey === 'businessType' && draft.businessName) {
    const suggested = await suggestBusinessTypes(draft.businessName).catch(() => null);
    if (suggested) {
      question = `“${draft.businessName}” looks like a ${suggested.guess} business — is that right? Pick the closest match:`;
      ui = {
        ...ui,
        options: [
          ...suggested.options.map((o) => ({ label: o, value: o })),
          { label: 'Something else', value: '__custom__' },
        ],
      };
    }
  }

  const content = ackPrefix ? `${ackPrefix} ${question}` : question;
  return { content, stepKey: step.stepKey, structuredData: { ui } };
}

// ── Languages helper: "English and Hindi" -> ["English","Hindi"] ─────────────
function splitLanguages(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || '')
    .split(/\s*(?:,|&|\band\b|\/)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * POST /api/agent-builder/start
 *
 * Every visit begins a BRAND-NEW agent. A draft is only resumed when the client
 * asks for one by id — which it does after a page refresh, so an in-progress
 * conversation survives F5 without half-finished drafts coming back later.
 */
export const start = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { draftId: requestedId } = startSchema.parse(req.body || {});

  let draft = null;
  let resumed = false;

  if (requestedId) {
    draft = await AgentDraft.findOne({
      _id: requestedId,
      userId,
      workspaceId: req.workspaceId,
      status: { $in: ['draft', 'ready-for-review', 'failed'] },
    });
    resumed = Boolean(draft);
  }

  if (!draft) {
    // Discard abandoned mid-conversation drafts so they can never resurface.
    // Scoped to this workspace so switching workspaces never nukes the other's draft.
    const stale = await AgentDraft.find({
      userId,
      workspaceId: req.workspaceId,
      status: 'draft',
    }).select('_id');
    if (stale.length) {
      const ids = stale.map((d) => d._id);
      await AgentBuilderMessage.deleteMany({ draftId: { $in: ids } });
      await AgentDraft.deleteMany({ _id: { $in: ids } });
    }

    draft = await AgentDraft.create({
      userId,
      workspaceId: req.workspaceId,
      currentStep: 1,
      completionPercentage: 5,
      status: 'draft',
    });
    const first = await assistantForCurrent(draft);
    await addMessage(draft, userId, 'assistant', first.content, first.stepKey, first.structuredData);
  }

  const messages = await AgentBuilderMessage.find({ draftId: draft._id }).sort({ createdAt: 1 });

  return ok(res, {
    draftId: draft._id.toString(),
    resumed,
    draft: draft.toJSONView(),
    progress: draftProgress(draft),
    messages: messages.map((m) => m.toJSONView()),
    assistantMessage: messages.length
      ? messages[messages.length - 1].toJSONView()
      : await assistantForCurrent(draft),
  });
});

/**
 * POST /api/agent-builder/message
 * Answer the current (or an edited) step and return the next question.
 */
export const message = asyncHandler(async (req, res) => {
  const body = messageSchema.parse(req.body);
  const userId = req.user.id;
  const draft = await getOwnedDraft(body.draftId, userId);

  if (['creating', 'created'].includes(draft.status)) {
    throw new AppError('This agent has already been created.', 409, 'DRAFT_LOCKED');
  }

  // Which step are we answering? Either the current one, or an edited earlier one.
  const targetStep = body.stepKey ? STEP_BY_KEY.get(body.stepKey) : getStep(draft.currentStep);
  if (!targetStep) throw new AppError('Invalid step.', 400, 'INVALID_STEP');
  const isEditingPast = targetStep.step < draft.currentStep;

  // Resolve the raw answer + user echo depending on input type.
  let userEcho = '';
  let fieldUpdate = {};

  switch (targetStep.inputType) {
    case 'text': {
      const raw = (body.message || (Array.isArray(body.value) ? '' : body.value) || '').trim();
      if (!raw) throw new AppError('Please type an answer.', 422, 'EMPTY_ANSWER');
      const { extractedValue } = await extractAnswer({ stepKey: targetStep.stepKey, rawInput: raw, draft });
      fieldUpdate[targetStep.field] = extractedValue;
      userEcho = raw;
      break;
    }
    case 'textarea': {
      const raw = (body.message || '').trim();
      if (!raw) throw new AppError('Please describe your services.', 422, 'EMPTY_ANSWER');
      const { extractedValue } = await extractAnswer({ stepKey: 'services', rawInput: raw, draft });
      fieldUpdate.services = Array.isArray(extractedValue) ? extractedValue : normalizeServices(extractedValue);
      userEcho = raw;
      break;
    }
    case 'single': {
      const selected = Array.isArray(body.value) ? body.value[0] : body.value;
      let raw = selected;
      if (!raw || raw === '__custom__') raw = (body.message || '').trim();
      if (!raw) throw new AppError('Please choose or type an option.', 422, 'EMPTY_ANSWER');
      if (targetStep.field === 'languages') {
        fieldUpdate.languages = splitLanguages(raw);
      } else {
        fieldUpdate[targetStep.field] = raw;
      }
      userEcho = raw;
      break;
    }
    case 'multi': {
      let values = body.values || (Array.isArray(body.value) ? body.value : body.value ? [body.value] : []);
      values = values.map((v) => v.trim()).filter(Boolean);
      if (!values.length) throw new AppError('Please select at least one option.', 422, 'EMPTY_ANSWER');
      if (targetStep.maxSelections) values = values.slice(0, targetStep.maxSelections);
      fieldUpdate[targetStep.field] = values;
      userEcho = values.join(', ');
      break;
    }
    case 'greeting': {
      // The final greeting text (AI-generated + accepted, or user-written).
      const raw = (body.message || (Array.isArray(body.value) ? '' : body.value) || '').trim();
      if (!raw) throw new AppError('Please provide a greeting.', 422, 'EMPTY_ANSWER');
      fieldUpdate.firstMessage = raw;
      userEcho = raw;
      break;
    }
    case 'voice': {
      const voice = getVoiceById(body.voiceId || '');
      if (!voice) throw new AppError('Please select a supported voice.', 422, 'INVALID_VOICE');
      fieldUpdate.selectedVoiceProvider = voice.provider;
      fieldUpdate.selectedVoiceId = voice.voiceId;
      fieldUpdate.selectedVoiceName = voice.name;
      userEcho = `${voice.name} — ${voice.type}`;
      break;
    }
    default:
      throw new AppError('Unsupported step.', 400, 'UNSUPPORTED_STEP');
  }

  // Apply updates.
  Object.assign(draft, fieldUpdate);

  // Save the user echo message.
  const userMsg = await addMessage(draft, userId, 'user', userEcho, targetStep.stepKey);

  // Advance only when answering the current step in-sequence.
  let ackPrefix = '';
  if (!isEditingPast && targetStep.step === draft.currentStep) {
    const { assistantAck } = await extractAnswer({ stepKey: targetStep.stepKey, rawInput: userEcho, draft }).catch(
      () => ({ assistantAck: 'Got it.' })
    );
    ackPrefix = assistantAck || 'Got it.';
    draft.currentStep = Math.min(draft.currentStep + 1, TOTAL_STEPS + 1);
    // Skip any upcoming steps whose answer is already on the draft (e.g.
    // pre-filled from a Quick-start template), so we never re-ask them.
    while (draft.currentStep <= TOTAL_STEPS && isStepAnswered(draft, getStep(draft.currentStep))) {
      draft.currentStep = Math.min(draft.currentStep + 1, TOTAL_STEPS + 1);
    }
  } else {
    ackPrefix = `Updated your ${targetStep.title.toLowerCase()}.`;
  }

  await recomputeAndSave(draft);

  const assistant = isEditingPast
    ? { content: ackPrefix, stepKey: targetStep.stepKey, structuredData: { ui: reviewUi() } }
    : await assistantForCurrent(draft, draft.currentStep > TOTAL_STEPS ? '' : ackPrefix);

  // When we've just crossed into review, prepend the ack to the review message.
  if (!isEditingPast && draft.currentStep > TOTAL_STEPS && ackPrefix) {
    assistant.content = `${ackPrefix} ${REVIEW_MESSAGE}`;
  }

  const assistantMsg = await addMessage(
    draft,
    userId,
    'assistant',
    assistant.content,
    assistant.stepKey,
    assistant.structuredData
  );

  return ok(res, {
    draft: draft.toJSONView(),
    progress: draftProgress(draft),
    userMessage: userMsg.toJSONView(),
    assistantMessage: assistantMsg.toJSONView(),
    isComplete: draft.currentStep > TOTAL_STEPS,
  });
});

/** GET /api/agent-builder/drafts */
export const listDrafts = asyncHandler(async (req, res) => {
  const drafts = await AgentDraft.find({
    userId: req.user.id,
    workspaceId: req.workspaceId,
  }).sort({ updatedAt: -1 });
  return ok(res, { drafts: drafts.map((d) => d.toJSONView()) });
});

/** GET /api/agent-builder/drafts/:draftId */
export const getDraft = asyncHandler(async (req, res) => {
  const draft = await getOwnedDraft(req.params.draftId, req.user.id);
  const messages = await AgentBuilderMessage.find({ draftId: draft._id }).sort({ createdAt: 1 });
  return ok(res, {
    draft: draft.toJSONView(),
    progress: draftProgress(draft),
    messages: messages.map((m) => m.toJSONView()),
  });
});

/** PATCH /api/agent-builder/drafts/:draftId — direct field edits (review screen). */
export const patchDraft = asyncHandler(async (req, res) => {
  const draft = await getOwnedDraft(req.params.draftId, req.user.id);
  if (['creating', 'created'].includes(draft.status)) {
    throw new AppError('This agent has already been created.', 409, 'DRAFT_LOCKED');
  }
  const updates = patchDraftSchema.parse(req.body);

  if (updates.selectedVoiceId) {
    // Accept either an internal voice id or a raw Vapi voiceId.
    const voice = getVoiceById(updates.selectedVoiceId) ||
      SUPPORTED_VOICES.find((v) => v.voiceId === updates.selectedVoiceId);
    if (!voice) throw new AppError('Unsupported voice.', 422, 'UNSUPPORTED_VOICE');
    updates.selectedVoiceProvider = voice.provider;
    updates.selectedVoiceId = voice.voiceId;
    updates.selectedVoiceName = voice.name;
  }

  Object.assign(draft, updates);
  await recomputeAndSave(draft);
  return ok(res, { draft: draft.toJSONView(), progress: draftProgress(draft) }, 'Draft updated.');
});

/** DELETE /api/agent-builder/drafts/:draftId */
export const deleteDraft = asyncHandler(async (req, res) => {
  const draft = await getOwnedDraft(req.params.draftId, req.user.id);
  await AgentBuilderMessage.deleteMany({ draftId: draft._id });
  await draft.deleteOne();
  return ok(res, {}, 'Draft deleted.');
});

/** POST /api/agent-builder/drafts/:draftId/generate-greeting */
export const generateGreetingRoute = asyncHandler(async (req, res) => {
  const draft = await getOwnedDraft(req.params.draftId, req.user.id);
  generateGreetingSchema.parse(req.body || {});
  const firstMessage = await generateGreeting(draft);
  return ok(res, { firstMessage }, 'Greeting generated.');
});

/** POST /api/agent-builder/drafts/:draftId/generate-prompt */
export const generatePromptRoute = asyncHandler(async (req, res) => {
  const draft = await getOwnedDraft(req.params.draftId, req.user.id);
  const systemPrompt = await generateSystemPrompt(draft);
  draft.generatedSystemPrompt = systemPrompt;
  await draft.save();
  return ok(res, { generatedSystemPrompt: systemPrompt }, 'System prompt generated.');
});

/** POST /api/agent-builder/drafts/:draftId/review — finalize prompt + status. */
export const review = asyncHandler(async (req, res) => {
  const draft = await getOwnedDraft(req.params.draftId, req.user.id);
  if (!isReadyForReview(draft)) {
    throw new AppError('Some required details are still missing.', 422, 'INCOMPLETE_DRAFT');
  }
  if (!draft.generatedSystemPrompt) {
    draft.generatedSystemPrompt = await generateSystemPrompt(draft);
  }
  if (draft.status === 'draft' || draft.status === 'ready-for-review') {
    draft.status = 'ready-for-review';
  }
  await draft.save();
  return ok(res, { draft: draft.toJSONView(), progress: draftProgress(draft) }, 'Ready for review.');
});

/**
 * POST /api/agent-builder/drafts/:draftId/create-vapi-agent
 * Idempotent: creates the real Vapi assistant + local Agent exactly once.
 */
export const createVapiAgent = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // First, if an agent already exists for this draft, return it (idempotent).
  const existingAgent = await Agent.findOne({
    createdFromDraftId: req.params.draftId,
    workspaceId: req.workspaceId,
  });
  if (existingAgent) {
    return ok(res, { agent: existingAgent.toJSONView(), alreadyCreated: true }, 'Agent already created.');
  }

  // Enforce the allowance against the OWNER's plan (they pay) and the workspace's
  // agent count — agents are shared, so teammates draw from the same allowance.
  const account = await getAccount(req.ownerId);
  const plan = getPlan(account?.plan);
  const agentCount = await Agent.countDocuments({ workspaceId: req.workspaceId });
  if (agentCount >= plan.maxAgents) {
    throw new AppError(
      `Your ${plan.name} plan includes ${plan.maxAgents} agent${plan.maxAgents === 1 ? '' : 's'}. Upgrade to create more.`,
      403,
      'PLAN_AGENT_LIMIT'
    );
  }

  // Atomically claim the draft for creation (prevents duplicate submissions).
  const draft = await AgentDraft.findOneAndUpdate(
    { _id: req.params.draftId, userId, status: { $in: ['draft', 'ready-for-review', 'failed'] } },
    { $set: { status: 'creating', lastError: '' } },
    { new: true }
  );

  if (!draft) {
    // Either not owned/found, or already creating/created.
    const owned = await AgentDraft.findOne({ _id: req.params.draftId, userId });
    if (!owned) throw new AppError('Draft not found.', 404, 'DRAFT_NOT_FOUND');
    if (owned.status === 'creating') {
      throw new AppError('This agent is already being created.', 409, 'CREATION_IN_PROGRESS');
    }
    if (owned.agentId) {
      const agent = await Agent.findById(owned.agentId);
      if (agent) return ok(res, { agent: agent.toJSONView(), alreadyCreated: true }, 'Agent already created.');
    }
    throw new AppError('Draft cannot be created right now.', 409, 'INVALID_STATE');
  }

  try {
    if (!isReadyForReview(draft)) {
      throw new AppError('Some required details are missing.', 422, 'INCOMPLETE_DRAFT');
    }
    if (!draft.generatedSystemPrompt) {
      draft.generatedSystemPrompt = await generateSystemPrompt(draft);
    }

    const payload = buildAssistantPayload(draft);
    const assistant = await createAssistant(payload);

    const agent = await Agent.create({
      // Billing account = workspace owner; `createdByUserId` records the builder.
      userId: req.ownerId,
      workspaceId: req.workspaceId,
      createdByUserId: userId,
      name: draft.agentName,
      businessName: draft.businessName,
      businessType: draft.businessType,
      businessLocation: draft.businessLocation,
      purpose: draft.agentPurpose,
      services: draft.services,
      tone: draft.tone,
      languages: draft.languages,
      firstMessage: draft.firstMessage,
      systemPrompt: draft.generatedSystemPrompt,
      voiceProvider: draft.selectedVoiceProvider,
      voiceId: draft.selectedVoiceId,
      voiceName: draft.selectedVoiceName,
      escalationInstructions: draft.escalationInstructions,
      vapiAssistantId: assistant.id,
      status: 'active',
      createdFromDraftId: draft._id,
    });

    draft.status = 'created';
    draft.vapiAssistantId = assistant.id;
    draft.agentId = agent._id;
    await draft.save();

    return ok(res, { agent: agent.toJSONView() }, 'Voice agent created successfully.', 201);
  } catch (err) {
    // Keep the draft + all answers intact so the user can retry.
    draft.status = 'failed';
    draft.lastError = err?.message ? String(err.message).slice(0, 300) : 'Creation failed';
    await draft.save();
    throw err;
  }
});

/** GET /api/agent-builder/voices */
export const listVoices = asyncHandler(async (req, res) => {
  return ok(res, { voices: SUPPORTED_VOICES });
});

/** GET /api/agent-builder/flow — the question flow (for client rendering). */
export const getFlow = asyncHandler(async (req, res) => {
  return ok(res, { totalSteps: TOTAL_STEPS, steps: FLOW.map((s) => stepUi(s)) });
});
