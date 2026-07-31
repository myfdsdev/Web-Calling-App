import { Router } from 'express';
import {
  requirePlatformSecret,
  manifest,
  provision,
  suspend,
  reactivate,
} from '../controllers/platformController.js';

const router = Router();

// Discovery is PUBLIC — no secret, no side effects.
router.get('/manifest', manifest);

// Everything else is server-to-server and requires the shared secret.
router.post('/provision', requirePlatformSecret, provision);
router.post('/suspend', requirePlatformSecret, suspend);
router.post('/reactivate', requirePlatformSecret, reactivate);

export default router;
