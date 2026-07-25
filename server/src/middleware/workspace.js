import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/apiResponse.js';
import { can } from '../config/roles.js';
import { resolveWorkspace } from '../services/workspaceService.js';

/**
 * Everything downstream scopes its data by `req.workspaceId` and bills
 * `req.ownerId`. `req.user.id` stays "who is acting", never "whose data is this".
 */
function attach(req, workspace, membership) {
  req.workspace = workspace;
  req.membership = membership;
  req.workspaceId = workspace._id;
  req.role = membership?.role || 'viewer';
  // Plan and credits live on the workspace owner — members spend the owner's balance.
  req.ownerId = workspace.ownerId;
}

/**
 * Resolve the active workspace from the `x-workspace-id` header. With no header
 * the caller gets their personal workspace, so clients that predate this feature
 * (and the public endpoints' own callers) keep working unchanged.
 */
export const withWorkspace = asyncHandler(async (req, res, next) => {
  const requested = req.headers['x-workspace-id'] || req.query.workspaceId || '';
  const { workspace, membership } = await resolveWorkspace(req.user.id, requested);
  attach(req, workspace, membership);
  return next();
});

/** Same, but for routes that name the workspace in the path. */
export const withWorkspaceParam = asyncHandler(async (req, res, next) => {
  const { workspace, membership } = await resolveWorkspace(req.user.id, req.params.workspaceId);
  attach(req, workspace, membership);
  return next();
});

/** Gate a route on a single permission from the role matrix. */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!can(req.role, permission)) {
      return next(
        new AppError(
          'Your role in this workspace does not allow that.',
          403,
          'INSUFFICIENT_ROLE'
        )
      );
    }
    return next();
  };
}
