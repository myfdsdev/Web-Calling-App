import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, Activity, Phone, Clock, Plus, ArrowRight } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { HeroBanner } from '../components/dashboard/HeroBanner.jsx';
import { MetricCard } from '../components/dashboard/MetricCard.jsx';
import { AgentCard } from '../components/agents/AgentCard.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';
import { MetricCardSkeleton, AgentCardSkeleton } from '../components/common/LoadingSkeleton.jsx';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog.jsx';
import { Button } from '../components/ui/Button.jsx';
import { useAuthStore } from '../stores/authStore.js';
import { useDashboardSummary, useDeleteAgent, useToggleAgentStatus } from '../hooks/useAgents.js';
import { pageVariants } from '../lib/motion.js';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useDashboardSummary();
  const deleteAgent = useDeleteAgent();
  const toggleStatus = useToggleAgentStatus();
  const [toDelete, setToDelete] = useState(null);

  const metrics = [
    { icon: Bot, label: 'Total Agents', value: data?.totalAgents ?? 0, tone: 'primary' },
    { icon: Activity, label: 'Active Agents', value: data?.activeAgents ?? 0, tone: 'success' },
    { icon: Phone, label: 'Calls Today', value: data?.callsToday ?? 0, tone: 'sky' },
    { icon: Clock, label: 'Total Call Minutes', value: data?.totalCallMinutes ?? 0, tone: 'warning' },
  ];

  const recent = data?.recentAgents || [];

  return (
    <PageContainer>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-ink md:text-[32px]">
            Welcome back, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="mt-1.5 text-sm text-ink-soft md:text-[15px]">
            Create and manage your AI voice agents.
          </p>
        </div>
        <Button className="sm:flex-none" onClick={() => navigate('/agents/create')}>
          <Plus className="h-4 w-4" />
          Create Agent
        </Button>
      </div>

      <HeroBanner />

      {/* Metrics */}
      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="show"
        className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6"
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
          : metrics.map((m) => <MetricCard key={m.label} {...m} />)}
      </motion.div>

      {/* Recent agents */}
      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-section font-bold text-ink">Recent Agents</h2>
          {recent.length > 0 && (
            <Link
              to="/agents"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {isError ? (
          <ErrorState message="We couldn't load your dashboard." onRetry={refetch} />
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <AgentCardSkeleton key={i} />
            ))}
          </div>
        ) : recent.length === 0 ? (
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
          <motion.div
            variants={pageVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4"
          >
            {recent.map((agent) => (
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
      </div>

      <ConfirmationDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() =>
          deleteAgent.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })
        }
        title={`Delete ${toDelete?.name || 'agent'}?`}
        description="This will remove the agent and its Vapi assistant. It will stop working immediately and cannot be undone."
        confirmLabel="Delete agent"
        destructive
        loading={deleteAgent.isPending}
      />
    </PageContainer>
  );
}
