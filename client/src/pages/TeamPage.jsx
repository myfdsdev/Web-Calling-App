import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus,
  Users,
  Mail,
  Copy,
  Check,
  Trash2,
  Shield,
  Clock,
  LogOut,
  Crown,
  ChevronDown,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Dialog, DialogClose } from '../components/ui/Dialog.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog.jsx';
import { useWorkspaceStore } from '../stores/workspaceStore.js';
import {
  useActiveWorkspace,
  useWorkspaceDetails,
  useMembers,
  useInvites,
  useInviteMember,
  useRevokeInvite,
  useUpdateMemberRole,
  useRemoveMember,
} from '../hooks/useWorkspaces.js';
import { pageVariants } from '../lib/motion.js';
import { cn } from '../lib/cn.js';

const ROLE_TONE = { owner: 'primary', admin: 'active', member: 'neutral', viewer: 'draft' };
const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Member', viewer: 'Viewer' };

function timeUntil(date) {
  const ms = new Date(date).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const days = Math.floor(ms / 86400000);
  if (days >= 1) return `${days}d left`;
  const hours = Math.floor(ms / 3600000);
  return `${hours}h left`;
}

function CopyLinkButton({ url }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — user can select the field manually */
    }
  };
  return (
    <Button variant="secondary" size="sm" onClick={copy}>
      {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      {copied ? 'Copied' : 'Copy link'}
    </Button>
  );
}

/** Invite dialog — creates an invite and shows the shareable link. */
function InviteDialog({ open, onClose, workspace, roles }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [lastInvite, setLastInvite] = useState(null);
  const invite = useInviteMember(workspace?.id);

  const seatsLeft = workspace ? (workspace.seats?.max ?? 0) - (workspace.seats?.used ?? 0) : 0;
  const full = seatsLeft <= 0;

  const submit = (e) => {
    e.preventDefault();
    if (!email.trim() || invite.isPending) return;
    invite.mutate(
      { email: email.trim(), role },
      {
        onSuccess: (data) => {
          setLastInvite(data.invite);
          setEmail('');
        },
      }
    );
  };

  const close = () => {
    setLastInvite(null);
    setEmail('');
    setRole('member');
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} className="max-w-lg" labelledBy="invite-title">
      <div className="p-6">
        <DialogClose onClose={close} />
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <UserPlus className="h-5 w-5" />
          </span>
          <div>
            <h3 id="invite-title" className="text-card-title font-semibold text-ink">
              Invite a teammate
            </h3>
            <p className="text-[12px] text-ink-soft">
              They’ll join <span className="font-semibold text-ink">{workspace?.name}</span> with the role you pick.
            </p>
          </div>
        </div>

        {full ? (
          <div className="rounded-xl border border-warning/30 bg-warning/[0.08] p-4 text-[13px] text-ink">
            You’ve used all {workspace?.seats?.max} seats on the{' '}
            <span className="font-semibold">{workspace?.plan?.name}</span> plan. Upgrade the plan to invite more people.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-[38px] h-4 w-4 text-ink-soft" />
              <Input
                id="invite-email"
                type="email"
                label="Email address"
                placeholder="teammate@company.com"
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <p className="mb-2 block text-[13px] font-semibold text-ink">Role</p>
              <div className="grid grid-cols-1 gap-2">
                {(roles || []).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all',
                      role === r.id
                        ? 'border-primary bg-primary-soft'
                        : 'border-line bg-surface hover:border-line-strong'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full border',
                        role === r.id ? 'border-primary bg-primary' : 'border-line-strong'
                      )}
                    >
                      {role === r.id && <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0A]" />}
                    </span>
                    <span>
                      <span className="block text-[13px] font-semibold text-ink">{r.label}</span>
                      <span className="block text-[12px] text-ink-soft">{r.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" size="md" className="w-full" loading={invite.isPending}>
              Create invite link
            </Button>
          </form>
        )}

        {lastInvite?.inviteUrl && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-xl border border-line bg-canvas p-4"
          >
            <p className="mb-2 text-[12px] font-semibold text-ink">
              Invite ready for <span className="text-primary">{lastInvite.email}</span>
            </p>
            <p className="mb-3 text-[12px] text-ink-soft">
              No emails are sent yet — copy this link and send it to them. It expires in 7 days and can be used once.
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={lastInvite.inviteUrl}
                onFocus={(e) => e.target.select()}
                className="h-10 flex-1 truncate rounded-[10px] border border-line bg-surface px-3 font-mono text-[12px] text-ink-soft focus:outline-none"
              />
              <CopyLinkButton url={lastInvite.inviteUrl} />
            </div>
          </motion.div>
        )}
      </div>
    </Dialog>
  );
}

