import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { withWorkspaceParam, requirePermission } from '../middleware/workspace.js';
import {
  listWorkspaces,
  createWorkspace,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  workspaceOverview,
  listMembers,
  updateMember,
  removeMember,
  listInvites,
  inviteMember,
  revokeInvite,
} from '../controllers/workspaceController.js';

const router = Router();

router.use(requireAuth);

// Collection level — no active workspace needed.
router.get('/', listWorkspaces);
router.post('/', createWorkspace);

// Everything below resolves + authorizes the workspace named in the path.
router.get('/:workspaceId', withWorkspaceParam, requirePermission('workspace:read'), getWorkspace);
router.patch('/:workspaceId', withWorkspaceParam, requirePermission('workspace:update'), updateWorkspace);
router.delete('/:workspaceId', withWorkspaceParam, requirePermission('workspace:delete'), deleteWorkspace);

router.get('/:workspaceId/overview', withWorkspaceParam, requirePermission('workspace:read'), workspaceOverview);

router.get('/:workspaceId/members', withWorkspaceParam, requirePermission('members:read'), listMembers);
router.patch(
  '/:workspaceId/members/:memberId',
  withWorkspaceParam,
  requirePermission('members:manage'),
  updateMember
);
// No permission gate: a member may always remove *themselves* (leave). Removing
// anyone else is authorized inside the controller by role rank.
router.delete('/:workspaceId/members/:memberId', withWorkspaceParam, removeMember);

router.get('/:workspaceId/invites', withWorkspaceParam, requirePermission('members:read'), listInvites);
router.post('/:workspaceId/invites', withWorkspaceParam, requirePermission('members:invite'), inviteMember);
router.delete(
  '/:workspaceId/invites/:inviteId',
  withWorkspaceParam,
  requirePermission('members:invite'),
  revokeInvite
);

export default router;
