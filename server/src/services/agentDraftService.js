import { AgentDraft } from '../models/AgentDraft.js';
import { AgentBuilderMessage } from '../models/AgentBuilderMessage.js';
import { AppError } from '../utils/apiResponse.js';
import { computeCompletion, isReadyForReview, progressFor, pickVoiceForDraft } from './builderFlow.js';
import { SUPPORTED_VOICES } from '../config/voices.js';

/** Load a draft and assert it belongs to the given user. */
export async function getOwnedDraft(draftId, userId) {
  const draft = await AgentDraft.findById(draftId);
  if (!draft) throw new AppError('Draft not found.', 404, 'DRAFT_NOT_FOUND');
  if (draft.userId.toString() !== userId.toString()) {
    throw new AppError('You do not have access to this draft.', 403, 'FORBIDDEN');
  }
  return draft;
}

/** Persist a chat message tied to a draft. */
export async function addMessage(draft, userId, role, content, stepKey = '', structuredData = null) {
  return AgentBuilderMessage.create({
    draftId: draft._id,
    userId,
    role,
    content,
    stepKey,
    structuredData,
  });
}

/** Recompute completion + review-readiness and persist the draft. */
export async function recomputeAndSave(draft) {
  // The user never picks a voice during setup — choose the best fit for the
  // language/tone they've given so far. Re-evaluated until they reach review.
  const voice = pickVoiceForDraft(draft, SUPPORTED_VOICES);
  if (voice && draft.status === 'draft') {
    draft.selectedVoiceProvider = voice.provider;
    draft.selectedVoiceId = voice.voiceId;
    draft.selectedVoiceName = voice.name;
  }

  draft.completionPercentage = computeCompletion(draft);
  if (draft.status === 'draft' && isReadyForReview(draft)) {
    draft.status = 'ready-for-review';
  }
  await draft.save();
  return draft;
}

export function draftProgress(draft) {
  return progressFor(draft);
}
