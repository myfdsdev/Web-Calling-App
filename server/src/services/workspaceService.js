import mongoose from 'mongoose';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import {
  WorkspaceInvite,
  generateInviteToken,
  inviteExpiry,
} from '../models/WorkspaceInvite.js';
import { User } from '../models/User.js';
import { Agent } from '../models/Agent.js';
import { Lead } from '../models/Lead.js';
import { AgentDraft } from '../models/AgentDraft.js';
import { AppError } from '../utils/apiResponse.js';
import { ROLE_RANK, permissionsFor } from '../config/roles.js';
import { getPlan } from '../config/plans.js';
import { env } from '../config/env.js';

/** Docs created before workspaces existed carry no workspaceId. */
const LEGACY_SCOPE = { $or: [{ workspaceId: null }, { workspaceId: { $exists: false } }] };

/**
 * Adopt everything a user created before workspaces existed into their personal
 * workspace. Idempotent — after the first pass there is nothing left to match.
 */
export async function backfillLegacyData(userId, workspaceId) {
  const scope = { userId, ...LEGACY_SCOPE };
  const [agents, leads, drafts] = await Promise.all([
    Agent.updateMany(scope, { $set: { workspaceId } }),
    Lead.updateMany(scope, { $set: { workspaceId } }),
    AgentDraft.updateMany(scope, { $set: { workspaceId } }),
  ]);
  return {
    agents: agents.modifiedCount || 0,
    leads: leads.modifiedCount || 0,
    drafts: drafts.modifiedCount || 0,
  };
}

export function personalWorkspaceName(user) {
  const first = String(user?.name || '').trim().split(/\s+/)[0];
  return first ? `${first}'s Workspace` : 'My Workspace';
}

/**
 * The workspace every account always has. Created on demand so accounts that
 * predate this feature get one (and their existing data) on their next request.
 */
export async function ensurePersonalWorkspace(userOrId) {
  const userId = userOrId?._id || userOrId;
  if (!userId) return null;

  const existing = await Workspace.findOne({ ownerId: userId, isPersonal: true });
  if (existing) return existing;

  const user = userOrId?.name ? userOrId : await User.findById(userId);
  if (!user) return null;

  let workspace;
  try {
    workspace = await Workspace.create({
      name: personalWorkspaceName(user),
      ownerId: user._id,
      isPersonal: true,
    });
  } catch (err) {
    // Lost a race against a concurrent request — the other one created it.
    if (err?.code === 11000) return Workspace.findOne({ ownerId: userId, isPersonal: true });
    throw err;
  }

  await WorkspaceMember.updateOne(
    { workspaceId: workspace._id, userId: user._id },
    { $setOnInsert: { role: 'owner', joinedAt: new Date() } },
    { upsert: true }
  );
  await backfillLegacyData(user._id, workspace._id);
  return workspace;
}

export function membershipFor(workspaceId, userId) {
  return WorkspaceMember.findOne({ workspaceId, userId });
}

export function countMembers(workspaceId) {
  return WorkspaceMember.countDocuments({ workspaceId });
}

/** Members + still-open invites — what a plan's seat allowance is measured against. */
export async function countSeats(workspaceId) {
  const [members, pending] = await Promise.all([
    countMembers(workspaceId),
    WorkspaceInvite.countDocuments({
      workspaceId,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    }),
  ]);
  return { members, pending, used: members + pending };
}

