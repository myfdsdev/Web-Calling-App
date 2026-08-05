import { User } from '../../models/User.js';
import { PasswordResetToken, resetExpiry } from '../../models/PasswordResetToken.js';
import { sendEmail } from '../email/emailClient.js';
import { passwordReset } from '../email/templates.js';
import { sha256Hex, randomToken } from '../../utils/security.js';
import { AppError } from '../../utils/apiResponse.js';
import { env } from '../../config/env.js';

const MIN_PASSWORD = 6; // matches registration policy

function resetUrlFor(token) {
  return `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

/**
 * Begin a password reset.
 *
 * The caller responds identically whether or not the address exists, so this
 * quietly does nothing for unknown / Google-only accounts. Issuing a new token
 * invalidates any still-outstanding ones (so a forwarded earlier email is dead).
 */
export async function requestPasswordReset(rawEmail) {
  const email = String(rawEmail || '').toLowerCase().trim();
  const user = email ? await User.findOne({ email }).select('+passwordHash') : null;

  // No account, or a Google-only account with no password to reset.
  if (!user || !user.passwordHash) return { sent: false };

  // A fresh request kills previous unused tokens.
  await PasswordResetToken.updateMany(
    { userId: user._id, usedAt: null },
    { $set: { usedAt: new Date() } }
  );

  const token = randomToken(32);
  await PasswordResetToken.create({
    userId: user._id,
    tokenHash: sha256Hex(token),
    expiresAt: resetExpiry(),
  });

  const { subject, html, text } = passwordReset({ name: user.name, resetUrl: resetUrlFor(token) });
  const result = await sendEmail({ to: user.email, subject, html, text });

  // Dev-only fallback so a developer with no mail provider can still finish the
  // flow. NEVER surfaced in production, and the controller never leaks it to the
  // client regardless.
  const devLink = !env.isProd && result.reason === 'not_configured' ? resetUrlFor(token) : undefined;
  return { sent: result.sent, devLink };
}

/**
 * Complete a password reset.
 *
 * Expired, already-used and fabricated tokens are indistinguishable — all raise
 * the same INVALID_RESET_TOKEN. On success the password is replaced, the token is
 * spent, and tokenVersion is bumped so every session issued before now is dead.
 */
export async function completePasswordReset(rawToken, newPassword) {
  const token = String(rawToken || '');
  const password = String(newPassword || '');
  if (password.length < MIN_PASSWORD) {
    throw new AppError(`Password must be at least ${MIN_PASSWORD} characters.`, 422, 'WEAK_PASSWORD');
  }

  const invalid = () => new AppError('This reset link is invalid or has expired.', 400, 'INVALID_RESET_TOKEN');

  const record = token ? await PasswordResetToken.findOne({ tokenHash: sha256Hex(token) }) : null;
  if (!record || record.usedAt || record.expiresAt <= new Date()) throw invalid();

  const user = await User.findById(record.userId).select('+passwordHash');
  if (!user) throw invalid();

  await user.setPassword(password);
  user.tokenVersion = (user.tokenVersion || 0) + 1; // invalidate existing sessions
  await user.save();

  // Spend this token and any siblings so the link can't be replayed.
  await PasswordResetToken.updateMany(
    { userId: user._id, usedAt: null },
    { $set: { usedAt: new Date() } }
  );

  return { user };
}
