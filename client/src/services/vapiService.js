import { api, unwrap } from './api.js';

export const vapiService = {
  /** Browser-safe web-call config (public key). Never includes the private key. */
  getConfig: () => unwrap(api.get('/vapi/config')),
};

export const publicService = {
  /** Fetch a published agent by its share id (no auth required). */
  getAgent: (publicId) => unwrap(api.get(`/public/agents/${publicId}`)),
  /** Text chat with a published agent. `messages` is the running transcript. */
  chat: (publicId, messages, sessionId) =>
    unwrap(api.post(`/public/agents/${publicId}/chat`, { messages, sessionId })),
  /** Record that a visitor started a voice call (generates a lead). */
  callLead: (publicId, sessionId) =>
    unwrap(api.post(`/public/agents/${publicId}/call-lead`, { sessionId })),
};
