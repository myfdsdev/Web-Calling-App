import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
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

router.use(requireAuth);

router.get('/voices', listVoices);
router.get('/flow', getFlow);

router.post('/start', start);
router.post('/message', message);

router.get('/drafts', listDrafts);
router.get('/drafts/:draftId', getDraft);
router.patch('/drafts/:draftId', patchDraft);
router.delete('/drafts/:draftId', deleteDraft);

router.post('/drafts/:draftId/generate-greeting', generateGreetingRoute);
router.post('/drafts/:draftId/generate-prompt', generatePromptRoute);
router.post('/drafts/:draftId/review', review);
router.post('/drafts/:draftId/create-vapi-agent', createVapiAgent);

export default router;
