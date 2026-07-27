import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { previewInvite, acceptInviteRoute } from '../controllers/inviteController.js';

const router = Router();

// Preview is intentionally unauthenticated so the landing page can show who
// invited you (and whether to sign in vs sign up) before you have a session.
router.get('/:token', previewInvite);

// Accepting requires being signed in as the invited email.
router.post('/:token/accept', requireAuth, acceptInviteRoute);

export default router;
