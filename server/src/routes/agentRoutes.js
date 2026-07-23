import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listAgents,
  summary,
  getAgent,
  updateAgent,
  deleteAgent,
} from '../controllers/agentController.js';

const router = Router();

router.use(requireAuth);

router.get('/summary', summary);
router.get('/', listAgents);
router.get('/:agentId', getAgent);
router.patch('/:agentId', updateAgent);
router.delete('/:agentId', deleteAgent);

export default router;
