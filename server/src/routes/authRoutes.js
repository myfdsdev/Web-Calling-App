import { Router } from 'express';
import {
  register,
  registerAdmin,
  login,
  googleAuth,
  me,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

// Both reset endpoints are rate limited: the first would otherwise be an email
// bomber, the second brute-forceable.
const forgotLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, key: (req) => `forgot:${req.ip}` });
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, key: (req) => `reset:${req.ip}` });

router.post('/register', register);
router.post('/register-admin', registerAdmin);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/forgot-password', forgotLimiter, forgotPassword);
router.post('/reset-password', resetLimiter, resetPassword);
router.get('/me', requireAuth, me);

export default router;
