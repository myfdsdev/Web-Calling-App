import { api, unwrap } from './api.js';

export const workspaceService = {
  list: () => unwrap(api.get('/workspaces')),
  create: (payload) => unwrap(api.post('/workspaces', payload)),
  get: (id) => unwrap(api.get(`/workspaces/${id}`)),
  update: (id, updates) => unwrap(api.patch(`/workspaces/${id}`, updates)),
  remove: (id) => unwrap(api.delete(`/workspaces/${id}`)),

  members: (id) => unwrap(api.get(`/workspaces/${id}/members`)),
  updateMember: (id, memberId, role) =>
    unwrap(api.patch(`/workspaces/${id}/members/${memberId}`, { role })),
  removeMember: (id, memberId) => unwrap(api.delete(`/workspaces/${id}/members/${memberId}`)),

  invites: (id) => unwrap(api.get(`/workspaces/${id}/invites`)),
  invite: (id, payload) => unwrap(api.post(`/workspaces/${id}/invites`, payload)),
  revokeInvite: (id, inviteId) => unwrap(api.delete(`/workspaces/${id}/invites/${inviteId}`)),
};

/** Invite landing (token-based, partly unauthenticated). */
export const inviteService = {
  preview: (token) => unwrap(api.get(`/invites/${token}`)),
  accept: (token) => unwrap(api.post(`/invites/${token}/accept`)),
};