/** Inline role dropdown for a member row (only shown when you may manage them). */
function RoleSelect({ value, roles, disabled, onChange }) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 appearance-none rounded-[10px] border border-line bg-surface pl-3 pr-8 text-[13px] font-semibold text-ink transition-colors hover:border-line-strong focus:border-primary focus:outline-none disabled:opacity-60"
      >
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
    </div>
  );
}

function MemberRow({ member, roles, canManage, onRole, onRemove }) {
  const isOwner = member.role === 'owner';
  // You can only change/remove non-owners; the server enforces rank too.
  const manageable = canManage && !isOwner && !member.isYou;

  return (
    <div className="flex items-center gap-3 border-b border-line/70 py-3 last:border-0">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white/[0.06] text-[13px] font-bold text-ink">
        {(member.name || member.email || '?').slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink">{member.name || member.email}</p>
          {member.isYou && <span className="text-[11px] font-medium text-ink-faint">You</span>}
        </div>
        <p className="truncate text-[12px] text-ink-soft">{member.email}</p>
      </div>

      {manageable ? (
        <RoleSelect
          value={member.role}
          roles={roles}
          onChange={(role) => onRole(member, role)}
        />
      ) : (
        <Badge tone={ROLE_TONE[member.role]}>
          {isOwner && <Crown className="h-3 w-3" />}
          {ROLE_LABEL[member.role]}
        </Badge>
      )}

      {manageable && (
        <button
          onClick={() => onRemove(member)}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] text-ink-soft transition-colors hover:bg-danger/10 hover:text-danger"
          aria-label="Remove member"
          title="Remove from workspace"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default function TeamPage() {
  const storeActive = useActiveWorkspace();
  const assignableRoles = useWorkspaceStore((s) => s.roles);
  const workspaceId = storeActive?.id;

  const [inviteOpen, setInviteOpen] = useState(false);
  const [toRemove, setToRemove] = useState(null);
  const [toRevoke, setToRevoke] = useState(null);
  const [leaving, setLeaving] = useState(false);

  // Full details (seats, plan, pendingInvites, permissions) — fall back to the
  // lighter store record until the fetch lands so the page never flashes empty.
  const detailsQ = useWorkspaceDetails(workspaceId);
  const active = detailsQ.data?.workspace || storeActive;

  const perms = active?.permissions || [];
  const canInvite = perms.includes('members:invite');
  const canManage = perms.includes('members:manage');

  const membersQ = useMembers(workspaceId);
  const invitesQ = useInvites(workspaceId, canInvite);
  const updateRole = useUpdateMemberRole(workspaceId);
  const removeMember = useRemoveMember(workspaceId);
  const revokeInvite = useRevokeInvite(workspaceId);

  const members = membersQ.data?.members || [];
  const roles = membersQ.data?.roles || assignableRoles || [];
  const invites = invitesQ.data?.invites || [];
  const yourMembership = members.find((m) => m.isYou);
  const canLeave = yourMembership && yourMembership.role !== 'owner';

  if (!active) {
    return (
      <PageContainer>
        <ErrorState title="No workspace" message="We couldn't determine your active workspace." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-[13px] font-bold text-ink"
              style={{ backgroundColor: (active.color || '#6C5CE7') + '33' }}
            >
              {active.name.slice(0, 1).toUpperCase()}
            </span>
            <h1 className="truncate text-[26px] font-bold tracking-tight text-ink md:text-[32px]">
              {active.name}
            </h1>
          </div>
          <p className="mt-1.5 text-sm text-ink-soft md:text-[15px]">
            {active.isPersonal
              ? 'Your personal workspace. Invite people to turn it into a team.'
              : 'Manage who can access this workspace and what they can do.'}
          </p>
        </div>
        <div className="flex flex-none items-center gap-2.5">
          {canLeave && (
            <Button variant="secondary" size="sm" onClick={() => setLeaving(true)}>
              <LogOut className="h-4 w-4" />
              Leave
            </Button>
          )}
          {canInvite && (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Invite
            </Button>
          )}
        </div>
      </div>

      {/* Seat usage */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-ink-soft">
            <Users className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[18px] font-bold leading-none text-ink">
              {active.seats?.used ?? members.length}
              <span className="text-ink-faint"> / {active.seats?.max ?? '—'}</span>
            </p>
            <p className="mt-0.5 text-[12px] text-ink-soft">Seats used</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-ink-soft">
            <Shield className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[18px] font-bold leading-none text-ink">{ROLE_LABEL[active.role]}</p>
            <p className="mt-0.5 text-[12px] text-ink-soft">Your role</p>
          </div>
        </div>
        <div className="col-span-2 flex items-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-3 sm:col-span-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-ink-soft">
            <Clock className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[18px] font-bold leading-none text-ink">{active.pendingInvites ?? invites.length}</p>
            <p className="mt-0.5 text-[12px] text-ink-soft">Pending invites</p>
          </div>
        </div>
      </div>

      {/* Members */}
      <Card className="mb-6 p-5">
        <h2 className="mb-2 text-card-title font-semibold text-ink">Members</h2>
        {membersQ.isError ? (
          <ErrorState message="We couldn't load the members." onRetry={membersQ.refetch} />
        ) : membersQ.isLoading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.03]" />
            ))}
          </div>
        ) : (
          <div>
            {members.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                roles={roles}
                canManage={canManage}
                onRole={(member, role) => updateRole.mutate({ memberId: member.id, role })}
                onRemove={(member) => setToRemove(member)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Pending invites */}
      {canInvite && invites.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 text-card-title font-semibold text-ink">Pending invites</h2>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3"
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/[0.06] text-ink-soft">
                  <Mail className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{inv.email}</p>
                  <p className="text-[12px] text-ink-soft">
                    {ROLE_LABEL[inv.role]} · {timeUntil(inv.expiresAt)}
                  </p>
                </div>
                {inv.inviteUrl && <CopyLinkButton url={inv.inviteUrl} />}
                <button
                  onClick={() => setToRevoke(inv)}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] text-ink-soft transition-colors hover:bg-danger/10 hover:text-danger"
                  aria-label="Revoke invite"
                  title="Revoke invite"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!canInvite && !canManage && (
        <EmptyState
          title="Read-only access"
          description="You can see who's on the team, but only owners and admins can invite or manage members."
        />
      )}

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        workspace={active}
        roles={roles}
      />

      <ConfirmationDialog
        open={Boolean(toRemove)}
        onClose={() => setToRemove(null)}
        onConfirm={() =>
          removeMember.mutate(toRemove.id, { onSuccess: () => setToRemove(null) })
        }
        title={`Remove ${toRemove?.name || toRemove?.email}?`}
        description="They'll immediately lose access to this workspace's agents and leads. You can re-invite them later."
        confirmLabel="Remove member"
        destructive
        loading={removeMember.isPending}
      />

      <ConfirmationDialog
        open={Boolean(toRevoke)}
        onClose={() => setToRevoke(null)}
        onConfirm={() =>
          revokeInvite.mutate(toRevoke.id, { onSuccess: () => setToRevoke(null) })
        }
        title={`Revoke the invite for ${toRevoke?.email}?`}
        description="Their invite link will stop working immediately."
        confirmLabel="Revoke invite"
        destructive
        loading={revokeInvite.isPending}
      />

      <ConfirmationDialog
        open={leaving}
        onClose={() => setLeaving(false)}
        onConfirm={() =>
          removeMember.mutate(yourMembership.id, {
            onSuccess: () => {
              setLeaving(false);
              // Drop back to the personal workspace and reload scoped data.
              useWorkspaceStore.getState().setActive(null);
              window.location.assign('/dashboard');
            },
          })
        }
        title={`Leave ${active.name}?`}
        description="You'll lose access to this workspace until someone invites you again."
        confirmLabel="Leave workspace"
        destructive
        loading={removeMember.isPending}
      />
    </PageContainer>
  );
}
