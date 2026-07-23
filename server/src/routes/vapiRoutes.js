import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { config, webhook } from '../controllers/vapiController.js';

const router = Router();

// Public config (browser-safe) requires auth; webhook is called by Vapi (no auth).
router.get('/config', requireAuth, config);
router.post('/webhook', webhook);

export default router;
