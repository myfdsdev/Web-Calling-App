import { api, unwrap } from './api.js';

/** BYOK keys for a workspace. The server only ever returns masked status. */
export const apiKeysService = {
  get: (workspaceId) => unwrap(api.get(`/workspaces/${workspaceId}/api-keys`)),
  save: (workspaceId, payload) => unwrap(api.put(`/workspaces/${workspaceId}/api-keys`, payload)),
  clear: (workspaceId, provider) => unwrap(api.delete(`/workspaces/${workspaceId}/api-keys/${provider}`)),
};
