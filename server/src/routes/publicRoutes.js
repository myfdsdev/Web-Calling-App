import { Router } from 'express';
import { getPublicAgent, publicChat, publicCallLead } from '../controllers/agentController.js';

// Public, unauthenticated routes for shareable agent pages.
const router = Router();

router.get('/agents/:publicId', getPublicAgent);
router.post('/agents/:publicId/chat', publicChat);
router.post('/agents/:publicId/call-lead', publicCallLead);

export default router;
