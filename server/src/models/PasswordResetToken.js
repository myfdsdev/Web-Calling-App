import mongoose from 'mongoose';

/**
 * A single-use, short-lived password reset token.
 *
 * The raw token is emailed to the user and NEVER stored — only its SHA-256 digest
 * lives here, so a database read can't be turned into a working reset link. The
 * row is single-use (`usedAt`) and reaped by Mongo shortly after it expires.
 */
const passwordResetTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// TTL index — Mongo drops the row ~once past expiresAt so spent/old tokens don't
// accumulate (auth still checks expiry itself; this is just housekeeping).
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export function resetExpiry(from = new Date()) {
  return new Date(from.getTime() + RESET_TTL_MS);
}

export const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema);
