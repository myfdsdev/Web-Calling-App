import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, MessageSquare, Phone, Mail, User, Trash2, Clock, Users } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Dialog, DialogClose } from '../components/ui/Dialog.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog.jsx';
import { useLeads, useLeadsSummary, useUpdateLead, useDeleteLead } from '../hooks/useLeads.js';
import { pageVariants, staggerItem } from '../lib/motion.js';
import { cn } from '../lib/cn.js';

const CHANNELS = [
  { value: 'all', label: 'All' },
  { value: 'chat', label: 'Chat' },
  { value: 'call', label: 'Call' },
];

const STATUSES = [
  { value: 'new', label: 'New', tone: 'primary' },
  { value: 'contacted', label: 'Contacted', tone: 'creating' },
  { value: 'qualified', label: 'Qualified', tone: 'active' },
  { value: 'closed', label: 'Closed', tone: 'neutral' },
];
const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.value, s]));

function timeAgo(date) {
  if (!date) return '';
  const d = new Date(date);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function ChannelIcon({ channel }) {
  return channel === 'call' ? <Phone className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />;
}

function StatChip({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-ink-soft">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[18px] font-bold leading-none text-ink">{value ?? 0}</p>
        <p className="mt-0.5 text-[12px] text-ink-soft">{label}</p>
      </div>
    </div>
  );
}

function LeadRow({ lead, onOpen }) {
  const st = STATUS_MAP[lead.status] || STATUSES[0];
  const display = lead.name || lead.email || lead.phone || 'Anonymous visitor';
  return (
    <motion.button
      variants={staggerItem}
      onClick={() => onOpen(lead)}
      className="flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong hover:bg-white/[0.02]"
    >
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-white/[0.06] text-ink-soft">
        <ChannelIcon channel={lead.channel} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink">{display}</p>
          <Badge tone={st.tone}>{st.label}</Badge>
        </div>
        <p className="mt-0.5 truncate text-[13px] text-ink-soft">
          {lead.summary || (lead.viaCall ? 'Started a voice call' : 'Chat conversation')}
        </p>
      </div>
      <div className="hidden flex-none text-right sm:block">
        <p className="text-[13px] font-medium text-ink">{lead.agentName || '—'}</p>
        <p className="mt-0.5 flex items-center justify-end gap-1 text-[12px] text-ink-soft">
          <Clock className="h-3 w-3" />
          {timeAgo(lead.lastActivityAt)}
        </p>
      </div>
    </motion.button>
  );
}

function LeadDetail({ lead, onClose, onStatus, onDelete }) {
  if (!lead) return null;
  const display = lead.name || lead.email || lead.phone || 'Anonymous visitor';
  return (
    <Dialog open={Boolean(lead)} onClose={onClose} className="max-w-xl" labelledBy="lead-title">
      <div className="max-h-[85vh] overflow-y-auto p-6">
        <DialogClose onClose={onClose} />
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06] text-ink-soft">
            <ChannelIcon channel={lead.channel} />
          </span>
          <div>
            <h3 id="lead-title" className="text-card-title font-semibold text-ink">{display}</h3>
            <p className="text-[12px] text-ink-soft">
              via {lead.viaCall && lead.viaChat ? 'chat & call' : lead.channel} · {lead.agentName} · {timeAgo(lead.lastActivityAt)}
            </p>
          </div>
        </div>

        {/* Contact */}
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft"><User className="h-3 w-3" />Name</p>
            <p className="mt-0.5 truncate text-sm text-ink">{lead.name || '—'}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft"><Mail className="h-3 w-3" />Email</p>
            <p className="mt-0.5 truncate text-sm text-ink">{lead.email || '—'}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft"><Phone className="h-3 w-3" />Phone</p>
            <p className="mt-0.5 truncate text-sm text-ink">{lead.phone || '—'}</p>
          </div>
        </div>

        {/* Status */}
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Status</p>
        <div className="mb-5 flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => onStatus(lead, s.value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-all',
                lead.status === s.value
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-line bg-surface text-ink-soft hover:text-ink'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Transcript */}
        {lead.transcript?.length > 0 && (
          <>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Conversation</p>
            <div className="mb-5 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-line bg-canvas p-3">
              {lead.transcript.map((m, i) => (
                <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <span
                    className={cn(
                      'max-w-[80%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed',
                      m.role === 'user' ? 'bg-primary-soft text-ink' : 'bg-white/[0.06] text-ink-soft'
                    )}
                  >
                    {m.content}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex items-center justify-between">
          <Button variant="danger-soft" size="sm" onClick={() => onDelete(lead)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default function LeadsPage() {
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('all');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const params = useMemo(
    () => ({
      ...(search ? { search } : {}),
      ...(channel !== 'all' ? { channel } : {}),
      ...(status !== 'all' ? { status } : {}),
    }),
    [search, channel, status]
  );
  const { data, isLoading, isError, refetch } = useLeads(params);
  const { data: summary } = useLeadsSummary();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();

  const leads = data?.leads || [];
  const noFilters = !search && channel === 'all' && status === 'all';

  const setLeadStatus = (lead, next) => {
    updateLead.mutate({ id: lead.id, updates: { status: next } });
    setSelected((cur) => (cur && cur.id === lead.id ? { ...cur, status: next } : cur));
  };

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-ink md:text-[32px]">Leads</h1>
        <p className="mt-1.5 text-sm text-ink-soft md:text-[15px]">
          Everyone who chatted or called your agents on their public pages.
        </p>
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatChip icon={Users} label="Total leads" value={summary?.total} />
        <StatChip icon={Clock} label="New" value={summary?.new} />
        <StatChip icon={MessageSquare} label="From chat" value={summary?.chat} />
        <StatChip icon={Phone} label="From calls" value={summary?.call} />
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((c) => (
            <button
              key={c.value}
              onClick={() => setChannel(c.value)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all',
                channel === c.value
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink'
              )}
            >
              {c.label}
            </button>
          ))}
          <span className="mx-1 w-px self-stretch bg-line" />
          {[{ value: 'all', label: 'Any status' }, ...STATUSES].map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all',
                status === s.value
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone…"
            className="h-11 w-full rounded-[10px] border border-line bg-surface pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-faint transition-all focus:border-primary focus:shadow-focus-ring focus:outline-none lg:w-72"
          />
        </div>
      </div>

      {isError ? (
        <ErrorState message="We couldn't load your leads." onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[76px] animate-pulse rounded-2xl border border-line bg-surface" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        noFilters ? (
          <EmptyState
            title="No leads yet"
            description="When visitors chat or call your published agents, their details show up here automatically."
          />
        ) : (
          <EmptyState
            title="No leads match your filters"
            description="Try a different search term or clear the filters."
            action={
              <Button variant="secondary" onClick={() => { setSearch(''); setChannel('all'); setStatus('all'); }}>
                Clear filters
              </Button>
            }
          />
        )
      ) : (
        <motion.div variants={pageVariants} initial="hidden" animate="show" className="space-y-3">
          {leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} onOpen={setSelected} />
          ))}
        </motion.div>
      )}

      <LeadDetail
        lead={selected}
        onClose={() => setSelected(null)}
        onStatus={setLeadStatus}
        onDelete={(lead) => setToDelete(lead)}
      />

      <ConfirmationDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() =>
          deleteLead.mutate(toDelete.id, {
            onSuccess: () => {
              setToDelete(null);
              setSelected(null);
            },
          })
        }
        title="Delete this lead?"
        description="This permanently removes the lead and its conversation. This cannot be undone."
        confirmLabel="Delete lead"
        destructive
        loading={deleteLead.isPending}
      />
    </PageContainer>
  );
}
