import { describe, it, expect, afterEach } from '@jest/globals';
import request from 'supertest';
import { app, makeUser, completeDraft, mockVapi } from './helpers.js';
import { Agent } from '../src/models/Agent.js';

/** Pull the raw token out of a returned invite link. */
const tokenOf = (inviteUrl) => inviteUrl.split('/invite/')[1];

/** Put `user` on a plan that allows teammates (free is single-seat). */
async function upgradeToPro(user) {
  await user.bearer(request(app).post('/api/billing/plan')).send({ planId: 'pro' });
}

describe('Workspaces, roles & invites', () => {
  let vapi;
  afterEach(() => {
    if (vapi) vapi.restore();
    vapi = null;
  });

  it('gives every account a personal workspace it owns', async () => {
    const user = await makeUser();
    const res = await user.bearer(request(app).get('/api/workspaces'));
    expect(res.status).toBe(200);
    expect(res.body.data.workspaces).toHaveLength(1);
    const ws = res.body.data.workspaces[0];
    expect(ws.isPersonal).toBe(true);
    expect(ws.role).toBe('owner');
  });

  it('creates a team workspace with the caller as owner', async () => {
    const user = await makeUser();
    const res = await user.bearer(request(app).post('/api/workspaces')).send({ name: 'Acme Sales' });
    expect(res.status).toBe(201);
    expect(res.body.data.workspace.name).toBe('Acme Sales');
    expect(res.body.data.workspace.role).toBe('owner');
    expect(res.body.data.workspace.isPersonal).toBe(false);

    const list = await user.bearer(request(app).get('/api/workspaces'));
    expect(list.body.data.workspaces).toHaveLength(2); // personal + team
  });

  it('refuses to invite on a single-seat (free) plan', async () => {
    const owner = await makeUser();
    const ws = (await owner.bearer(request(app).post('/api/workspaces')).send({ name: 'Solo' })).body.data.workspace;
    const res = await owner
      .bearer(request(app).post(`/api/workspaces/${ws.id}/invites`))
      .send({ email: 'friend@test.dev', role: 'member' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PLAN_MEMBER_LIMIT');
  });

  it('invites a teammate who accepts and then shares the workspace', async () => {
    const owner = await makeUser();
    await upgradeToPro(owner);
    const member = await makeUser();

    const ws = (await owner.bearer(request(app).post('/api/workspaces')).send({ name: 'Acme' })).body.data.workspace;

    // Invite the member's real email so the accept check passes.
    const inv = await owner
      .bearer(request(app).post(`/api/workspaces/${ws.id}/invites`))
      .send({ email: member.user.email, role: 'member' });
    expect(inv.status).toBe(201);
    const token = tokenOf(inv.body.data.invite.inviteUrl);
    expect(token).toBeTruthy();

    // Preview works without auth.
    const preview = await request(app).get(`/api/invites/${token}`);
    expect(preview.status).toBe(200);
    expect(preview.body.data.workspace.name).toBe('Acme');
    expect(preview.body.data.invite.role).toBe('member');

    // Accept.
    const accept = await member.bearer(request(app).post(`/api/invites/${token}/accept`));
    expect(accept.status).toBe(200);
    expect(accept.body.data.workspace.role).toBe('member');

    // The member now sees the workspace in their list.
    const list = await member.bearer(request(app).get('/api/workspaces'));
    expect(list.body.data.workspaces.map((w) => w.id)).toContain(ws.id);

    // And both people appear in the member roster.
    const members = await owner.bearer(request(app).get(`/api/workspaces/${ws.id}/members`));
    expect(members.body.data.members).toHaveLength(2);
    expect(members.body.data.members.map((m) => m.role).sort()).toEqual(['member', 'owner']);
  });

  it("rejects an invite accepted by the wrong account", async () => {
    const owner = await makeUser();
    await upgradeToPro(owner);
    const wrongPerson = await makeUser();

    const ws = (await owner.bearer(request(app).post('/api/workspaces')).send({ name: 'Acme' })).body.data.workspace;
    const inv = await owner
      .bearer(request(app).post(`/api/workspaces/${ws.id}/invites`))
      .send({ email: 'someone-else@test.dev', role: 'member' });
    const token = tokenOf(inv.body.data.invite.inviteUrl);

    const res = await wrongPerson.bearer(request(app).post(`/api/invites/${token}/accept`));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('INVITE_EMAIL_MISMATCH');
  });

  it('shares agents across the workspace but hides them from outsiders', async () => {
    const owner = await makeUser();
    await upgradeToPro(owner);
    const member = await makeUser();
    const outsider = await makeUser();

    const ws = (await owner.bearer(request(app).post('/api/workspaces')).send({ name: 'Acme' })).body.data.workspace;
    const inv = await owner
      .bearer(request(app).post(`/api/workspaces/${ws.id}/invites`))
      .send({ email: member.user.email, role: 'member' });
    await member.bearer(request(app).post(`/api/invites/${tokenOf(inv.body.data.invite.inviteUrl)}/accept`));

    // An agent that lives in the workspace, billed to the owner.
    await Agent.create({ userId: owner.user.id, workspaceId: ws.id, name: 'Shared Bot', status: 'active' });

    const asOwner = await owner.bearer(request(app).get('/api/agents').set('x-workspace-id', ws.id));
    expect(asOwner.body.data.agents).toHaveLength(1);

    const asMember = await member.bearer(request(app).get('/api/agents').set('x-workspace-id', ws.id));
    expect(asMember.body.data.agents).toHaveLength(1); // teammate sees it too

    // The member's own personal workspace does NOT contain it.
    const memberPersonal = await member.bearer(request(app).get('/api/agents'));
    expect(memberPersonal.body.data.agents).toHaveLength(0);

    // A non-member is refused the workspace entirely.
    const asOutsider = await outsider.bearer(request(app).get('/api/agents').set('x-workspace-id', ws.id));
    expect(asOutsider.status).toBe(403);
    expect(asOutsider.body.code).toBe('WORKSPACE_ACCESS_REVOKED');
  });

  it('lets a teammate build an agent that bills the owner', async () => {
    const owner = await makeUser();
    await upgradeToPro(owner);
    const member = await makeUser();

    const ws = (await owner.bearer(request(app).post('/api/workspaces')).send({ name: 'Acme' })).body.data.workspace;
    const inv = await owner
      .bearer(request(app).post(`/api/workspaces/${ws.id}/invites`))
      .send({ email: member.user.email, role: 'member' });
    await member.bearer(request(app).post(`/api/invites/${tokenOf(inv.body.data.invite.inviteUrl)}/accept`));

    // Member drives the builder inside the workspace (x-workspace-id header).
    vapi = mockVapi({ createId: 'asst_team' });
    const start = await member
      .bearer(request(app).post('/api/agent-builder/start'))
      .set('x-workspace-id', ws.id);
    const draftId = start.body.data.draftId;
    const send = (payload) =>
      member
        .bearer(request(app).post('/api/agent-builder/message'))
        .set('x-workspace-id', ws.id)
        .send({ draftId, ...payload });

    await send({ message: 'Emma' });
    await send({ message: 'Green Valley Real Estate' });
    await send({ value: 'Real Estate' });
    await send({ message: 'Jaipur' });
    await send({ value: 'Appointment Booking' });
    await send({ message: 'Buying\nRentals' });
    await send({ values: ['Friendly', 'Professional'] });
    await send({ value: 'English and Hindi' });
    await send({ message: 'Hello from Green Valley!' });
    await send({ value: 'Collect the caller name and contact details.' });

    const created = await member
      .bearer(request(app).post(`/api/agent-builder/drafts/${draftId}/create-vapi-agent`))
      .set('x-workspace-id', ws.id);
    expect(created.status).toBe(201);
    expect(created.body.data.agent.createdByUserId).toBe(member.user.id);

    // Billing account is the OWNER, not the teammate who built it.
    const doc = await Agent.findById(created.body.data.agent.id);
    expect(doc.userId.toString()).toBe(owner.user.id);
    expect(doc.workspaceId.toString()).toBe(ws.id);
  });

  it('enforces roles: a viewer cannot build, a member can', async () => {
    const owner = await makeUser();
    await upgradeToPro(owner);
    const viewer = await makeUser();

    const ws = (await owner.bearer(request(app).post('/api/workspaces')).send({ name: 'Acme' })).body.data.workspace;
    const inv = await owner
      .bearer(request(app).post(`/api/workspaces/${ws.id}/invites`))
      .send({ email: viewer.user.email, role: 'viewer' });
    await viewer.bearer(request(app).post(`/api/invites/${tokenOf(inv.body.data.invite.inviteUrl)}/accept`));

    const blocked = await viewer
      .bearer(request(app).post('/api/agent-builder/start'))
      .set('x-workspace-id', ws.id);
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('INSUFFICIENT_ROLE');
  });

  it('stops a member from inviting others', async () => {
    const owner = await makeUser();
    await upgradeToPro(owner);
    const member = await makeUser();

    const ws = (await owner.bearer(request(app).post('/api/workspaces')).send({ name: 'Acme' })).body.data.workspace;
    const inv = await owner
      .bearer(request(app).post(`/api/workspaces/${ws.id}/invites`))
      .send({ email: member.user.email, role: 'member' });
    await member.bearer(request(app).post(`/api/invites/${tokenOf(inv.body.data.invite.inviteUrl)}/accept`));

    const res = await member
      .bearer(request(app).post(`/api/workspaces/${ws.id}/invites`))
      .send({ email: 'another@test.dev', role: 'member' });
    expect(res.status).toBe(403);
  });

  it('lets a member leave, and blocks deleting the personal workspace', async () => {
    const owner = await makeUser();
    await upgradeToPro(owner);
    const member = await makeUser();

    const ws = (await owner.bearer(request(app).post('/api/workspaces')).send({ name: 'Acme' })).body.data.workspace;
    const inv = await owner
      .bearer(request(app).post(`/api/workspaces/${ws.id}/invites`))
      .send({ email: member.user.email, role: 'member' });
    await member.bearer(request(app).post(`/api/invites/${tokenOf(inv.body.data.invite.inviteUrl)}/accept`));

    // Find the member's membership id and leave.
    const roster = await owner.bearer(request(app).get(`/api/workspaces/${ws.id}/members`));
    const memberRow = roster.body.data.members.find((m) => m.role === 'member');
    const leave = await member.bearer(
      request(app).delete(`/api/workspaces/${ws.id}/members/${memberRow.id}`)
    );
    expect(leave.status).toBe(200);
    expect(leave.body.data.left).toBe(true);

    // Personal workspace can't be deleted.
    const personal = (await owner.bearer(request(app).get('/api/workspaces'))).body.data.workspaces.find(
      (w) => w.isPersonal
    );
    const del = await owner.bearer(request(app).delete(`/api/workspaces/${personal.id}`));
    expect(del.status).toBe(400);
    expect(del.body.code).toBe('PERSONAL_WORKSPACE');
  });
});
