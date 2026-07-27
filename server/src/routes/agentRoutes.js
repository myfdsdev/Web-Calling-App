import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { withWorkspace, requirePermission } from '../middleware/workspace.js';
import {
  listAgents,
  summary,
  getAgent,
  updateAgent,
  deleteAgent,
} from '../controllers/agentController.js';

const router = Router();

router.use(requireAuth, withWorkspace);

router.get('/summary', summary);
router.get('/', listAgents);
router.get('/:agentId', getAgent);
router.patch('/:agentId', requirePermission('agents:write'), updateAgent);
router.delete('/:agentId', requirePermission('agents:write'), deleteAgent);

export default router;
