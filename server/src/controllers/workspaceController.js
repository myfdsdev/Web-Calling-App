import { Workspace } from '../models/Workspace.js';
import { WorkspaceMember } from '../models/WorkspaceMember.js';
import { WorkspaceInvite } from '../models/WorkspaceInvite.js';
import { User } from '../models/User.js';
import { Agent } from '../models/Agent.js';
import { Lead } from '../models/Lead.js';
import { AgentDraft } from '../models/AgentDraft.js';
import { AgentBuilderMessage } from '../models/AgentBuilderMessage.js';
import { ok, AppError } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteSchema,
  updateMemberSchema,
} from '../validators/workspaceValidator.js';
import {
  listWorkspacesFor,
  createWorkspace as createWorkspaceRecord,
  countSeats,
  countMembers,
  assertOutranks,
  createInvite,
  inviteUrlFor,
} from '../services/workspaceService.js';
import { permissionsFor, ROLE_CATALOGUE, ROLE_RANK } from '../config/roles.js';
import { getPlan } from '../config/plans.js';
import { deleteAssistant } from '../services/vapiAssistantService.js';
import { resolveVapiConfig, deleteWorkspaceKeys } from '../services/apiKeyService.js';

/** Everything the client needs to render one workspace and gate its UI. */
async function workspaceView(workspace, role) {
  const [owner, seats] = await Promise.all([
    User.findById(workspace.ownerId),
    countSeats(workspace._id),
  ]);
  const plan = getPlan(owner?.plan);
  return workspace.toJSONView({
    role,
    permissions: permissionsFor(role),
    memberCount: seats.members,
    pendingInvites: seats.pending,
    seats: { used: seats.used, max: plan.maxMembers },
    plan: { id: plan.id, name: plan.name, maxMembers: plan.maxMembers },
    owner: owner ? { id: owner._id.toString(), name: owner.name, email: owner.email } : null,
  });
}

/** GET /api/workspaces — every workspace the caller belongs to. */
export const listWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await listWorkspacesFor(req.user.id);
  return ok(res, { workspaces, roles: ROLE_CATALOGUE });
});

/** POST /api/workspaces — start a new team workspace (caller becomes owner). */
export const createWorkspace = asyncHandler(async (req, res) => {
  const { name, color } = createWorkspaceSchema.parse(req.body);
  const workspace = await createWorkspaceRecord(req.user.id, { name, color });
  return ok(res, { workspace: await workspaceView(workspace, 'owner') }, 'Workspace created.', 201);
});

/** GET /api/workspaces/:workspaceId */
export const getWorkspace = asyncHandler(async (req, res) => {
  return ok(res, { workspace: await workspaceView(req.workspace, req.role) });
});

/** PATCH /api/workspaces/:workspaceId — rename / recolor. */
export const updateWorkspace = asyncHandler(async (req, res) => {
  const updates = updateWorkspaceSchema.parse(req.body);
  Object.assign(req.workspace, updates);
  await req.workspace.save();
  return ok(res, { workspace: await workspaceView(req.workspace, req.role) }, 'Workspace updated.');
});

/**
 * DELETE /api/workspaces/:workspaceId
 * Owner only, and never the personal workspace. Cascades: the workspace's Vapi
 * assistants are removed first (best effort) so nothing keeps billing upstream.
 */
export const deleteWorkspace = asyncHandler(async (req, res) => {
  const workspace = req.workspace;
  if (workspace.isPersonal) {
    throw new AppError('Your personal workspace cannot be deleted.', 400, 'PERSONAL_WORKSPACE');
  }

  const agents = await Agent.find({ workspaceId: workspace._id });
  const vapiConfig = await resolveVapiConfig(workspace._id);
  if (vapiConfig.privateKey) {
    for (const agent of agents) {
      if (!agent.vapiAssistantId) continue;
      try {
        await deleteAssistant(agent.vapiAssistantId, vapiConfig);
      } catch {
        // Already gone upstream, or a transient failure — local cleanup continues.
      }
    }
  }

  const drafts = await AgentDraft.find({ workspaceId: workspace._id }).select('_id');
  await Promise.all([
    Agent.deleteMany({ workspaceId: workspace._id }),
    Lead.deleteMany({ workspaceId: workspace._id }),
    AgentDraft.deleteMany({ workspaceId: workspace._id }),
    AgentBuilderMessage.deleteMany({ draftId: { $in: drafts.map((d) => d._id) } }),
    WorkspaceMember.deleteMany({ workspaceId: workspace._id }),
    WorkspaceInvite.deleteMany({ workspaceId: workspace._id }),
    deleteWorkspaceKeys(workspace._id),
  ]);
  await workspace.deleteOne();

  return ok(res, { deletedAgents: agents.length }, 'Workspace deleted.');
});

