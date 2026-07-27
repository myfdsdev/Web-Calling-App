import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { withWorkspace, requirePermission } from '../middleware/workspace.js';
import { listLeads, leadsSummary, getLead, updateLead, deleteLead } from '../controllers/leadController.js';

const router = Router();

router.use(requireAuth, withWorkspace);

router.get('/summary', leadsSummary);
router.get('/', listLeads);
router.get('/:id', getLead);
router.patch('/:id', requirePermission('leads:write'), updateLead);
router.delete('/:id', requirePermission('leads:write'), deleteLead);

export default router;
