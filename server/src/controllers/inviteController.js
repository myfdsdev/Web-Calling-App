import { User } from '../models/User.js';
import { ok, AppError } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loadInvite, acceptInvite } from '../services/workspaceService.js';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '../config/roles.js';

/**
 * GET /api/invites/:token  (NO AUTH)
 * Lets the invite landing page show who invited you and to what, before you
 * sign in. Only details the invitee was already sent are returned.
 */
export const previewInvite = asyncHandler(async (req, res) => {
  const { invite, workspace } = await loadInvite(req.params.token);

  // So the landing page can send them to sign-up vs sign-in.
  const hasAccount = Boolean(await User.exists({ email: invite.email }));

  return ok(res, {
    invite: {
      email: invite.email,
      role: invite.role,
      roleLabel: ROLE_LABELS[invite.role],
      roleDescription: ROLE_DESCRIPTIONS[invite.role],
      invitedByName: invite.invitedByName,
      expiresAt: invite.expiresAt,
    },
    workspace: { name: workspace.name, color: workspace.color || '#6C5CE7' },
    hasAccount,
  });
});

/** POST /api/invites/:token/accept — join the workspace as the signed-in user. */
export const acceptInviteRoute = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('Account not found.', 404, 'USER_NOT_FOUND');

  const { workspace, membership, alreadyMember } = await acceptInvite({
    token: req.params.token,
    user,
  });

  return ok(
    res,
    {
      workspace: workspace.toJSONView({ role: membership.role }),
      alreadyMember,
    },
    alreadyMember ? `You are already in ${workspace.name}.` : `Welcome to ${workspace.name}!`
  );
});
