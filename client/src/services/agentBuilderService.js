import { api, unwrap } from './api.js';

export const agentBuilderService = {
  /** Pass a draftId to resume that exact draft; omit it to begin a new agent. */
  start: (draftId) => unwrap(api.post('/agent-builder/start', draftId ? { draftId } : {})),
  sendMessage: (payload) => unwrap(api.post('/agent-builder/message', payload)),
  getVoices: () => unwrap(api.get('/agent-builder/voices')),
  getFlow: () => unwrap(api.get('/agent-builder/flow')),

  listDrafts: () => unwrap(api.get('/agent-builder/drafts')),
  getDraft: (draftId) => unwrap(api.get(`/agent-builder/drafts/${draftId}`)),
  patchDraft: (draftId, updates) => unwrap(api.patch(`/agent-builder/drafts/${draftId}`, updates)),
  deleteDraft: (draftId) => unwrap(api.delete(`/agent-builder/drafts/${draftId}`)),

  generateGreeting: (draftId, body = {}) =>
    unwrap(api.post(`/agent-builder/drafts/${draftId}/generate-greeting`, body)),
  generatePrompt: (draftId) => unwrap(api.post(`/agent-builder/drafts/${draftId}/generate-prompt`)),
  review: (draftId) => unwrap(api.post(`/agent-builder/drafts/${draftId}/review`)),
  createVapiAgent: (draftId) => unwrap(api.post(`/agent-builder/drafts/${draftId}/create-vapi-agent`)),
};
