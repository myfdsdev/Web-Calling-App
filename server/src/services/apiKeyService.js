import { WorkspaceApiKeys } from '../models/WorkspaceApiKeys.js';
import { encryptSecret, decryptSecret, maskHint } from '../utils/secretCrypto.js';
import { env } from '../config/env.js';

/**
 * BYOK resolution. Everything that talks to Vapi or Gemini goes through here so
 * there is ONE place that decides whose key runs the request:
 *
 *   1. the workspace's own key (BYO)  → `isByo: true`,  the user pays the provider
 *   2. otherwise the system env key   → `isByo: false`, the app pays (credit model)
 *   3. otherwise nothing configured   → the caller must surface a "configure keys" error
 *
 * In production the deployer simply leaves the system env keys unset, so every
 * workspace MUST bring its own — pure BYOK — while tests (which set env keys)
 * keep exercising the system path unchanged.
 */

/** Raw decrypted keys for a workspace (server-side only). */
async function loadDecrypted(workspaceId) {
  if (!workspaceId) return null;
  const doc = await WorkspaceApiKeys.findOne({ workspaceId });
  if (!doc) return null;
  return {
    vapiPrivateKey: decryptSecret(doc.vapiPrivateKeyEnc),
    vapiPublicKey: doc.vapiPublicKey || '',
    geminiApiKey: decryptSecret(doc.geminiApiKeyEnc),
    geminiModel: doc.geminiModel || '',
  };
}

/** Resolve the Vapi credentials a workspace's requests should use. */
export async function resolveVapiConfig(workspaceId) {
  const keys = await loadDecrypted(workspaceId);
  const baseUrl = env.vapi.baseUrl;
  // In strict BYOK the system env key is never used for serving.
  const systemAllowed = !env.requireByok;

  if (keys?.vapiPrivateKey) {
    return { privateKey: keys.vapiPrivateKey, publicKey: keys.vapiPublicKey || '', baseUrl, isByo: true };
  }
  if (systemAllowed && env.vapi.privateKey) {
    return { privateKey: env.vapi.privateKey, publicKey: env.vapi.publicKey || '', baseUrl, isByo: false };
  }
  // No usable private key. A workspace public key may still exist (to call an
  // already-created assistant). Under strict BYOK, treat as own-account (isByo)
  // so nothing ever falls back to app credits.
  const publicKey = keys?.vapiPublicKey || (systemAllowed ? env.vapi.publicKey : '') || '';
  return { privateKey: '', publicKey, baseUrl, isByo: env.requireByok ? true : Boolean(keys?.vapiPublicKey) };
}

/** Resolve the Gemini credentials a workspace's requests should use. */
export async function resolveGeminiConfig(workspaceId) {
  const keys = await loadDecrypted(workspaceId);
  const systemAllowed = !env.requireByok;

  if (keys?.geminiApiKey) {
    return {
      apiKey: keys.geminiApiKey,
      model: keys.geminiModel || env.geminiModel,
      isByo: true,
      enabled: true,
    };
  }
  if (systemAllowed && env.geminiApiKey) {
    return { apiKey: env.geminiApiKey, model: env.geminiModel, isByo: false, enabled: true };
  }
  // Nothing usable. Under strict BYOK mark isByo so the app never charges credits.
  return { apiKey: '', model: env.geminiModel, isByo: Boolean(env.requireByok), enabled: false };
}

/** Masked status for the settings UI (never returns secrets). */
export async function getKeyStatus(workspaceId) {
  const doc = await WorkspaceApiKeys.findOne({ workspaceId });
  const status = doc
    ? doc.toStatus()
    : {
        vapi: { configured: false, hint: '', publicKeySet: false, publicKeyHint: '' },
        gemini: { configured: false, hint: '', model: '' },
        updatedAt: null,
      };
  // Under strict BYOK the system keys are ignored, so there is no usable fallback
  // regardless of whether the env keys are set — the UI uses this to insist on keys.
  status.requireByok = Boolean(env.requireByok);
  status.systemFallback = {
    vapi: !env.requireByok && Boolean(env.vapi.privateKey),
    gemini: !env.requireByok && Boolean(env.geminiApiKey),
  };
  return status;
}

/** True when the workspace can create Vapi assistants (own OR system key). */
export async function hasUsableVapi(workspaceId) {
  const cfg = await resolveVapiConfig(workspaceId);
  return Boolean(cfg.privateKey);
}

/**
 * Save/patch a workspace's keys. Only provided fields change; passing an empty
 * string for a field CLEARS it. Undefined leaves it untouched.
 */
export async function saveWorkspaceKeys(workspaceId, userId, updates = {}) {
  const doc =
    (await WorkspaceApiKeys.findOne({ workspaceId })) ||
    new WorkspaceApiKeys({ workspaceId });

  if (updates.vapiPrivateKey !== undefined) {
    const v = String(updates.vapiPrivateKey || '').trim();
    doc.vapiPrivateKeyEnc = v ? encryptSecret(v) : '';
    doc.vapiHint = v ? maskHint(v) : '';
  }
  if (updates.vapiPublicKey !== undefined) {
    doc.vapiPublicKey = String(updates.vapiPublicKey || '').trim();
  }
  if (updates.geminiApiKey !== undefined) {
    const v = String(updates.geminiApiKey || '').trim();
    doc.geminiApiKeyEnc = v ? encryptSecret(v) : '';
    doc.geminiHint = v ? maskHint(v) : '';
  }
  if (updates.geminiModel !== undefined) {
    doc.geminiModel = String(updates.geminiModel || '').trim();
  }

  doc.updatedByUserId = userId || doc.updatedByUserId;
  await doc.save();
  return doc.toStatus();
}

/** Remove one provider's credentials from a workspace. */
export async function clearProviderKey(workspaceId, provider) {
  const doc = await WorkspaceApiKeys.findOne({ workspaceId });
  if (!doc) return null;
  if (provider === 'vapi') {
    doc.vapiPrivateKeyEnc = '';
    doc.vapiPublicKey = '';
    doc.vapiHint = '';
  } else if (provider === 'gemini') {
    doc.geminiApiKeyEnc = '';
    doc.geminiModel = '';
    doc.geminiHint = '';
  }
  await doc.save();
  return doc.toStatus();
}

/** Delete all stored keys for a workspace (used when the workspace is deleted). */
export function deleteWorkspaceKeys(workspaceId) {
  return WorkspaceApiKeys.deleteMany({ workspaceId });
}
