import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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

    // 'admin' marks an account created on /register-admin — it runs one workspace
    // and invites people into it. Everyone else is a normal user. The key is still
    // named `plan` so existing admin accounts carry over without a migration.
    plan: { type: String, default: 'user', index: true },
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
    avatarUrl: this.avatarUrl,
  };
};

export const User = mongoose.model('User', userSchema);
