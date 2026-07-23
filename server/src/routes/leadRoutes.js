import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listLeads, leadsSummary, getLead, updateLead, deleteLead } from '../controllers/leadController.js';

const router = Router();

router.use(requireAuth);

router.get('/summary', leadsSummary);
router.get('/', listLeads);
router.get('/:id', getLead);
router.patch('/:id', updateLead);
router.delete('/:id', deleteLead);

export default router;
