import { ok, AppError } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { saveApiKeysSchema } from '../validators/workspaceValidator.js';
import { getKeyStatus, saveWorkspaceKeys, clearProviderKey } from '../services/apiKeyService.js';

/** GET /api/workspaces/:workspaceId/api-keys — masked status (never secrets). */
export const getApiKeys = asyncHandler(async (req, res) => {
  const status = await getKeyStatus(req.workspace._id);
  return ok(res, { apiKeys: status });
});

/**
 * PUT /api/workspaces/:workspaceId/api-keys
 * Save/patch keys. Only provided fields change; '' clears a field.
 */
export const updateApiKeys = asyncHandler(async (req, res) => {
  const updates = saveApiKeysSchema.parse(req.body);
  if (Object.keys(updates).length === 0) {
    throw new AppError('Nothing to update.', 422, 'NO_CHANGES');
  }
  const status = await saveWorkspaceKeys(req.workspace._id, req.user.id, updates);
  return ok(res, { apiKeys: status }, 'API keys saved.');
});

/** DELETE /api/workspaces/:workspaceId/api-keys/:provider — remove one provider. */
export const deleteApiKey = asyncHandler(async (req, res) => {
  const provider = req.params.provider;
  if (!['vapi', 'gemini'].includes(provider)) {
    throw new AppError('Unknown provider.', 422, 'UNKNOWN_PROVIDER');
  }
  const status = await clearProviderKey(req.workspace._id, provider);
  return ok(res, { apiKeys: status || undefined }, 'API key removed.');
});
