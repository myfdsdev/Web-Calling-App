import dotenv from 'dotenv';

dotenv.config();

const bool = (v, fallback = false) =>
  v == null ? fallback : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: Number(process.env.PORT) || 5000,

  // Identity of THIS app — surfaced in the store-bridge manifest and emails so a
  // single store-side reader can tell one app in the suite from another.
  appId: process.env.APP_ID || 'vox',
  appName: process.env.APP_NAME || 'Vox',

  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
  /** Canonical app origin — used to build shareable links (e.g. team invites). */
  appUrl: (process.env.APP_URL || (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0])
    .trim()
    .replace(/\/$/, ''),

  mongoUri: process.env.MONGODB_URI || '',

  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Secret used to encrypt stored API keys (BYOK) at rest. Falls back to the JWT
  // secret so dev works out of the box; set a dedicated value in production.
  encryptionKey: process.env.APP_ENCRYPTION_KEY || '',

  // Strict BYOK (default ON): every workspace MUST use its own Vapi/Gemini keys —
  // system env keys are IGNORED for serving requests (still allowed as a fallback
  // only when this is explicitly false, e.g. in the test suite). This is what
  // guarantees "the system's API is never used" even if the env keys are set.
  requireByok: bool(process.env.REQUIRE_BYOK, true),

  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleCallbackUrl:
    process.env.GOOGLE_CALLBACK_URL ||
    `${(process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '')}/api/auth/google/callback`,

  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',

  // Transactional email (Resend) — used for auth emails like password resets.
  // This is a PLATFORM key (not per-workspace BYOK): the app sends these itself.
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'Vox <onboarding@resend.dev>',
  },

  vapi: {
    privateKey: process.env.VAPI_PRIVATE_API_KEY || '',
    // Public key is safe to expose to the browser (used by @vapi-ai/web).
    publicKey: process.env.VAPI_PUBLIC_KEY || '',
    baseUrl: (process.env.VAPI_BASE_URL || 'https://api.vapi.ai').replace(/\/$/, ''),
    webhookUrl:
      process.env.VAPI_WEBHOOK_URL ||
      `${(process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '')}/api/vapi/webhook`,
    webhookSecret: process.env.VAPI_WEBHOOK_SECRET || '',
  },

  // Shared secret the store presents on the server-to-server bridge (provision /
  // suspend / reactivate). UNSET means the bridge is DISABLED and every call is
  // rejected — it fails closed, so a leaked URL can never mint or suspend accounts.
  platformSecret: process.env.PLATFORM_SECRET || '',

  // Transactional email (password reset, welcome credentials, team invites).
  // provider 'none' disables sending: callers still succeed but nothing is sent.
  email: {
    provider: (process.env.EMAIL_PROVIDER || 'none').toLowerCase(),
    resendApiKey: process.env.RESEND_API_KEY || '',
    // A verified sender is required by every provider. Kept generic so a missing
    // value degrades to "not configured" rather than sending from a bad address.
    from: process.env.EMAIL_FROM || '',
    // A mailbox that can actually RECEIVE replies (verified-for-sending ≠ inbox).
    replyTo: process.env.EMAIL_REPLY_TO || '',
  },

  verboseLogs: bool(process.env.VERBOSE_LOGS, false),
};

/** True when Google sign-in is configured. */
export const googleAuthEnabled = () => Boolean(env.googleClientId);

/** True when a real Gemini key is configured. */
export const geminiEnabled = () => Boolean(env.geminiApiKey);

/** True when Vapi private key is configured (server can create real assistants). */
export const vapiEnabled = () => Boolean(env.vapi.privateKey);

/** True when a transactional-email provider (Resend) is configured. */
export const emailEnabled = () => Boolean(env.resend.apiKey);
