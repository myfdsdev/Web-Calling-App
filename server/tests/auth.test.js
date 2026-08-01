import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { app, makeUser } from './helpers.js';

describe('Auth', () => {
  it('registers a user and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada', email: 'ada@test.dev', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe('ada@test.dev');
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Alice', email: 'dupe@test.dev', password: 'password123' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob', email: 'dupe@test.dev', password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('logs in with valid credentials and rejects bad ones', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Lin', email: 'lin@test.dev', password: 'password123' });
    const okRes = await request(app).post('/api/auth/login').send({ email: 'lin@test.dev', password: 'password123' });
    expect(okRes.status).toBe(200);
    const badRes = await request(app).post('/api/auth/login').send({ email: 'lin@test.dev', password: 'wrong' });
    expect(badRes.status).toBe(401);
  });

  it('protects routes without a token', async () => {
    const res = await request(app).get('/api/agents');
    expect(res.status).toBe(401);
  });

  it('returns the current user with a valid token', async () => {
    const user = await makeUser();
    const res = await user.bearer(request(app).get('/api/auth/me'));
    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(user.user.id);
  });

  describe('password reset', () => {
    // In non-prod with no mail provider the API returns a `devLink` — the reset
    // URL carries the raw token as a query param (…/reset-password?token=…).
    const tokenFromDevLink = (devLink) => new URL(devLink).searchParams.get('token');

    it('emails a reset link and lets the user set a new password', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Reset Me', email: 'reset@test.dev', password: 'oldpassword1' });

      const forgot = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'reset@test.dev' });
      expect(forgot.status).toBe(200);
      const token = tokenFromDevLink(forgot.body.data.devLink);
      expect(token).toBeTruthy();

      // Set the new password.
      const reset = await request(app)
        .post('/api/auth/reset-password')
        .send({ token, password: 'brandnew123' });
      expect(reset.status).toBe(200);

      // Old password no longer works; the new one does.
      const oldLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'reset@test.dev', password: 'oldpassword1' });
      expect(oldLogin.status).toBe(401);
      const newLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'reset@test.dev', password: 'brandnew123' });
      expect(newLogin.status).toBe(200);
    });

    it('makes a reset token single-use', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Once', email: 'once@test.dev', password: 'oldpassword1' });
      const forgot = await request(app).post('/api/auth/forgot-password').send({ email: 'once@test.dev' });
      const token = tokenFromDevLink(forgot.body.data.devLink);

      const first = await request(app).post('/api/auth/reset-password').send({ token, password: 'firstreset1' });
      expect(first.status).toBe(200);

      const second = await request(app).post('/api/auth/reset-password').send({ token, password: 'secondreset1' });
      expect(second.status).toBe(400);
      expect(second.body.code).toBe('INVALID_RESET_TOKEN');
    });

    it('does not reveal whether an email is registered', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody-here@test.dev' });
      expect(res.status).toBe(200);
      // No account → no link is issued, but the message is identical.
      expect(res.body.data.devLink).toBeUndefined();
      expect(res.body.message).toMatch(/if an account exists/i);
    });

    it('rejects an unknown reset token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'totally-made-up-token-value', password: 'whatever123' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_RESET_TOKEN');
    });
  });
});
