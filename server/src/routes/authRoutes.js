import { Router } from 'express';
import {
  register,
  login,
  googleAuth,
  me,
  forgotPassword,
  checkResetToken,
  resetPassword,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', requireAuth, me);

// Password reset (all unauthenticated — the token IS the credential).
router.post('/forgot-password', forgotPassword);
router.get('/reset-password/:token', checkResetToken);
router.post('/reset-password', resetPassword);

export default router;
