import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { ensurePersonalWorkspace } from './workspaceService.js';
import { sendEmail } from './email/emailClient.js';
import { welcomeCredentials } from './email/templates.js';
import { generatePassword } from '../utils/security.js';
import { AppError } from '../utils/apiResponse.js';
import { env } from '../config/env.js';

const MIN_SUPPLIED_PW = 6;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function loginUrl() {
  return `${env.appUrl}/login`;
}

/** Load a workspace by id for a store call. Bad/missing id → 404 (never a 200). */
async function loadWorkspaceOr404(rawId) {
  const id = String(rawId || '');
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Workspace not found.', 404, 'WORKSPACE_NOT_FOUND');
  }
  const workspace = await Workspace.findById(id);
  if (!workspace) throw new AppError('Workspace not found.', 404, 'WORKSPACE_NOT_FOUND');
  return workspace;
}

/**
 * Provision (or re-provision) a paying customer. One call yields a LIVE owner
 * account — workspace + user + owner membership — that signs in immediately with
 * email + password. Never a pending join link.
 *
 * Idempotent three ways, because payment webhooks retry:
 *   1. a supplied workspaceId that exists → reactivate and reuse it
 *   2. no workspaceId but a known ownerEmail → reuse that owner's workspace
 *   3. neither → create the user and their workspace
 *
 * Re-provisioning an existing owner resets their password — that is the built-in
 * "resend my login" with no extra endpoint.
 */
export async function provisionAccount({
  ownerName,
  ownerEmail,
  temporaryPassword,
  sendWelcomeEmail,
  workspaceId,
} = {}) {
  const email = String(ownerEmail || '').toLowerCase().trim();
  if (!EMAIL_RE.test(email)) {
    throw new AppError('A valid ownerEmail is required.', 422, 'INVALID_OWNER_EMAIL');
  }

  // Generate the password when the store can't supply one. Returned ONCE below;
  // only its bcrypt hash is stored, so it can never be read back.
  const supplied = String(temporaryPassword || '');
  const password = supplied.length >= MIN_SUPPLIED_PW ? supplied : generatePassword(16);
  const fallbackName = email.split('@')[0];
  const name = String(ownerName || '').trim() || fallbackName;

  let workspace = null;
  let owner = null;

  if (workspaceId) {
    workspace = await loadWorkspaceOr404(workspaceId);
    owner = await User.findById(workspace.ownerId);
    if (!owner) throw new AppError('Workspace owner not found.', 404, 'OWNER_NOT_FOUND');
  } else {
    owner = await User.findOne({ email }).select('+passwordHash');
    if (!owner) owner = new User({ name, email });
  }

  const isNewOwner = owner.isNew;
  await owner.setPassword(password);
  // An existing owner's prior sessions must die when their password is reset.
  if (!isNewOwner) owner.tokenVersion = (owner.tokenVersion || 0) + 1;
  if (!owner.name) owner.name = name;
  await owner.save();

  if (!workspace) workspace = await ensurePersonalWorkspace(owner);

  // Guarantee the owner membership exists (ensurePersonalWorkspace does this for a
  // freshly created personal workspace; this covers the supplied-workspaceId path).
  await WorkspaceMember.updateOne(
    { workspaceId: workspace._id, userId: owner._id },
    { $setOnInsert: { role: 'owner', joinedAt: new Date() } },
    { upsert: true }
  );

  workspace.status = 'active'; // a retry after a suspend reactivates
  if (!workspace.provisionedVia) workspace.provisionedVia = 'store';
  await workspace.save();

  // A mail failure must NOT fail provisioning — the account exists and is paid
  // for. Return emailed:false and let the store deliver the password as fallback.
  let emailed = false;
  if (sendWelcomeEmail !== false) {
    const { subject, html, text } = welcomeCredentials({
      name: owner.name,
      email: owner.email,
      temporaryPassword: password,
      loginUrl: loginUrl(),
    });
    const result = await sendEmail({ to: owner.email, subject, html, text });
    emailed = result.sent;
  }

  return {
    workspaceId: workspace._id.toString(),
    method: 'password',
    loginUrl: loginUrl(),
    temporaryPassword: password,
    emailed,
  };
}

/** Freeze a workspace (refund). Unknown/missing id → 404, never a cheerful 200. */
export async function suspendWorkspace(workspaceId) {
  const workspace = await loadWorkspaceOr404(workspaceId);
  workspace.status = 'suspended';
  await workspace.save();
  return { workspaceId: workspace._id.toString(), status: workspace.status };
}

/** Restore a frozen workspace (reversal). */
export async function reactivateWorkspace(workspaceId) {
  const workspace = await loadWorkspaceOr404(workspaceId);
  workspace.status = 'active';
  await workspace.save();
  return { workspaceId: workspace._id.toString(), status: workspace.status };
}
