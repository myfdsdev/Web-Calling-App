import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Plus, Users, LogOut, Building2 } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useWorkspaceStore } from '../../stores/workspaceStore.js';
import { useCreateWorkspace } from '../../hooks/useWorkspaces.js';
import { Dialog, DialogClose } from '../ui/Dialog.jsx';
import { Input } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';

const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Member', viewer: 'Viewer' };

function WorkspaceDot({ color, className }) {
  return (
    <span
      className={cn('h-2.5 w-2.5 flex-none rounded-full', className)}
      style={{ backgroundColor: color || '#6C5CE7' }}
    />
  );
}

function CreateWorkspaceDialog({ open, onClose }) {
  const [name, setName] = useState('');
  const create = useCreateWorkspace();
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim() || create.isPending) return;
    create.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          setName('');
          onClose();
          navigate('/team'); // land on the team page to invite people
        },
      }
    );
  };

  return (
    <Dialog open={open} onClose={onClose} className="max-w-md" labelledBy="create-ws-title">
      <form onSubmit={submit} className="p-6">
        <DialogClose onClose={onClose} />
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <h3 id="create-ws-title" className="text-card-title font-semibold text-ink">
              New workspace
            </h3>
            <p className="text-[12px] text-ink-soft">Group agents and invite your team into it.</p>
          </div>
        </div>
        <Input
          id="ws-name"
          label="Workspace name"
          autoFocus
          maxLength={60}
          placeholder="e.g. Acme Sales Team"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={create.isPending} disabled={!name.trim()}>
            Create workspace
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function WorkspaceSwitcher() {
  const { user, logout } = useAuthStore();
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeId = useWorkspaceStore((s) => s.activeId);
  const setActive = useWorkspaceStore((s) => s.setActive);

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const active = workspaces.find((w) => w.id === activeId) || workspaces[0] || null;

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const switchTo = (id) => {
    setOpen(false);
    if (setActive(id)) {
      // Data is scoped per workspace — refetch everything and start from the top.
      qc.invalidateQueries();
      navigate('/dashboard');
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-lg border border-line px-2.5 py-2 text-left transition-colors hover:bg-white/[0.04] focus-ring"
      >
        <span
          className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-[11px] font-bold text-ink"
          style={{ backgroundColor: (active?.color || '#6C5CE7') + '33' }}
        >
          {(active?.name || 'W').slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink">
            {active?.name || 'Workspace'}
          </span>
          <span className="block truncate text-[11px] text-ink-soft">
            {ROLE_LABEL[active?.role] || 'Member'}
            {active?.memberCount > 1 ? ` · ${active.memberCount} people` : ''}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 flex-none text-ink-soft" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-pop"
          >
            <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              Workspaces
            </p>
            <div className="max-h-64 overflow-y-auto">
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  onClick={() => switchTo(w.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06]"
                >
                  <WorkspaceDot color={w.color} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{w.name}</span>
                    <span className="block truncate text-[11px] text-ink-soft">
                      {ROLE_LABEL[w.role] || 'Member'}
                      {w.isPersonal ? ' · Personal' : ''}
                    </span>
                  </span>
                  {w.id === active?.id && <Check className="h-4 w-4 flex-none text-primary" />}
                </button>
              ))}
            </div>

            <div className="my-1 h-px bg-line" />

            <button
              onClick={() => {
                setOpen(false);
                setCreating(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-white/[0.06]"
            >
              <Plus className="h-4 w-4 text-ink-soft" />
              New workspace
            </button>
            <button
              onClick={() => {
                setOpen(false);
                navigate('/team');
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-white/[0.06]"
            >
              <Users className="h-4 w-4 text-ink-soft" />
              Manage team
            </button>

            <div className="my-1 h-px bg-line" />

            <div className="px-2.5 py-1.5">
              <p className="truncate text-[12px] font-semibold text-ink">{user?.name}</p>
              <p className="truncate text-[11px] text-ink-soft">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                logout();
                navigate('/login');
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-white/[0.06]"
            >
              <LogOut className="h-4 w-4 text-ink-soft" />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <CreateWorkspaceDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
