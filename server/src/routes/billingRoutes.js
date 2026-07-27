import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { withWorkspace, requirePermission } from '../middleware/workspace.js';
import {
  listPlans,
  myBilling,
  setPlan,
  topUp,
  listTransactions,
} from '../controllers/billingController.js';

const router = Router();

router.use(requireAuth, withWorkspace);

router.get('/plans', listPlans);
router.get('/me', myBilling);
router.get('/transactions', requirePermission('billing:read'), listTransactions);
// Only the workspace owner (billing:manage) can spend money / change the plan.
router.post('/plan', requirePermission('billing:manage'), setPlan);
router.post('/topup', requirePermission('billing:manage'), topUp);

export default router;
