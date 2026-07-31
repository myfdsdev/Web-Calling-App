import crypto from 'crypto';
import { PasswordResetToken } from '../models/PasswordResetToken.js';

/** How long a reset link stays valid. */
export const RESET_TTL_MINUTES = 60;

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/**
 * Issue a fresh reset token for a user, invalidating any earlier ones (so a
 * re-request always supersedes the previous link). Returns the RAW token — only
 * ever put it in the emailed link, never store it.
 */
export async function createResetToken(userId) {
  await PasswordResetToken.deleteMany({ userId });
  const token = crypto.randomBytes(32).toString('base64url');
  await PasswordResetToken.create({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000),
  });
  return token;
}

/** Non-destructive validity check (for the reset page's pre-flight). */
export async function isResetTokenValid(token) {
  if (!token) return false;
  const rec = await PasswordResetToken.findOne({ tokenHash: hashToken(token) });
  return Boolean(rec && rec.expiresAt > new Date());
}

/**
 * Consume a reset token: returns the userId if valid, then deletes it (and any
 * siblings) so the link is single-use. Returns null if invalid/expired.
 */
export async function consumeResetToken(token) {
  if (!token) return null;
  const rec = await PasswordResetToken.findOne({ tokenHash: hashToken(token) });
  if (!rec || rec.expiresAt <= new Date()) return null;
  const { userId } = rec;
  await PasswordResetToken.deleteMany({ userId });
  return userId;
}
