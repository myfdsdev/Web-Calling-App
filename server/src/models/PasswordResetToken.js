import mongoose from 'mongoose';

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
  },
  { timestamps: true }
);

// Mongo auto-deletes the doc once `expiresAt` passes.
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema);