/** GET /api/workspaces/:workspaceId/members */
export const listMembers = asyncHandler(async (req, res) => {
  const members = await WorkspaceMember.find({ workspaceId: req.workspace._id }).populate(
    'userId',
    'name email avatarUrl'
  );

  const rows = members
    .map((m) => ({
      ...m.toJSONView(m.userId),
      isYou: m.userId?._id?.toString() === req.user.id,
    }))
    .sort((a, b) => {
      const rank = (ROLE_RANK[b.role] ?? 0) - (ROLE_RANK[a.role] ?? 0);
      return rank !== 0 ? rank : (a.name || a.email).localeCompare(b.name || b.email);
    });

  return ok(res, { members: rows, roles: ROLE_CATALOGUE, yourRole: req.role });
});

/** PATCH /api/workspaces/:workspaceId/members/:memberId — change someone's role. */
export const updateMember = asyncHandler(async (req, res) => {
  const { role } = updateMemberSchema.parse(req.body);

  const member = await WorkspaceMember.findOne({
    _id: req.params.memberId,
    workspaceId: req.workspace._id,
  }).populate('userId', 'name email avatarUrl');
  if (!member) throw new AppError('Member not found.', 404, 'MEMBER_NOT_FOUND');

  if (member.role === 'owner') {
    throw new AppError("The owner's role cannot be changed.", 400, 'CANNOT_CHANGE_OWNER');
  }
  assertOutranks(req.role, member.role, 'change this member’s role');
  assertOutranks(req.role, role, 'assign that role');

  member.role = role;
  await member.save();

  return ok(res, { member: member.toJSONView(member.userId) }, 'Role updated.');
});

/**
 * DELETE /api/workspaces/:workspaceId/members/:memberId
 * Doubles as "leave workspace" when you pass your own membership id.
 */
export const removeMember = asyncHandler(async (req, res) => {
  const member = await WorkspaceMember.findOne({
    _id: req.params.memberId,
    workspaceId: req.workspace._id,
  });
  if (!member) throw new AppError('Member not found.', 404, 'MEMBER_NOT_FOUND');

  const isSelf = member.userId.toString() === req.user.id;

  if (member.role === 'owner') {
    throw new AppError(
      'The workspace owner cannot be removed. Delete the workspace instead.',
      400,
      'CANNOT_REMOVE_OWNER'
    );
  }
  if (!isSelf) assertOutranks(req.role, member.role, 'remove this member');

  await member.deleteOne();
  return ok(res, { left: isSelf }, isSelf ? 'You left the workspace.' : 'Member removed.');
});

/** GET /api/workspaces/:workspaceId/invites — still-open invitations. */
export const listInvites = asyncHandler(async (req, res) => {
  const invites = await WorkspaceInvite.find({
    workspaceId: req.workspace._id,
    status: 'pending',
  }).sort({ createdAt: -1 });

  return ok(res, {
    invites: invites.map((i) => i.toJSONView(i.isUsable() ? inviteUrlFor(i.token) : '')),
  });
});

/**
 * POST /api/workspaces/:workspaceId/invites
 * Returns a shareable link. No mail provider is configured yet, so the inviter
 * passes the link on themselves — see WorkspaceInvite for the tradeoff.
 */
export const inviteMember = asyncHandler(async (req, res) => {
  const { email, role } = inviteSchema.parse(req.body);
  assertOutranks(req.role, role, 'invite someone with that role');

  const inviter = await User.findById(req.user.id);
  const { invite, resent } = await createInvite({
    workspace: req.workspace,
    inviter,
    email,
    role,
  });

  return ok(
    res,
    { invite: invite.toJSONView(inviteUrlFor(invite.token)), emailSent: false },
    resent ? 'Invitation refreshed — share the new link.' : 'Invitation ready — share the link.',
    resent ? 200 : 201
  );
});

/** DELETE /api/workspaces/:workspaceId/invites/:inviteId */
export const revokeInvite = asyncHandler(async (req, res) => {
  const invite = await WorkspaceInvite.findOne({
    _id: req.params.inviteId,
    workspaceId: req.workspace._id,
  });
  if (!invite) throw new AppError('Invitation not found.', 404, 'INVITE_NOT_FOUND');
  if (invite.status !== 'pending') {
    throw new AppError('That invitation is no longer pending.', 409, 'INVITE_NOT_PENDING');
  }

  invite.status = 'revoked';
  await invite.save();
  return ok(res, {}, 'Invitation revoked.');
});

/** GET /api/workspaces/:workspaceId/overview — header counts for the team page. */
export const workspaceOverview = asyncHandler(async (req, res) => {
  const [members, agents] = await Promise.all([
    countMembers(req.workspace._id),
    Agent.countDocuments({ workspaceId: req.workspace._id }),
  ]);
  return ok(res, { members, agents });
});
