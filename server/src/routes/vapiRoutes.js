import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { withWorkspace } from '../middleware/workspace.js';
import { config, webhook } from '../controllers/vapiController.js';

const router = Router();

// Browser-safe config for the active workspace (BYOK-aware). Webhook is called
// by Vapi itself (no auth, no workspace header).
router.get('/config', requireAuth, withWorkspace, config);
router.post('/webhook', webhook);

export default router;
