import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from './helpers.js';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Workspace } from '../src/models/Workspace.js';

const SECRET = 'test-platform-secret-value';

/** Attach the shared secret header. */
const signed = (req) => req.set('x-platform-secret', SECRET);

let counter = 0;
const freshEmail = () => `buyer${(counter += 1)}.${process.hrtime()[1] % 100000}@store.dev`;

describe('Store bridge', () => {
  beforeAll(() => {
    env.platformSecret = SECRET;
  });
  afterAll(() => {
    env.platformSecret = '';
  });

  it('exposes a public manifest but rejects unsigned bridge calls', async () => {
    const manifest = await request(app).get('/api/v1/platform/manifest');
    expect(manifest.status).toBe(200);
    expect(manifest.body.appId).toBe(env.appId);
    expect(manifest.body.endpoints.provision).toContain('/api/v1/platform/provision');
    expect(manifest.body.ready).toBe(true); // secret is configured in this suite

    // No secret → 401 on every side-effectful endpoint.
    const noSecret = await request(app)
      .post('/api/v1/platform/provision')
      .send({ ownerEmail: freshEmail() });
    expect(noSecret.status).toBe(401);
    expect(noSecret.body.code).toBe('PLATFORM_UNAUTHORIZED');

    const wrongSecret = await request(app)
      .post('/api/v1/platform/suspend')
      .set('x-platform-secret', 'nope')
      .send({ workspaceId: 'x' });
    expect(wrongSecret.status).toBe(401);
  });

  it('provisions a live owner account from just an email, and that password logs in', async () => {
    const email = freshEmail();
    const res = await signed(request(app).post('/api/v1/platform/provision')).send({
      ownerName: 'Jane Buyer',
      ownerEmail: email,
    });
    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.workspaceId).toBeTruthy();
    expect(data.method).toBe('password');
    expect(data.temporaryPassword).toBeTruthy();
    expect(data.loginUrl).toContain('/login');

    // The workspace has a real, populated owner (never a pending join link).
    const ws = await Workspace.findById(data.workspaceId);
    expect(ws).toBeTruthy();
    expect(ws.ownerId).toBeTruthy();
    expect(ws.status).toBe('active');

    // The returned password actually logs in.
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password: data.temporaryPassword });
    expect(login.status).toBe(200);
    expect(login.body.data.user.email).toBe(email);
  });

  it('is idempotent by email — two calls with no workspaceId reuse one workspace', async () => {
    const email = freshEmail();
    const first = await signed(request(app).post('/api/v1/platform/provision')).send({ ownerEmail: email });
    const second = await signed(request(app).post('/api/v1/platform/provision')).send({ ownerEmail: email });

    expect(first.body.data.workspaceId).toBe(second.body.data.workspaceId);

    const owner = await User.findOne({ email });
    const owned = await Workspace.countDocuments({ ownerId: owner._id });
    expect(owned).toBe(1); // not a second workspace per retry
  });

  it('attempts the welcome email by default and can be turned off', async () => {
    // Point the email client at a mocked Resend so we can observe the send.
    const originalEmail = { ...env.email };
    const originalFetch = global.fetch;
    const sends = [];
    env.email = { provider: 'resend', resendApiKey: 'test-key', from: 'Vox <no-reply@test.dev>', replyTo: '' };
    global.fetch = async (url, options = {}) => {
      if (String(url).includes('api.resend.com')) {
        sends.push(JSON.parse(options.body));
        return { ok: true, status: 200, json: async () => ({ id: 'email_test_1' }) };
      }
      return { ok: true, status: 200, json: async () => ({}), text: async () => '{}' };
    };

    try {
      const on = await signed(request(app).post('/api/v1/platform/provision')).send({
        ownerEmail: freshEmail(),
      });
      expect(on.body.data.emailed).toBe(true);
      expect(sends.length).toBe(1);

      const off = await signed(request(app).post('/api/v1/platform/provision')).send({
        ownerEmail: freshEmail(),
        sendWelcomeEmail: false,
      });
      expect(off.body.data.emailed).toBe(false);
      expect(sends.length).toBe(1); // no additional send
    } finally {
      env.email = originalEmail;
      global.fetch = originalFetch;
    }
  });

  it('suspending an unknown or missing workspaceId is never a cheerful 200', async () => {
    const missing = await signed(request(app).post('/api/v1/platform/suspend')).send({});
    expect(missing.status).toBe(400);

    const unknown = await signed(request(app).post('/api/v1/platform/suspend')).send({
      workspaceId: '507f1f77bcf86cd799439011', // valid ObjectId, no such doc
    });
    expect(unknown.status).toBe(404);

    const garbage = await signed(request(app).post('/api/v1/platform/suspend')).send({
      workspaceId: 'not-an-id',
    });
    expect(garbage.status).toBe(404);
  });

  it('suspend blocks tenant access; reactivate restores it', async () => {
    const email = freshEmail();
    const prov = await signed(request(app).post('/api/v1/platform/provision')).send({ ownerEmail: email });
    const { workspaceId, temporaryPassword } = prov.body.data;

    const login = await request(app).post('/api/auth/login').send({ email, password: temporaryPassword });
    const token = login.body.data.token;
    const asOwner = (req) => req.set('Authorization', `Bearer ${token}`).set('x-workspace-id', workspaceId);

    // Active → tenant route works.
    expect((await asOwner(request(app).get('/api/agents'))).status).toBe(200);

    // Suspend → blocked everywhere with WORKSPACE_INACTIVE.
    const suspend = await signed(request(app).post('/api/v1/platform/suspend')).send({ workspaceId });
    expect(suspend.status).toBe(200);
    expect(suspend.body.data.status).toBe('suspended');
    const blocked = await asOwner(request(app).get('/api/agents'));
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('WORKSPACE_INACTIVE');

    // Reactivate → restored.
    const react = await signed(request(app).post('/api/v1/platform/reactivate')).send({ workspaceId });
    expect(react.status).toBe(200);
    expect(react.body.data.status).toBe('active');
    expect((await asOwner(request(app).get('/api/agents'))).status).toBe(200);
  });
});
