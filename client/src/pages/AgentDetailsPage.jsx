import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Phone,
  Pencil,
  Trash2,
  Briefcase,
  Building2,
  Mic,
  MessageSquare,
  ShieldAlert,
  Link2,
  CheckCircle2,
  Palette,
  Globe,
  Copy,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { AgentAvatar } from '../components/ui/Avatar.jsx';
import { AgentStatusBadge } from '../components/agents/AgentStatusBadge.jsx';
import { WebCallPanel } from '../components/calling/WebCallPanel.jsx';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';
import { FullPageLoader } from '../components/common/FullPageLoader.jsx';
import { useAgent, useDeleteAgent } from '../hooks/useAgents.js';
import { pageVariants, staggerItem } from '../lib/motion.js';
import { cn } from '../lib/cn.js';

function DetailCard({ icon: Icon, title, children, className }) {
  return (
    <motion.div variants={staggerItem} className={className}>
      <Card className="h-full p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="text-card-title font-semibold text-ink">{title}</h3>
        </div>
        <div className="text-sm text-ink-soft">{children}</div>
      </Card>
    </motion.div>
  );
}

function Label({ children }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{children}</p>
  );
}

/** Label + value, with a consistent "Not set" fallback. */
function Field({ label, value }) {
  return (
    <div>
      <Label>{label}</Label>
      <p className={cn('mt-1 text-sm', value ? 'font-medium text-ink' : 'italic text-ink-soft')}>
        {value || 'Not set'}
      </p>
    </div>
  );
}

function Chips({ items }) {
  if (!items?.length) return <span className="text-sm italic text-ink-soft">Not set</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span key={i} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[12px] font-medium text-ink">
          {i}
        </span>
      ))}
    </div>
  );
}

/** Label + chips, spaced to line up with Field. */
function ChipField({ label, items }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5">
        <Chips items={items} />
      </div>
    </div>
  );
}

export default function AgentDetailsPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useAgent(agentId);
  const deleteAgent = useDeleteAgent();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) return <FullPageLoader inline label="Loading agent…" />;
  if (isError || !data?.agent) {
    return (
      <PageContainer animate={false}>
        <ErrorState title="Agent not found" message="This agent may have been deleted." onRetry={refetch} />
      </PageContainer>
    );
  }

  const agent = data.agent;
  const connected = Boolean(agent.vapiAssistantId);

  return (
    <PageContainer>
      <Link to="/agents" className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        <ChevronLeft className="h-4 w-4" />
        Back to agents
      </Link>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <AgentAvatar name={agent.name} size="lg" />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[24px] font-bold tracking-tight text-ink md:text-[28px]">{agent.name}</h1>
              <AgentStatusBadge status={agent.status} />
            </div>
            {agent.businessName && <p className="text-sm text-ink-soft">{agent.businessName}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button onClick={() => navigate(`/agents/${agent.id}/test`)}>
            <Phone className="h-4 w-4" />
            Test Agent
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/agents/${agent.id}/customize`)}>
            <Palette className="h-4 w-4" />
            Customize
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/agents/${agent.id}/edit`)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="danger-soft" size="icon" onClick={() => setConfirmDelete(true)} aria-label="Delete agent">
            <Trash2 className="h-4.5 w-4.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* Details */}
        <motion.div variants={pageVariants} initial="hidden" animate="show" className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <DetailCard icon={Building2} title="Business">
              <div className="space-y-3.5">
                <Field label="Name" value={agent.businessName} />
                <Field label="Type" value={agent.businessType} />
                <Field label="Location" value={agent.businessLocation} />
              </div>
            </DetailCard>

            <DetailCard icon={Briefcase} title="Agent Role">
              <div className="space-y-3.5">
                <Field label="Primary purpose" value={agent.purpose || 'General assistant'} />
                <ChipField label="Services" items={agent.services} />
              </div>
            </DetailCard>
          </div>

          <DetailCard icon={Mic} title="Voice & Language">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <Label>Voice</Label>
                <p className="mt-1 text-sm font-medium text-ink">{agent.voiceName || 'Default'}</p>
                <p className="text-[12px] capitalize text-ink-soft">{agent.voiceProvider}</p>
              </div>
              <ChipField label="Languages" items={agent.languages} />
              <ChipField label="Tone" items={agent.tone} />
            </div>
          </DetailCard>

          <DetailCard icon={MessageSquare} title="Opening Message">
            <p className="italic text-ink">“{agent.firstMessage || 'No greeting set.'}”</p>
          </DetailCard>

          <DetailCard icon={ShieldAlert} title="Escalation Behavior">
            <p>{agent.escalationInstructions || 'Collect caller details and have the team follow up.'}</p>
          </DetailCard>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-ink-soft">
                  <Link2 className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-card-title font-semibold text-ink">Vapi Connection</h3>
                  <p className="text-xs text-ink-soft">
                    {connected ? 'Assistant connected and ready for web calling.' : 'Not connected.'}
                  </p>
                </div>
              </div>
              {connected && (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Connected
                </span>
              )}
            </div>
            {connected && (
              <p className="mt-3 truncate rounded-lg bg-surface px-3 py-2 font-mono text-[12px] text-ink-soft">
                {agent.vapiAssistantId}
              </p>
            )}
          </Card>

          {/* Public share page */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    agent.isPublic ? 'bg-success/10 text-success' : 'bg-white/[0.06] text-ink-soft'
                  }`}
                >
                  {agent.isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </span>
                <div>
                  <h3 className="text-card-title font-semibold text-ink">Public page</h3>
                  <p className="text-xs text-ink-soft">
                    {agent.isPublic ? 'Live — anyone with the link can call this agent.' : 'Private — not shared.'}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => navigate(`/agents/${agent.id}/customize`)}>
                <Palette className="h-3.5 w-3.5" />
                Customize
              </Button>
            </div>
            {agent.isPublic && agent.publicId && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="flex-1 truncate rounded-lg bg-surface px-3 py-2 text-[12px] text-ink">
                  {`${window.location.origin}/a/${agent.publicId}`}
                </code>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(`${window.location.origin}/a/${agent.publicId}`);
                        toast.success('Public link copied.');
                      } catch {
                        toast.error('Could not copy the link.');
                      }
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                  <a href={`/a/${agent.publicId}`} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="ghost">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </Button>
                  </a>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Web-call test panel */}
        <div>
          <div className="sticky top-24">
            <h2 className="mb-3 text-section font-bold text-ink">Test your agent</h2>
            <WebCallPanel agent={agent} />
          </div>
        </div>
      </div>

      <ConfirmationDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          deleteAgent.mutate(agent.id, { onSuccess: () => navigate('/agents') })
        }
        title={`Delete ${agent.name}?`}
        description="This removes the agent and its Vapi assistant. It will stop working immediately and cannot be undone."
        confirmLabel="Delete agent"
        destructive
        loading={deleteAgent.isPending}
      />
    </PageContainer>
  );
}
