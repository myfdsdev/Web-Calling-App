import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { withWorkspace, requirePermission } from '../middleware/workspace.js';
import {
  start,
  message,
  listDrafts,
  getDraft,
  patchDraft,
  deleteDraft,
  generateGreetingRoute,
  generatePromptRoute,
  review,
  createVapiAgent,
  listVoices,
  getFlow,
} from '../controllers/agentBuilderController.js';

const router = Router();

router.use(requireAuth, withWorkspace);

// Building an agent is a write action — viewers are read-only.
const canBuild = requirePermission('agents:write');

router.get('/voices', listVoices);
router.get('/flow', getFlow);

router.post('/start', canBuild, start);
router.post('/message', canBuild, message);

router.get('/drafts', listDrafts);
router.get('/drafts/:draftId', getDraft);
router.patch('/drafts/:draftId', canBuild, patchDraft);
router.delete('/drafts/:draftId', canBuild, deleteDraft);

router.post('/drafts/:draftId/generate-greeting', canBuild, generateGreetingRoute);
router.post('/drafts/:draftId/generate-prompt', canBuild, generatePromptRoute);
router.post('/drafts/:draftId/review', canBuild, review);
router.post('/drafts/:draftId/create-vapi-agent', canBuild, createVapiAgent);

export default router;
