import mongoose from 'mongoose';

/**
 * BYOK (bring-your-own-key) provider credentials for one workspace.
 *
 * Secrets are stored ENCRYPTED (see utils/secretCrypto). Only the Vapi *public*
 * key is kept in plaintext — it is browser-safe by Vapi's design. The private
 * Vapi key and the Gemini key are never returned to any client; the UI only ever
 * sees the masked `*Hint` and the `configured` booleans.
 */
const workspaceApiKeysSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      unique: true,
      index: true,
    },

    // ── Vapi ──
    vapiPrivateKeyEnc: { type: String, default: '' },
    vapiPublicKey: { type: String, default: '' }, // plaintext (browser-safe)
    vapiHint: { type: String, default: '' }, // masked last-4 of the private key

    // ── Gemini ──
    geminiApiKeyEnc: { type: String, default: '' },
    geminiModel: { type: String, default: '' },
    geminiHint: { type: String, default: '' },

    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

/** Masked, client-safe view. NEVER includes decrypted secrets. */
workspaceApiKeysSchema.methods.toStatus = function toStatus() {
  return {
    vapi: {
      configured: Boolean(this.vapiPrivateKeyEnc),
      hint: this.vapiHint || '',
      publicKeySet: Boolean(this.vapiPublicKey),
      // The Vapi PUBLIC key is browser-safe by design, so it's fine to return in
      // full (the browser needs it for web calling). The private key never is.
      publicKey: this.vapiPublicKey || '',
    },
    gemini: {
      configured: Boolean(this.geminiApiKeyEnc),
      hint: this.geminiHint || '',
      model: this.geminiModel || '',
    },
    updatedAt: this.updatedAt,
  };
};

export const WorkspaceApiKeys = mongoose.model('WorkspaceApiKeys', workspaceApiKeysSchema);
