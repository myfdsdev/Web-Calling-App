import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { AgentCard } from '../components/agents/AgentCard.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';
import { AgentCardSkeleton } from '../components/common/LoadingSkeleton.jsx';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog.jsx';
import { Button } from '../components/ui/Button.jsx';
import { useAgentsList, useDeleteAgent, useToggleAgentStatus } from '../hooks/useAgents.js';
import { pageVariants } from '../lib/motion.js';
import { cn } from '../lib/cn.js';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
  { value: 'failed', label: 'Failed' },
];

export default function AgentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [toDelete, setToDelete] = useState(null);

  const params = useMemo(
    () => ({ ...(search ? { search } : {}), ...(status !== 'all' ? { status } : {}) }),
    [search, status]
  );
  const { data, isLoading, isError, refetch } = useAgentsList(params);
  const deleteAgent = useDeleteAgent();
  const toggleStatus = useToggleAgentStatus();

  const agents = data?.agents || [];
  const noFilters = !search && status === 'all';

  return (
    <PageContainer>
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-ink md:text-[32px]">Voice Agents</h1>
          <p className="mt-1.5 text-sm text-ink-soft md:text-[15px]">
            Create, test and manage your conversational agents.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents…"
              className="h-11 w-full rounded-[10px] border border-line bg-surface pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-faint transition-all focus:border-primary focus:shadow-focus-ring focus:outline-none sm:w-64"
            />
          </div>
          <Button className="sm:flex-none" onClick={() => navigate('/agents/create')}>
            <Plus className="h-4 w-4" />
            Create Agent
          </Button>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all',
              status === f.value
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isError ? (
        <ErrorState message="We couldn't load your agents." onRetry={refetch} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <AgentCardSkeleton key={i} />
          ))}
        </div>
      ) : agents.length === 0 ? (
        noFilters ? (
          <EmptyState
            title="Create your first voice agent"
            description="Build a professional Vapi-powered voice agent by answering a few simple questions."
            action={
              <Button onClick={() => navigate('/agents/create')}>
                <Plus className="h-4 w-4" />
                Create Agent
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No agents match your search"
            description="Try a different search term or clear the filters."
            action={
              <Button variant="secondary" onClick={() => { setSearch(''); setStatus('all'); }}>
                Clear filters
              </Button>
            }
          />
        )
      ) : (
        <motion.div
          variants={pageVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
        >
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onDelete={setToDelete}
              onToggleStatus={(a) =>
                toggleStatus.mutate({ id: a.id, status: a.status === 'active' ? 'disabled' : 'active' })
              }
            />
          ))}
        </motion.div>
      )}

      <ConfirmationDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => deleteAgent.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
        title={`Delete ${toDelete?.name || 'agent'}?`}
        description="This will remove the agent and its Vapi assistant. It will stop working immediately and cannot be undone."
        confirmLabel="Delete agent"
        destructive
        loading={deleteAgent.isPending}
      />
    </PageContainer>
  );
}
