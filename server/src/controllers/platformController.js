import { ok, AppError } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { safeEqual } from '../utils/security.js';
import { env, platformBridgeEnabled } from '../config/env.js';
import {
  provisionAccount,
  suspendWorkspace,
  reactivateWorkspace,
} from '../services/platformService.js';

/**
 * Guard the server-to-server bridge with the shared secret.
 *
 * FAILS CLOSED — no secret configured means every call is rejected. The
 * alternative would let anyone who finds the URL mint free accounts or suspend
 * paying customers. The compare is length-safe + constant-time; `a === b` leaks
 * length and prefix through timing.
 */
export function requirePlatformSecret(req, res, next) {
  const configured = env.platformSecret;
  const provided = req.get('x-platform-secret') ?? '';
  if (!configured || !safeEqual(provided, configured)) {
    return next(new AppError('Not authorized.', 401, 'PLATFORM_UNAUTHORIZED'));
  }
  return next();
}

/**
 * GET /api/v1/platform/manifest — PUBLIC discovery.
 *
 * The store is handed only a base URL and fetches this to learn the rest. The
 * shape is identical across every app in the suite so one store-side reader works
 * for all of them. Contains no secrets and grants nothing. `ready` is false when
 * PLATFORM_SECRET is unset — it surfaces the commonest setup mistake up front.
 */
export const manifest = asyncHandler(async (req, res) => {
  const base = env.backendUrl.replace(/\/$/, '');
  const platformBase = `${base}/api/v1/platform`;
  return res.json({
    appId: env.appId,
    name: env.appName,
    apiVersion: 'v1',
    workspaceSystem: '1.0',
    auth: { type: 'shared-secret', header: 'x-platform-secret' },
    endpoints: {
      provision: `${platformBase}/provision`,
      suspend: `${platformBase}/suspend`,
      reactivate: `${platformBase}/reactivate`,
    },
    defaults: { method: 'password', generatesPassword: true, sendsWelcomeEmail: true },
    loginUrl: `${env.appUrl}/login`,
    ready: platformBridgeEnabled(),
  });
});

/**
 * POST /api/v1/platform/provision — on purchase.
 * The store sends { ownerName, ownerEmail }; everything else is automatic.
 */
export const provision = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const result = await provisionAccount({
    ownerName: body.ownerName,
    ownerEmail: body.ownerEmail,
    temporaryPassword: body.temporaryPassword,
    // Default ON — opt out only with an explicit `false`.
    sendWelcomeEmail: body.sendWelcomeEmail,
    workspaceId: body.workspaceId,
  });
  return ok(res, result, 'Account provisioned.');
});

/** POST /api/v1/platform/suspend — on refund. */
export const suspend = asyncHandler(async (req, res) => {
  const workspaceId = (req.body || {}).workspaceId;
  if (!workspaceId) throw new AppError('workspaceId is required.', 400, 'WORKSPACE_ID_REQUIRED');
  const result = await suspendWorkspace(workspaceId);
  return ok(res, result, 'Workspace suspended.');
});

/** POST /api/v1/platform/reactivate — on reversal. */
export const reactivate = asyncHandler(async (req, res) => {
  const workspaceId = (req.body || {}).workspaceId;
  if (!workspaceId) throw new AppError('workspaceId is required.', 400, 'WORKSPACE_ID_REQUIRED');
  const result = await reactivateWorkspace(workspaceId);
  return ok(res, result, 'Workspace reactivated.');
});
