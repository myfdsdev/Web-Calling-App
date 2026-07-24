import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({ baseURL });

const TOKEN_KEY = 'vox.token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize errors into a readable message + code, and handle session expiry.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const data = error.response?.data;
    // In dev the API attaches `detail` (the real error) to 500s — surface it so
    // failures are diagnosable instead of a bare "status code 500".
    const detail = import.meta.env.DEV && data?.detail ? ` — ${data.detail}` : '';
    const message = (data?.message || error.message || 'Something went wrong.') + detail;
    const code = data?.code || 'ERROR';
    if (error.response?.status === 401 && ['SESSION_EXPIRED', 'UNAUTHENTICATED'].includes(code)) {
      setToken(null);
      // Let route guards react; avoid hard redirect loops on the auth pages.
      if (!['/login', '/signup'].includes(window.location.pathname)) {
        window.dispatchEvent(new CustomEvent('vox:session-expired'));
      }
    }
    return Promise.reject(Object.assign(error, { normalizedMessage: message, code }));
  }
);

/** Unwrap the `{ success, data }` envelope. */
export function unwrap(promise) {
  return promise.then((res) => res.data.data);
}
