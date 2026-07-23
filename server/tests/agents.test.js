import { describe, it, expect, afterEach } from '@jest/globals';
import request from 'supertest';
import { app, makeUser, completeDraft, mockVapi } from './helpers.js';

describe('Agents listing & ownership', () => {
  let vapi;
  afterEach(() => {
    if (vapi) vapi.restore();
    vapi = null;
  });

  async function createAgent(user, id = 'asst_x') {
    vapi = mockVapi({ createId: id });
    const { draftId } = await completeDraft(user);
    const res = await user.bearer(request(app).post(`/api/agent-builder/drafts/${draftId}/create-vapi-agent`));
    return res.body.data.agent;
  }

  it('lists only the owner\'s agents', async () => {
    const a = await makeUser();
    const b = await makeUser();
    await createAgent(a, 'asst_a');
    vapi.restore();
    await createAgent(b, 'asst_b');

    const listA = await a.bearer(request(app).get('/api/agents'));
    expect(listA.body.data.agents).toHaveLength(1);
    expect(listA.body.data.agents[0].vapiAssistantId).toBe('asst_a');
  });

  it('filters by search term', async () => {
    const user = await makeUser();
    await createAgent(user, 'asst_s');
    const res = await user.bearer(request(app).get('/api/agents').query({ search: 'Green Valley' }));
    expect(res.body.data.agents).toHaveLength(1);
    const none = await user.bearer(request(app).get('/api/agents').query({ search: 'zzz-nope' }));
    expect(none.body.data.agents).toHaveLength(0);
  });

  it('disables an agent via status toggle without touching Vapi', async () => {
    const user = await makeUser();
    const agent = await createAgent(user, 'asst_t');
    const before = vapi.calls.length;
    const res = await user.bearer(request(app).patch(`/api/agents/${agent.id}`)).send({ status: 'disabled' });
    expect(res.status).toBe(200);
    expect(res.body.data.agent.status).toBe('disabled');
    expect(vapi.calls.length).toBe(before); // no Vapi call for a status-only change
  });

  it('blocks a non-owner from updating an agent', async () => {
    const owner = await makeUser();
    const intruder = await makeUser();
    const agent = await createAgent(owner, 'asst_o');
    const res = await intruder.bearer(request(app).patch(`/api/agents/${agent.id}`)).send({ name: 'Hacked' });
    expect(res.status).toBe(403);
  });

  it('returns dashboard summary counts', async () => {
    const user = await makeUser();
    await createAgent(user, 'asst_sum');
    const res = await user.bearer(request(app).get('/api/agents/summary'));
    expect(res.body.data.totalAgents).toBe(1);
    expect(res.body.data.activeAgents).toBe(1);
    expect(res.body.data.recentAgents).toHaveLength(1);
  });
});
