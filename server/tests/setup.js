import { jest, beforeAll, afterAll, afterEach } from '@jest/globals';
import mongoose from 'mongoose';

// Configure env BEFORE any app module (which reads env at import time) loads.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.VAPI_PRIVATE_API_KEY = 'test-vapi-private-key';
process.env.VAPI_PUBLIC_KEY = 'test-vapi-public-key';
process.env.VAPI_BASE_URL = 'https://api.vapi.ai';
process.env.BACKEND_URL = 'http://localhost:5000';
process.env.VAPI_WEBHOOK_SECRET = '';
// Force Gemini OFF so tests exercise the deterministic fallback — otherwise a real
// GEMINI_API_KEY in the developer's .env (loaded by dotenv) makes extraction hit
// the live API and return nondeterministic results (e.g. re-cased service names).
process.env.GEMINI_API_KEY = '';
// Tests exercise the SYSTEM-key path (credits, mocked Vapi), so opt out of strict
// BYOK here. Production defaults to strict (system keys ignored).
process.env.REQUIRE_BYOK = 'false';

jest.setTimeout(30000);

beforeAll(async () => {
  const { connectDatabase } = await import('../src/config/db.js');
  await connectDatabase();
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  const { disconnectDatabase } = await import('../src/config/db.js');
  await disconnectDatabase();
});
