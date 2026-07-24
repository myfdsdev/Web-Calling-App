import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listPlans,
  myBilling,
  setPlan,
  topUp,
  listTransactions,
} from '../controllers/billingController.js';

const router = Router();

router.use(requireAuth);

router.get('/plans', listPlans);
router.get('/me', myBilling);
router.get('/transactions', listTransactions);
router.post('/plan', setPlan);
router.post('/topup', topUp);

export default router;
