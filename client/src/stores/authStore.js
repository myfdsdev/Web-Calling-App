import { create } from 'zustand';
import { authService } from '../services/authService.js';
import { getToken, setToken } from '../services/api.js';

export const useAuthStore = create((set) => ({
  user: null,
  status: 'idle', // idle | loading | authed | anon
  hydrated: false,

  async hydrate() {
    const token = getToken();
    if (!token) {
      set({ status: 'anon', hydrated: true });
      return;
    }
    set({ status: 'loading' });
    try {
      const { user } = await authService.me();
      set({ user, status: 'authed', hydrated: true });
    } catch {
      setToken(null);
      set({ user: null, status: 'anon', hydrated: true });
    }
  },

  async login(payload) {
    const { token, user } = await authService.login(payload);
    setToken(token);
    set({ user, status: 'authed', hydrated: true });
    return user;
  },

  async loginWithGoogle(credential) {
    const { token, user } = await authService.google(credential);
    setToken(token);
    set({ user, status: 'authed', hydrated: true });
    return user;
  },

  async register(payload) {
    const { token, user } = await authService.register(payload);
    setToken(token);
    set({ user, status: 'authed', hydrated: true });
    return user;
  },

  logout() {
    setToken(null);
    set({ user: null, status: 'anon' });
  },
}));
