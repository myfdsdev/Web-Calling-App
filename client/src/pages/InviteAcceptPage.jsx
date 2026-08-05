import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Building2,
  Check,
  ShieldAlert,
  Loader2,
  UserPlus,
  LogIn,
  ArrowRight,
  Users,
} from 'lucide-react';
import { inviteService } from '../services/workspaceService.js';
import { useAuthStore } from '../stores/authStore.js';
import { useWorkspaceStore } from '../stores/workspaceStore.js';
import { Button } from '../components/ui/Button.jsx';
import { FullPageLoader } from '../components/common/FullPageLoader.jsx';

const ROLE_LABEL = { admin: 'Admin', member: 'Member', viewer: 'Viewer' };

/** Centered dark card shell for the invite landing. */
function Shell({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-3xl border border-line bg-surface p-8 shadow-pop"
      >
        {children}
      </motion.div>
    </div>
  );
}

export default function InviteAcceptPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { status, user, hydrated, logout } = useAuthStore();
  const [accepting, setAccepting] = useState(false);

  const inviteQ = useQuery({
    queryKey: ['invite', token],
    queryFn: () => inviteService.preview(token),
    retry: false,
  });

  // Wait for auth hydration so we know whether to show sign-in vs accept.
  if (!hydrated || status === 'loading' || status === 'idle') return <FullPageLoader />;

  if (inviteQ.isLoading) return <FullPageLoader />;

  if (inviteQ.isError) {
    const msg = inviteQ.error?.normalizedMessage || 'This invitation link is not valid.';
    return (
      <Shell>
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
            <ShieldAlert className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-xl font-bold text-ink">Invitation unavailable</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{msg}</p>
          <Button className="mt-6" onClick={() => navigate('/dashboard')}>
            Go to ringwebai
          </Button>
        </div>
      </Shell>
    );
  }

  const { invite, workspace } = inviteQ.data;
  const isAuthed = status === 'authed';
  const emailMatches = isAuthed && user?.email?.toLowerCase() === invite.email.toLowerCase();

  const accept = async () => {
    setAccepting(true);
    try {
      const { workspace: joined } = await inviteService.accept(token);
      useWorkspaceStore.getState().setActive(joined.id);
      toast.success(`Welcome to ${joined.name}!`);
      // Full reload so the app re-hydrates with the new workspace active.
      window.location.assign('/team');
    } catch (err) {
      toast.error(err.normalizedMessage || 'Could not accept the invitation.');
      setAccepting(false);
    }
  };

  const returnState = { from: { pathname: `/invite/${token}` }, email: invite.email };

  return (
    <Shell>
      <div className="flex flex-col items-center text-center">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-ink"
          style={{ backgroundColor: (workspace.color || '#6C5CE7') + '33' }}
        >
          {workspace.name.slice(0, 1).toUpperCase()}
        </span>

        <p className="mt-5 text-[13px] font-medium text-ink-soft">
          {invite.invitedByName ? `${invite.invitedByName} invited you to join` : 'You’ve been invited to join'}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">{workspace.name}</h1>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3.5 py-1.5 text-[13px] font-semibold text-ink">
          <Users className="h-3.5 w-3.5 text-ink-soft" />
          Joining as {ROLE_LABEL[invite.role] || 'Member'}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-canvas p-4 text-[13px] leading-relaxed text-ink-soft">
        {invite.roleDescription || 'You’ll get access to this workspace’s agents and leads.'}
      </div>

      <div className="mt-6">
        {!isAuthed ? (
          <div className="space-y-3">
            <p className="text-center text-[13px] text-ink-soft">
              Sign in or create an account with{' '}
              <span className="font-semibold text-ink">{invite.email}</span> to accept.
            </p>
            <Button
              className="w-full"
              size="lg"
              onClick={() => navigate('/signup', { state: returnState })}
            >
              <UserPlus className="h-4.5 w-4.5" />
              Create account
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              size="lg"
              onClick={() => navigate('/login', { state: returnState })}
            >
              <LogIn className="h-4.5 w-4.5" />
              I already have an account
            </Button>
          </div>
        ) : emailMatches ? (
          <Button className="w-full" size="lg" loading={accepting} onClick={accept}>
            {!accepting && <Check className="h-4.5 w-4.5" />}
            Accept invitation
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/[0.08] p-3.5 text-[13px] text-ink">
              <ShieldAlert className="mt-0.5 h-4 w-4 flex-none text-warning" />
              <span>
                This invite is for <span className="font-semibold">{invite.email}</span>, but you’re
                signed in as <span className="font-semibold">{user?.email}</span>.
              </span>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              size="lg"
              onClick={() => {
                logout();
                navigate('/login', { state: returnState });
              }}
            >
              Switch account
              <ArrowRight className="h-4.5 w-4.5" />
            </Button>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-[12px] text-ink-faint">
        <Link to="/dashboard" className="hover:text-ink-soft">
          Not now — go to ringwebai
        </Link>
      </p>
    </Shell>
  );
}
