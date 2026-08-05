import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { app, makeUser } from './helpers.js';
import { PasswordResetToken, resetExpiry } from '../src/models/PasswordResetToken.js';
import { sha256Hex } from '../src/utils/security.js';
import { env } from '../src/config/env.js';

/** Pull the raw reset token out of the dev-only link the endpoint returns when no
 *  mail provider is configured (EMAIL_PROVIDER defaults to 'none' in tests). */
function tokenFromDevLink(body) {
  const link = body?.data?.devLink || '';
  const m = link.match(/[?&]token=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

async function requestReset(email) {
  return request(app).post('/api/auth/forgot-password').send({ email });
}

describe('Password reset', () => {
  it('returns an identical status AND message for known and unknown addresses', async () => {
    const user = await makeUser();

    const known = await requestReset(user.user.email);
    const unknown = await requestReset('nobody-here@test.dev');

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body.message).toBe(unknown.body.message);
    expect(known.body.success).toBe(true);
    expect(unknown.body.success).toBe(true);
  });

  it('stores a 64-char SHA-256 digest, never the raw token', async () => {
    const user = await makeUser();
    const res = await requestReset(user.user.email);
    const raw = tokenFromDevLink(res.body);
    expect(raw.length).toBeGreaterThan(20);

    const record = await PasswordResetToken.findOne({ userId: user.user.id });
    expect(record).toBeTruthy();
    expect(record.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(record.tokenHash).not.toBe(raw);
    expect(record.tokenHash).toBe(sha256Hex(raw));
  });

  it('sends the reset email through configured Resend without returning a dev link', async () => {
    const originalEmail = { ...env.email };
    const originalFetch = global.fetch;
    let sentPayload = null;

    env.email = {
      provider: 'resend',
      resendApiKey: 'test-key',
      from: 'ringwebai <no-reply@test.dev>',
      replyTo: '',
    };
    global.fetch = async (url, options) => {
      expect(String(url)).toContain('api.resend.com');
      sentPayload = JSON.parse(options.body);
      return { ok: true, status: 200, json: async () => ({ id: 'email_test_reset' }) };
    };

    try {
      const user = await makeUser();
      const res = await requestReset(user.user.email);

      expect(res.status).toBe(200);
      expect(res.body.data.devLink).toBeUndefined();
      expect(sentPayload.to).toEqual([user.user.email]);
      expect(sentPayload.subject).toMatch(/reset/i);
      expect(sentPayload.html).toContain('/reset-password?token=');
    } finally {
      env.email = originalEmail;
      global.fetch = originalFetch;
    }
  });

  it('does not return a dev link when a configured email provider fails', async () => {
    const originalEmail = { ...env.email };
    const originalFetch = global.fetch;

    env.email = {
      provider: 'resend',
      resendApiKey: 'test-key',
      from: 'ringwebai <no-reply@test.dev>',
      replyTo: '',
    };
    global.fetch = async () => ({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Domain is not verified' }),
    });

    try {
      const user = await makeUser();
      const res = await requestReset(user.user.email);

      expect(res.status).toBe(200);
      expect(res.body.data.devLink).toBeUndefined();
    } finally {
      env.email = originalEmail;
      global.fetch = originalFetch;
    }
  });

  it('resets the password, then rejects the spent token on reuse', async () => {
    const user = await makeUser();
    const raw = tokenFromDevLink((await requestReset(user.user.email)).body);

    const first = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: raw, password: 'brand-new-pass' });
    expect(first.status).toBe(200);

    // New password works…
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.user.email, password: 'brand-new-pass' });
    expect(login.status).toBe(200);

    // …and the same token can't be used again.
    const reuse = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: raw, password: 'another-pass' });
    expect(reuse.status).toBe(400);
    expect(reuse.body.code).toBe('INVALID_RESET_TOKEN');
  });

  it('rejects an expired token', async () => {
    const user = await makeUser();
    const raw = 'expired-raw-token-abcdef123456';
    await PasswordResetToken.create({
      userId: user.user.id,
      tokenHash: sha256Hex(raw),
      expiresAt: new Date(Date.now() - 1000), // already in the past
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: raw, password: 'whatever-strong' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_RESET_TOKEN');
  });

  it('invalidates a previous link when a new one is requested', async () => {
    const user = await makeUser();
    const first = tokenFromDevLink((await requestReset(user.user.email)).body);
    const second = tokenFromDevLink((await requestReset(user.user.email)).body);
    expect(first).not.toBe(second);

    // The older link is dead…
    const stale = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: first, password: 'newpass-onezero' });
    expect(stale.status).toBe(400);

    // …the newest one still works.
    const fresh = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: second, password: 'newpass-onezero' });
    expect(fresh.status).toBe(200);
  });

  it('enforces the password policy on reset', async () => {
    const user = await makeUser();
    const raw = tokenFromDevLink((await requestReset(user.user.email)).body);
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: raw, password: '123' }); // too short
    expect(res.status).toBe(422);
  });

  it('kills existing sessions after a reset (tokenVersion bump)', async () => {
    const user = await makeUser();

    // The session issued at registration works now…
    const before = await user.bearer(request(app).get('/api/auth/me'));
    expect(before.status).toBe(200);

    const raw = tokenFromDevLink((await requestReset(user.user.email)).body);
    await request(app).post('/api/auth/reset-password').send({ token: raw, password: 'fresh-pass-99' });

    // …and is dead immediately afterwards.
    const after = await user.bearer(request(app).get('/api/auth/me'));
    expect(after.status).toBe(401);
  });
});