/** Every workspace the user belongs to, personal one first. */
export async function listWorkspacesFor(userId) {
  await ensurePersonalWorkspace(userId);

  const memberships = await WorkspaceMember.find({ userId });
  const byWorkspace = new Map(memberships.map((m) => [m.workspaceId.toString(), m]));
  const ids = memberships.map((m) => m.workspaceId);

  const [workspaces, counts] = await Promise.all([
    Workspace.find({ _id: { $in: ids } }),
    WorkspaceMember.aggregate([
      { $match: { workspaceId: { $in: ids } } },
      { $group: { _id: '$workspaceId', n: { $sum: 1 } } },
    ]),
  ]);
  const countByWorkspace = new Map(counts.map((c) => [c._id.toString(), c.n]));

  return workspaces
    .map((w) => {
      const key = w._id.toString();
      const role = byWorkspace.get(key)?.role || 'viewer';
      return w.toJSONView({
        role,
        permissions: permissionsFor(role),
        memberCount: countByWorkspace.get(key) || 1,
      });
    })
    .sort((a, b) => {
      if (a.isPersonal !== b.isPersonal) return a.isPersonal ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

/**
 * Resolve the workspace a request should act on: the one it asked for (after a
 * membership check), or the caller's personal workspace when it named none.
 */
export async function resolveWorkspace(userId, requestedId) {
  if (requestedId) {
    if (!mongoose.Types.ObjectId.isValid(requestedId)) {
      throw new AppError('Workspace not found.', 404, 'WORKSPACE_NOT_FOUND');
    }
    const workspace = await Workspace.findById(requestedId);
    if (!workspace) throw new AppError('Workspace not found.', 404, 'WORKSPACE_NOT_FOUND');

    const membership = await membershipFor(workspace._id, userId);
    if (!membership) {
      throw new AppError(
        'You no longer have access to this workspace.',
        403,
        'WORKSPACE_ACCESS_REVOKED'
      );
    }
    return { workspace, membership };
  }

  const workspace = await ensurePersonalWorkspace(userId);
  if (!workspace) throw new AppError('Workspace not found.', 404, 'WORKSPACE_NOT_FOUND');
  const membership = await membershipFor(workspace._id, userId);
  return { workspace, membership };
}

/** Create a new (non-personal) workspace with the caller as its owner. */
export async function createWorkspace(userId, { name, color }) {
  const workspace = await Workspace.create({
    name,
    ownerId: userId,
    isPersonal: false,
    ...(color ? { color } : {}),
  });
  await WorkspaceMember.create({
    workspaceId: workspace._id,
    userId,
    role: 'owner',
    joinedAt: new Date(),
  });
  return workspace;
}

/**
 * You may only act on someone of strictly lower rank than yourself — so admins
 * cannot demote or remove each other, and nobody can touch the owner.
 */
export function assertOutranks(actorRole, targetRole, action = 'manage this member') {
  if ((ROLE_RANK[actorRole] ?? -1) <= (ROLE_RANK[targetRole] ?? -1)) {
    throw new AppError(`You do not have permission to ${action}.`, 403, 'INSUFFICIENT_ROLE');
  }
}

export function inviteUrlFor(token) {
  return `${env.appUrl}/invite/${token}`;
}

/** Seat allowance comes from the OWNER's plan — they are the billing account. */
async function assertSeatAvailable(workspace) {
  const owner = await User.findById(workspace.ownerId);
  const plan = getPlan(owner?.plan);
  const { used } = await countSeats(workspace._id);
  if (used >= plan.maxMembers) {
    throw new AppError(
      plan.maxMembers <= 1
        ? `The ${plan.name} plan is single-user. Upgrade to invite teammates.`
        : `The ${plan.name} plan covers ${plan.maxMembers} people. Upgrade to add more.`,
      403,
      'PLAN_MEMBER_LIMIT'
    );
  }
  return plan;
}

/**
 * Invite someone by email. Re-inviting an address that already has a pending
 * invite refreshes it (new token + expiry) instead of piling up duplicates.
 */
export async function createInvite({ workspace, inviter, email, role }) {
  const normalized = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalized });
  if (existingUser) {
    const already = await membershipFor(workspace._id, existingUser._id);
    if (already) {
      throw new AppError('That person is already in this workspace.', 409, 'ALREADY_A_MEMBER');
    }
  }

  const pending = await WorkspaceInvite.findOne({
    workspaceId: workspace._id,
    email: normalized,
    status: 'pending',
  });

  // Only charge a seat for a genuinely new invite — refreshing one is free.
  if (!pending) await assertSeatAvailable(workspace);

  const invite = pending || new WorkspaceInvite({ workspaceId: workspace._id, email: normalized });
  invite.role = role;
  invite.token = generateInviteToken();
  invite.expiresAt = inviteExpiry();
  invite.status = 'pending';
  invite.invitedBy = inviter._id;
  invite.invitedByName = inviter.name || '';
  await invite.save();

  return { invite, resent: Boolean(pending) };
}

/** Look up an invite by its link token, with the workspace + inviter resolved. */
export async function loadInvite(token) {
  const invite = await WorkspaceInvite.findOne({ token: String(token || '') });
  if (!invite) throw new AppError('This invitation link is not valid.', 404, 'INVITE_NOT_FOUND');

  if (invite.status === 'revoked') {
    throw new AppError('This invitation has been revoked.', 410, 'INVITE_REVOKED');
  }
  if (invite.status === 'accepted') {
    throw new AppError('This invitation has already been used.', 410, 'INVITE_USED');
  }
  if (invite.expiresAt <= new Date()) {
    throw new AppError('This invitation has expired. Ask for a new one.', 410, 'INVITE_EXPIRED');
  }

  const workspace = await Workspace.findById(invite.workspaceId);
  if (!workspace) {
    throw new AppError('That workspace no longer exists.', 404, 'WORKSPACE_NOT_FOUND');
  }
  return { invite, workspace };
}

/**
 * Join a workspace with an invite token. The signed-in account must match the
 * address the invite was sent to, so a forwarded link can't be used by someone else.
 */
export async function acceptInvite({ token, user }) {
  const { invite, workspace } = await loadInvite(token);

  if (user.email.toLowerCase() !== invite.email) {
    throw new AppError(
      `This invitation was sent to ${invite.email}. Sign in with that account to accept it.`,
      403,
      'INVITE_EMAIL_MISMATCH'
    );
  }

  const existing = await membershipFor(workspace._id, user._id);
  if (existing) {
    invite.status = 'accepted';
    invite.acceptedBy = user._id;
    invite.acceptedAt = new Date();
    await invite.save();
    return { workspace, membership: existing, alreadyMember: true };
  }

  // The plan may have been downgraded since the invite went out.
  await assertSeatAvailable(workspace);

  const membership = await WorkspaceMember.create({
    workspaceId: workspace._id,
    userId: user._id,
    role: invite.role,
    invitedBy: invite.invitedBy,
    joinedAt: new Date(),
  });

  invite.status = 'accepted';
  invite.acceptedBy = user._id;
  invite.acceptedAt = new Date();
  await invite.save();

  return { workspace, membership, alreadyMember: false };
}
