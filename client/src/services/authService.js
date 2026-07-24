import { api, unwrap } from './api.js';

export const authService = {
  register: (payload) => unwrap(api.post('/auth/register', payload)),
  login: (payload) => unwrap(api.post('/auth/login', payload)),
  /** Exchange a Google ID token for our own session token. */
  google: (credential) => unwrap(api.post('/auth/google', { credential })),
  me: () => unwrap(api.get('/auth/me')),
};
