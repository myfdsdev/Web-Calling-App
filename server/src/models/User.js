import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { DEFAULT_PLAN_ID, getPlan } from '../config/plans.js';

/** First renewal date — one month from now. */
function nextRenewal(from = new Date()) {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return d;
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Optional: accounts created through Google sign-in have no password.
    passwordHash: { type: String, default: '', select: false },

    // Bumped whenever every existing session must be invalidated (password reset).
    // The value is embedded in the JWT as `tv`; a mismatch fails authentication,
    // so a reset immediately kills any token issued before it.
    tokenVersion: { type: Number, default: 0 },

    // Google sign-in
    googleId: { type: String, default: '', index: true },
    avatarUrl: { type: String, default: '' },

    // ── Plan + credits ──────────────────────────────────────────────────────
    plan: { type: String, default: DEFAULT_PLAN_ID, index: true },
    // Credits from the monthly allowance (reset each cycle).
    credits: { type: Number, default: () => getPlan(DEFAULT_PLAN_ID).credits, min: 0 },
    // Purchased top-up credits — never reset, spent only after `credits` runs out.
    bonusCredits: { type: Number, default: 0, min: 0 },
    creditsRenewAt: { type: Date, default: () => nextRenewal() },
    planUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  // Google-only accounts have no hash — never let an empty one match.
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    plan: this.plan,
    credits: (this.credits || 0) + (this.bonusCredits || 0),
    avatarUrl: this.avatarUrl,
  };
};

export { nextRenewal };

export const User = mongoose.model('User', userSchema);
