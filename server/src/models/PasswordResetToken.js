import mongoose from 'mongoose';

/**
<<<<<<< HEAD
 * A one-time password-reset token. Only the SHA-256 HASH of the token is stored
 * — the raw token lives solely in the emailed link, so a database leak can't be
 * used to reset anyone's password. Single-use (deleted on reset) and short-lived
 * (a TTL index removes it once it expires).
=======
 * A single-use, short-lived password reset token.
 *
 * The raw token is emailed to the user and NEVER stored — only its SHA-256 digest
 * lives here, so a database read can't be turned into a working reset link. The
 * row is single-use (`usedAt`) and reaped by Mongo shortly after it expires.
>>>>>>> 0e2846b3adbf20526675d1c0beffa326a1771b96
 */
const passwordResetTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
<<<<<<< HEAD
=======
    usedAt: { type: Date, default: null },
>>>>>>> 0e2846b3adbf20526675d1c0beffa326a1771b96
  },
  { timestamps: true }
);

<<<<<<< HEAD
// Mongo auto-deletes the doc once `expiresAt` passes.
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

=======
// TTL index — Mongo drops the row ~once past expiresAt so spent/old tokens don't
// accumulate (auth still checks expiry itself; this is just housekeeping).
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export function resetExpiry(from = new Date()) {
  return new Date(from.getTime() + RESET_TTL_MS);
}

>>>>>>> 0e2846b3adbf20526675d1c0beffa326a1771b96
export const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema);
