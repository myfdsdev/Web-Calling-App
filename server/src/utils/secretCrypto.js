import crypto from 'crypto';
import { env } from '../config/env.js';

/**
 * Symmetric encryption for secrets we must store and later use in plaintext
 * server-side (BYOK API keys). AES-256-GCM gives us confidentiality + an auth
 * tag so tampering is detected on decrypt.
 *
 * The 32-byte key is derived from APP_ENCRYPTION_KEY (or the JWT secret as a dev
 * fallback) via SHA-256, so any passphrase length works.
 */
function derivedKey() {
  const secret = env.encryptionKey || env.jwtSecret || 'dev-insecure-secret-change-me';
  return crypto.createHash('sha256').update(String(secret)).digest(); // 32 bytes
}

/** Encrypt a plaintext string → compact "v1.iv.tag.cipher" (all base64url). */
export function encryptSecret(plain) {
  if (plain == null || plain === '') return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), enc.toString('base64url')].join('.');
}

/** Decrypt a payload from encryptSecret. Returns '' on any problem (never throws). */
export function decryptSecret(payload) {
  if (!payload || typeof payload !== 'string') return '';
  const parts = payload.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return '';
  try {
    const [, ivB64, tagB64, dataB64] = parts;
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey(), Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64url')), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return '';
  }
}

/** Last-4 hint for masked display, e.g. "••••••abcd". Never exposes the full key. */
export function maskHint(plain) {
  const s = String(plain || '');
  if (s.length <= 4) return s ? '••••' : '';
  return `••••${s.slice(-4)}`;
}
