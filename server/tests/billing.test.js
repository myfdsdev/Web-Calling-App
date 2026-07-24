import { describe, it, expect, afterEach } from '@jest/globals';
import request from 'supertest';
import { app, makeUser, completeDraft, mockVapi } from './helpers.js';
import { User } from '../src/models/User.js';

describe('Plans, credits & billing', () => {
  let vapi;
  afterEach(() => {
    if (vapi) vapi.restore();
    vapi = null;
  });

  /** Create + publish an agent so the public chat endpoint can be exercised. */
  async function publishedAgent(user, id = 'asst_bill') {
    vapi = mockVapi({ createId: id });
    const { draftId } = await completeDraft(user);
    const created = await user.bearer(
      request(app).post(`/api/agent-builder/drafts/${draftId}/create-vapi-agent`)
    );
    const agent = created.body.data.agent;
    await user.bearer(request(app).patch(`/api/agents/${agent.id}`)).send({ isPublic: true });
    return agent;
  }

  const billing = (user) => user.bearer(request(app).get('/api/billing/me'));

  it('exposes the plan catalogue and credit rates', async () => {
    const user = await makeUser();
    const res = await user.bearer(request(app).get('/api/billing/plans'));
    expect(res.status).toBe(200);
    expect(res.body.data.plans.map((p) => p.id)).toEqual(['free', 'starter', 'pro', 'business']);
    expect(res.body.data.rates.voiceCreditsPerMinute).toBe(10);
    expect(res.body.data.rates.chatCreditsPerMessage).toBe(1);
  });

  it('starts new accounts on the free plan with its credit allowance', async () => {
    const user = await makeUser();
    const res = await billing(user);
    expect(res.status).toBe(200);
    expect(res.body.data.plan.id).toBe('free');
    expect(res.body.data.credits.total).toBe(100);
    expect(res.body.data.limits.agents.max).toBe(1);
  });

  it('charges one credit per chat reply', async () => {
    const user = await makeUser();
    const agent = await publishedAgent(user, 'asst_chatcost');

    const before = (await billing(user)).body.data.credits.total;
    const chat = await request(app)
      .post(`/api/public/agents/${agent.publicId}/chat`)
      .send({ sessionId: 'c1', messages: [{ role: 'user', content: 'hi there' }] });
    expect(chat.status).toBe(200);
    expect(chat.body.data.unavailable).toBeUndefined();

    const after = (await billing(user)).body.data.credits.total;
    expect(after).toBe(before - 1);
  });

  it('stops replying when out of credits, but still captures the lead', async () => {
    const user = await makeUser();
    const agent = await publishedAgent(user, 'asst_nocredit');
    await User.findByIdAndUpdate(user.user.id, { $set: { credits: 0, bonusCredits: 0 } });

    const chat = await request(app)
      .post(`/api/public/agents/${agent.publicId}/chat`)
      .send({ sessionId: 'c2', messages: [{ role: 'user', content: 'are you there?' }] });
    expect(chat.status).toBe(200);
    expect(chat.body.data.unavailable).toBe(true);

    const leads = await user.bearer(request(app).get('/api/leads'));
    expect(leads.body.data.leads.length).toBe(1); // lead still captured
  });

  it('hides web calling on the public page when the owner cannot afford a minute', async () => {
    const user = await makeUser();
    const agent = await publishedAgent(user, 'asst_calloff');

    const okRes = await request(app).get(`/api/public/agents/${agent.publicId}`);
    expect(okRes.body.data.callsEnabled).toBe(true);

    await User.findByIdAndUpdate(user.user.id, { $set: { credits: 5, bonusCredits: 0 } }); // < 10
    const offRes = await request(app).get(`/api/public/agents/${agent.publicId}`);
    expect(offRes.body.data.callsEnabled).toBe(false);
  });

  it('switching plans grants the new allowance immediately', async () => {
    const user = await makeUser();
    const res = await user.bearer(request(app).post('/api/billing/plan')).send({ planId: 'pro' });
    expect(res.status).toBe(200);

    const me = await billing(user);
    expect(me.body.data.plan.id).toBe('pro');
    expect(me.body.data.credits.total).toBe(1800);
    expect(me.body.data.limits.agents.max).toBe(10);
  });

  it('adds purchased top-up credits on top of the monthly allowance', async () => {
    const user = await makeUser();
    const res = await user.bearer(request(app).post('/api/billing/topup')).send({ packId: 'pack_250' });
    expect(res.status).toBe(200);

    const me = await billing(user);
    expect(me.body.data.credits.bonus).toBe(250);
    expect(me.body.data.credits.total).toBe(350); // 100 monthly + 250 purchased
  });

  it('rejects an unknown plan', async () => {
    const user = await makeUser();
    const res = await user.bearer(request(app).post('/api/billing/plan')).send({ planId: 'enterprise-x' });
    expect(res.status).toBe(422);
  });

  it('blocks creating more agents than the plan allows', async () => {
    const user = await makeUser(); // free → 1 agent
    vapi = mockVapi({ createId: 'asst_first' });

    const first = await completeDraft(user);
    const r1 = await user.bearer(
      request(app).post(`/api/agent-builder/drafts/${first.draftId}/create-vapi-agent`)
    );
    expect(r1.status).toBe(201);

    const second = await completeDraft(user);
    const r2 = await user.bearer(
      request(app).post(`/api/agent-builder/drafts/${second.draftId}/create-vapi-agent`)
    );
    expect(r2.status).toBe(403);
    expect(r2.body.code).toBe('PLAN_AGENT_LIMIT');
  });

  it('records a ledger entry for every credit movement', async () => {
    const user = await makeUser();
    await user.bearer(request(app).post('/api/billing/topup')).send({ packId: 'pack_250' });

    const res = await user.bearer(request(app).get('/api/billing/transactions'));
    expect(res.status).toBe(200);
    const types = res.body.data.transactions.map((t) => t.type);
    expect(types).toContain('topup');
  });
});
