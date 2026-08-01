import { api, unwrap } from './api.js';

export const authService = {
  register: (payload) => unwrap(api.post('/auth/register', payload)),
  /** Sign up straight onto the Admin plan (owns a manageable workspace). */
  registerAdmin: (payload) => unwrap(api.post('/auth/register-admin', payload)),
  login: (payload) => unwrap(api.post('/auth/login', payload)),
  /** Exchange a Google ID token for our own session token. */
  google: (credential) => unwrap(api.post('/auth/google', { credential })),
  me: () => unwrap(api.get('/auth/me')),
  /** Start a password reset. Always resolves the same way (no account enumeration);
   *  in dev with no mail provider the response may include a devLink. */
  forgotPassword: (email) => unwrap(api.post('/auth/forgot-password', { email })),
  /** Complete a password reset with the emailed token. */
  resetPassword: (token, password) => unwrap(api.post('/auth/reset-password', { token, password })),
};
