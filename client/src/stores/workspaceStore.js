import { create } from 'zustand';
import { workspaceService } from '../services/workspaceService.js';
import { getWorkspaceId, setWorkspaceId } from '../services/api.js';

/**
 * Tracks which workspace the app is acting in. The active id is mirrored into
 * localStorage (via api.js) so every request carries the `x-workspace-id` header
 * — including the very first one after a reload, before this store has loaded.
 */
export const useWorkspaceStore = create((set, get) => ({
  workspaces: [],
  activeId: getWorkspaceId() || null,
  roles: [], // assignable role catalogue for pickers
  loading: false,
  loaded: false,

  /** The full active workspace object (or null before load). */
  active() {
    const { workspaces, activeId } = get();
    return workspaces.find((w) => w.id === activeId) || workspaces[0] || null;
  },

  async load() {
    set({ loading: true });
    try {
      const { workspaces, roles } = await workspaceService.list();
      // Keep the stored choice if it's still one we belong to; else personal (first).
      const stored = getWorkspaceId();
      const active = workspaces.find((w) => w.id === stored) || workspaces[0] || null;
      setWorkspaceId(active?.id || null);
      set({ workspaces, roles: roles || [], activeId: active?.id || null, loading: false, loaded: true });
      return workspaces;
    } catch {
      set({ loading: false, loaded: true });
      return [];
    }
  },

  /** Switch workspaces. Returns true if the active workspace actually changed. */
  setActive(id) {
    if (id === get().activeId) return false;
    setWorkspaceId(id);
    set({ activeId: id });
    return true;
  },

  /** Merge in an updated/new workspace record (e.g. after create or rename). */
  upsert(ws) {
    if (!ws?.id) return;
    set((s) => {
      const rest = s.workspaces.filter((w) => w.id !== ws.id);
      return { workspaces: [...rest, ws] };
    });
  },

  reset() {
    setWorkspaceId(null);
    set({ workspaces: [], activeId: null, roles: [], loading: false, loaded: false });
  },
}));
