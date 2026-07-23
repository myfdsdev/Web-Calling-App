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
});
