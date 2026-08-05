import mongoose from 'mongoose';

export const RESET_TTL_MINUTES = 60;
export const resetExpiry = () => new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

/**
 * A one-time password-reset token. Only the SHA-256 HASH of the token is stored
 * — the raw token lives solely in the emailed link, so a database leak can't be
 * used to reset anyone's password. Single-use (deleted on reset) and short-lived
 * (a TTL index removes it once it expires).
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

// Mongo auto-deletes the doc once `expiresAt` passes.
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema);
