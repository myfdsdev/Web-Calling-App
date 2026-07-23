import dotenv from 'dotenv';

dotenv.config();

const bool = (v, fallback = false) =>
  v == null ? fallback : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: Number(process.env.PORT) || 5000,

  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',

  mongoUri: process.env.MONGODB_URI || '',

  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',

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

  verboseLogs: bool(process.env.VERBOSE_LOGS, false),
};

/** True when a real Gemini key is configured. */
export const geminiEnabled = () => Boolean(env.geminiApiKey);

/** True when Vapi private key is configured (server can create real assistants). */
export const vapiEnabled = () => Boolean(env.vapi.privateKey);
