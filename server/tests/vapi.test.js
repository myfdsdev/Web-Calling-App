import { describe, it, expect, afterEach } from '@jest/globals';
import request from 'supertest';
import { app, makeUser, completeDraft, mockVapi } from './helpers.js';

describe('Vapi integration (regression)', () => {
  let vapi;
  afterEach(() => {
    if (vapi) vapi.restore();
    vapi = null;
  });

  it('creates a Vapi assistant and persists the assistant id', async () => {
    vapi = mockVapi({ createId: 'asst_abc' });
    const user = await makeUser();
    const { draftId } = await completeDraft(user);

    const res = await user.bearer(
      request(app).post(`/api/agent-builder/drafts/${draftId}/create-vapi-agent`)
    );
    expect(res.status).toBe(201);
    expect(res.body.data.agent.vapiAssistantId).toBe('asst_abc');
    expect(res.body.data.agent.status).toBe('active');

    // The POST body sent to Vapi must map fields correctly.
    const createCall = vapi.calls.find((c) => c.method === 'POST' && c.url.endsWith('/assistant'));
    expect(createCall).toBeTruthy();
    expect(createCall.body.name).toBe('Emma');
    expect(createCall.body.firstMessage).toMatch(/Green Valley/);
    expect(createCall.body.voice.provider).toBe('vapi');
    expect(createCall.body.voice.voiceId).toBe('Naina'); // auto-picked for a Hindi-speaking agent
    expect(createCall.body.model.messages[0].role).toBe('system');
    expect(createCall.body.model.messages[0].content).toMatch(/Emma/);
    expect(createCall.body.server.url).toMatch(/\/api\/vapi\/webhook$/);
  });

  it('prevents duplicate assistants when creation is triggered twice', async () => {
    vapi = mockVapi({ createId: 'asst_once' });
    const user = await makeUser();
    const { draftId } = await completeDraft(user);

    const first = await user.bearer(request(app).post(`/api/agent-builder/drafts/${draftId}/create-vapi-agent`));
    const second = await user.bearer(request(app).post(`/api/agent-builder/drafts/${draftId}/create-vapi-agent`));

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.data.alreadyCreated).toBe(true);
    expect(second.body.data.agent.id).toBe(first.body.data.agent.id);

    const createCalls = vapi.calls.filter((c) => c.method === 'POST' && c.url.endsWith('/assistant'));
    expect(createCalls).toHaveLength(1); // only ONE real assistant created
  });

  it('keeps the draft and answers intact when Vapi creation fails', async () => {
    vapi = mockVapi({ failCreate: true });
    const user = await makeUser();
    const { draftId } = await completeDraft(user);

    const res = await user.bearer(request(app).post(`/api/agent-builder/drafts/${draftId}/create-vapi-agent`));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);

    const draftRes = await user.bearer(request(app).get(`/api/agent-builder/drafts/${draftId}`));
    expect(draftRes.body.data.draft.status).toBe('failed');
    expect(draftRes.body.data.draft.agentName).toBe('Emma'); // answers preserved
  });

  it('updates the existing assistant and preserves the assistant id', async () => {
    vapi = mockVapi({ createId: 'asst_keep' });
    const user = await makeUser();
    const { draftId } = await completeDraft(user);
    const created = await user.bearer(request(app).post(`/api/agent-builder/drafts/${draftId}/create-vapi-agent`));
    const agentId = created.body.data.agent.id;

    const res = await user
      .bearer(request(app).patch(`/api/agents/${agentId}`))
      .send({ name: 'Emma Updated', purpose: 'Customer Support' });

    expect(res.status).toBe(200);
    expect(res.body.data.agent.name).toBe('Emma Updated');
    expect(res.body.data.agent.vapiAssistantId).toBe('asst_keep'); // unchanged

    const patchCall = vapi.calls.find((c) => c.method === 'PATCH' && c.url.includes('/assistant/asst_keep'));
    expect(patchCall).toBeTruthy();
    expect(patchCall.body.name).toBe('Emma Updated');
  });

  it('deletes the assistant and removes the local agent', async () => {
    vapi = mockVapi({ createId: 'asst_del' });
    const user = await makeUser();
    const { draftId } = await completeDraft(user);
    const created = await user.bearer(request(app).post(`/api/agent-builder/drafts/${draftId}/create-vapi-agent`));
    const agentId = created.body.data.agent.id;

    const del = await user.bearer(request(app).delete(`/api/agents/${agentId}`));
    expect(del.status).toBe(200);
    expect(vapi.calls.some((c) => c.method === 'DELETE' && c.url.includes('/assistant/asst_del'))).toBe(true);

    const get = await user.bearer(request(app).get(`/api/agents/${agentId}`));
    expect(get.status).toBe(404);
  });

  it('records call stats from an end-of-call webhook', async () => {
    vapi = mockVapi({ createId: 'asst_hook' });
    const user = await makeUser();
    const { draftId } = await completeDraft(user);
    await user.bearer(request(app).post(`/api/agent-builder/drafts/${draftId}/create-vapi-agent`));

    const res = await request(app)
      .post('/api/vapi/webhook')
      .send({ message: { type: 'end-of-call-report', call: { assistantId: 'asst_hook' }, durationSeconds: 42 } });
    expect(res.status).toBe(200);

    const summary = await user.bearer(request(app).get('/api/agents/summary'));
    expect(summary.body.data.callsToday).toBe(1);
    expect(summary.body.data.totalCallMinutes).toBe(1);
  });

  it('returns browser-safe vapi config without the private key', async () => {
    const user = await makeUser();
    const res = await user.bearer(request(app).get('/api/vapi/config'));
    expect(res.status).toBe(200);
    expect(res.body.data.publicKey).toBe('test-vapi-public-key');
    expect(JSON.stringify(res.body)).not.toContain('test-vapi-private-key');
  });
});
