import { describe, it, expect, afterEach } from '@jest/globals';
import request from 'supertest';
import { app, makeUser, completeDraft, mockVapi } from './helpers.js';

describe('Public agent page & customization', () => {
  let vapi;
  afterEach(() => {
    if (vapi) vapi.restore();
    vapi = null;
  });

  async function createAgent(user, id = 'asst_pub') {
    vapi = mockVapi({ createId: id });
    const { draftId } = await completeDraft(user);
    const res = await user.bearer(request(app).post(`/api/agent-builder/drafts/${draftId}/create-vapi-agent`));
    return res.body.data.agent;
  }

  it('assigns a public share id on creation', async () => {
    const user = await makeUser();
    const agent = await createAgent(user);
    expect(agent.publicId).toBeTruthy();
    expect(agent.publicId).toMatch(/^[a-z0-9]{10}$/);
    expect(agent.isPublic).toBe(false); // private by default
  });

  it('does NOT call Vapi when only appearance/publish fields change', async () => {
    const user = await makeUser();
    const agent = await createAgent(user, 'asst_appear');
    const before = vapi.calls.length;
    const res = await user
      .bearer(request(app).patch(`/api/agents/${agent.id}`))
      .send({ bio: 'Friendly spa receptionist', tagline: 'Always here to help', themeColor: '#16A36A', isPublic: true });
    expect(res.status).toBe(200);
    expect(res.body.data.agent.bio).toBe('Friendly spa receptionist');
    expect(res.body.data.agent.isPublic).toBe(true);
    expect(vapi.calls.length).toBe(before); // no Vapi PATCH for appearance-only changes
  });

  it('hides an unpublished agent from the public endpoint', async () => {
    const user = await makeUser();
    const agent = await createAgent(user, 'asst_hidden');
    const res = await request(app).get(`/api/public/agents/${agent.publicId}`); // no auth
    expect(res.status).toBe(404);
  });

  it('serves a published agent publicly without auth and hides private fields', async () => {
    const user = await makeUser();
    const agent = await createAgent(user, 'asst_shown');
    await user.bearer(request(app).patch(`/api/agents/${agent.id}`)).send({ isPublic: true, bio: 'Books property visits' });

    const res = await request(app).get(`/api/public/agents/${agent.publicId}`); // no auth token
    expect(res.status).toBe(200);
    expect(res.body.data.agent.name).toBe('Emma');
    expect(res.body.data.agent.bio).toBe('Books property visits');
    expect(res.body.data.agent.vapiAssistantId).toBe('asst_shown'); // needed for browser calling
    // Private fields must NOT leak publicly.
    expect(res.body.data.agent.systemPrompt).toBeUndefined();
    expect(res.body.data.agent.escalationInstructions).toBeUndefined();
    expect(res.body.data.agent.userId).toBeUndefined();
  });

  it('rejects an invalid theme color', async () => {
    const user = await makeUser();
    const agent = await createAgent(user, 'asst_color');
    const res = await user.bearer(request(app).patch(`/api/agents/${agent.id}`)).send({ themeColor: 'not-a-color' });
    expect(res.status).toBe(422);
  });

  it('returns 404 for an unknown public id', async () => {
    const res = await request(app).get('/api/public/agents/doesnotexist');
    expect(res.status).toBe(404);
  });

  it('captures a lead from a public chat and lists it for the owner', async () => {
    const user = await makeUser();
    const agent = await createAgent(user, 'asst_chatlead');
    await user.bearer(request(app).patch(`/api/agents/${agent.id}`)).send({ isPublic: true });

    const chat = await request(app) // no auth — a visitor
      .post(`/api/public/agents/${agent.publicId}/chat`)
      .send({
        sessionId: 'sess-1',
        messages: [{ role: 'user', content: 'Hi, my name is Raj and my email is raj@test.com' }],
      });
    expect(chat.status).toBe(200);
    expect(typeof chat.body.data.reply).toBe('string');

    const list = await user.bearer(request(app).get('/api/leads'));
    expect(list.status).toBe(200);
    expect(list.body.data.leads.length).toBe(1);
    const lead = list.body.data.leads[0];
    expect(lead.channel).toBe('chat');
    expect(lead.viaChat).toBe(true);
    expect(lead.name).toBe('Raj');
    expect(lead.email).toBe('raj@test.com');
  });

  it('generates a lead when a visitor starts a voice call', async () => {
    const user = await makeUser();
    const agent = await createAgent(user, 'asst_calllead');
    await user.bearer(request(app).patch(`/api/agents/${agent.id}`)).send({ isPublic: true });

    const res = await request(app)
      .post(`/api/public/agents/${agent.publicId}/call-lead`)
      .send({ sessionId: 'call-1' });
    expect(res.status).toBe(200);

    const list = await user.bearer(request(app).get('/api/leads').query({ channel: 'call' }));
    expect(list.body.data.leads.length).toBe(1);
    expect(list.body.data.leads[0].viaCall).toBe(true);
  });

  it('keeps one lead per chat session and never leaks other owners’ leads', async () => {
    const owner = await makeUser();
    const intruder = await makeUser();
    const agent = await createAgent(owner, 'asst_session');
    await owner.bearer(request(app).patch(`/api/agents/${agent.id}`)).send({ isPublic: true });

    const send = (content) =>
      request(app)
        .post(`/api/public/agents/${agent.publicId}/chat`)
        .send({ sessionId: 'same-session', messages: [{ role: 'user', content }] });
    await send('Hello there');
    await send('Any pricing info?');

    const ownerList = await owner.bearer(request(app).get('/api/leads'));
    expect(ownerList.body.data.leads.length).toBe(1); // upserted, not duplicated

    const intruderList = await intruder.bearer(request(app).get('/api/leads'));
    expect(intruderList.body.data.leads.length).toBe(0); // scoped to owner
  });
});
