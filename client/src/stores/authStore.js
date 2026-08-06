import { create } from 'zustand';
import { authService } from '../services/authService.js';
import { useWorkspaceStore } from './workspaceStore.js';
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

  async registerAdmin(payload) {
    const { token, user } = await authService.registerAdmin(payload);
    // /register-admin is reachable while already signed in, so this token can
    // replace a *different* account's session. Drop the old workspace state —
    // otherwise the stale x-workspace-id would be sent for the new admin (403)
    // and ProtectedLayout would skip the "create your workspace" gate.
    useWorkspaceStore.getState().reset();
    setToken(token);
    set({ user, status: 'authed', hydrated: true });
    return user;
  },

  logout() {
    setToken(null);
    set({ user: null, status: 'anon' });
  },
}));
