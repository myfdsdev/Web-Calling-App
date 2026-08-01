import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore.js';
import { useCreateWorkspace } from '../../hooks/useWorkspaces.js';
import { Input } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';

/**
 * Shown when the signed-in account belongs to NO workspace — chiefly a fresh
 * Admin, who must create their (single) workspace before the app unlocks. Once
 * created, the store gains a workspace and this gate falls away automatically.
 */
export function CreateWorkspaceGate() {
  const [name, setName] = useState('');
  const create = useCreateWorkspace();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const suggested = user?.name ? `${user.name.split(' ')[0]}'s Workspace` : '';

  const submit = (e) => {
    e.preventDefault();
    const value = (name || suggested).trim();
    if (!value || create.isPending) return;
    // On success useCreateWorkspace adds it to the store + sets it active, so
    // ProtectedLayout re-renders past this gate into the app.
    create.mutate({ name: value });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-3xl border border-line bg-surface p-8 shadow-pop"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Building2 className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">Create your workspace</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Name your workspace to start using the app. This is where you’ll build agents, invite users,
          and manage them. You get one workspace on the Admin plan.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input
            id="workspace-name"
            label="Workspace name"
            autoFocus
            maxLength={60}
            placeholder={suggested || 'e.g. Acme Team'}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" size="lg" className="w-full" loading={create.isPending}>
            Create workspace
          </Button>
        </form>

        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="mt-6 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </motion.div>
    </div>
  );
}
