import { api, unwrap } from './api.js';

export const agentService = {
  list: (params = {}) => unwrap(api.get('/agents', { params })),
  summary: () => unwrap(api.get('/agents/summary')),
  get: (agentId) => unwrap(api.get(`/agents/${agentId}`)),
  update: (agentId, updates) => unwrap(api.patch(`/agents/${agentId}`, updates)),
  remove: (agentId) => unwrap(api.delete(`/agents/${agentId}`)),
};
