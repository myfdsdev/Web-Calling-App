import { api, unwrap } from './api.js';

export const leadService = {
  list: (params = {}) => unwrap(api.get('/leads', { params })),
  summary: () => unwrap(api.get('/leads/summary')),
  get: (id) => unwrap(api.get(`/leads/${id}`)),
  update: (id, updates) => unwrap(api.patch(`/leads/${id}`, updates)),
  remove: (id) => unwrap(api.delete(`/leads/${id}`)),
};
