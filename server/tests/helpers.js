import request from 'supertest';
import { createApp } from '../src/app.js';

export const app = createApp();

let counter = 0;

/** Register a fresh user and return { token, user, auth(req) }. */
export async function makeUser() {
  counter += 1;
  const email = `user${counter}.${Math.floor(process.hrtime()[1] % 100000)}@test.dev`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: `User ${counter}`, email, password: 'password123' });
  const { token, user } = res.body.data;
  return {
    token,
    user,
    /** Attach the bearer token to a supertest request. */
    bearer: (req) => req.set('Authorization', `Bearer ${token}`),
  };
}

/** Install a fake global.fetch that emulates the Vapi REST API. */
export function mockVapi({ createId = 'vapi_assistant_123', failCreate = false } = {}) {
  const calls = [];
  const original = global.fetch;
  global.fetch = async (url, options = {}) => {
    calls.push({ url, method: options.method, body: options.body ? JSON.parse(options.body) : null });
    const method = options.method || 'GET';

    if (failCreate && method === 'POST' && url.endsWith('/assistant')) {
      return {
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: 'Voice provider rejected the request.' }),
      };
    }
    if (method === 'POST' && url.endsWith('/assistant')) {
      return { ok: true, status: 201, text: async () => JSON.stringify({ id: createId }) };
    }
    if (method === 'PATCH' && url.includes('/assistant/')) {
      return { ok: true, status: 200, text: async () => JSON.stringify({ id: createId, updated: true }) };
    }
    if (method === 'DELETE' && url.includes('/assistant/')) {
      return { ok: true, status: 200, text: async () => JSON.stringify({ id: createId, deleted: true }) };
    }
    return { ok: true, status: 200, text: async () => '{}' };
  };
  return {
    calls,
    restore() {
      global.fetch = original;
    },
  };
}

/** Drive a draft through the full 10-step flow. Returns the final draft body. */
export async function completeDraft(user) {
  const startRes = await user.bearer(request(app).post('/api/agent-builder/start'));
  const draftId = startRes.body.data.draftId;

  const send = (payload) =>
    user.bearer(request(app).post('/api/agent-builder/message')).send({ draftId, ...payload });

  await send({ message: 'Emma' }); // 1 name
  await send({ message: 'Green Valley Real Estate' }); // 2 business
  await send({ value: 'Real Estate' }); // 3 type
  await send({ value: 'Appointment Booking' }); // 4 purpose
  await send({ message: 'Property buying\nRentals\nSite visits' }); // 5 services
  await send({ values: ['Friendly', 'Professional'] }); // 6 tone
  await send({ value: 'English and Hindi' }); // 7 language
  await send({ message: 'Hello, thanks for calling Green Valley Real Estate. This is Emma.' }); // 8 greeting
  await send({ value: 'Collect the caller name and contact details so the team can follow up.' }); // 9 escalation
  const last = await send({ voiceId: 'ava' }); // 10 voice

  return { draftId, body: last.body };
}
