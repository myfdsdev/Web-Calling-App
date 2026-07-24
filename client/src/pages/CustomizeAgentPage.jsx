import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ChevronLeft, Save, Copy, ExternalLink, Globe } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Switch } from '../components/ui/Switch.jsx';
import { FullPageLoader } from '../components/common/FullPageLoader.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';
import { useAgent, useUpdateAgent } from '../hooks/useAgents.js';
import { PageSettingsForm, withPageDefaults } from '../components/customize/PageSettingsForm.jsx';

export default function CustomizeAgentPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useAgent(agentId);
  const updateAgent = useUpdateAgent();
  const agent = data?.agent;

  const [pageSettings, setPageSettings] = useState(null);
  const [isPublic, setIsPublic] = useState(false);

  // Initialize local state once the agent loads.
  useMemo(() => {
    if (agent && !pageSettings) {
      setPageSettings(withPageDefaults(agent.pageSettings));
      setIsPublic(Boolean(agent.isPublic));
    }
  }, [agent]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || !pageSettings) return <FullPageLoader inline label="Loading page settings…" />;
  if (isError || !agent) {
    return (
      <PageContainer animate={false}>
        <ErrorState title="Agent not found" onRetry={refetch} />
      </PageContainer>
    );
  }

  const shareUrl = `${window.location.origin}/a/${agent.publicId}`;

  const onSave = async () => {
    try {
      await updateAgent.mutateAsync({
        id: agent.id,
        updates: { pageSettings, isPublic },
      });
      toast.success(isPublic ? 'Saved — your public page is live.' : 'Changes saved.');
    } catch (err) {
      toast.error(err.normalizedMessage || 'Could not save page settings.');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Public link copied.');
    } catch {
      toast.error('Could not copy the link.');
    }
  };

  return (
    <PageContainer>
      <Link
        to={`/agents/${agent.id}`}
        className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to details
      </Link>

      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-ink md:text-[32px]">Customize</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Set up how your agent introduces itself on its shareable page.
        </p>
      </div>

      {/* Publish + share */}
      <Card className="mb-5 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <h3 className="text-card-title font-semibold text-ink">Public page</h3>
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              When on, anyone with the link can view this agent and start a browser call.
            </p>
          </div>
          <Switch checked={isPublic} onChange={setIsPublic} label="Make public" />
        </div>

        <motion.div
          initial={false}
          animate={{ height: isPublic ? 'auto' : 0, opacity: isPublic ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-center">
            <code className="flex-1 truncate rounded-lg bg-surface px-3 py-2 text-[13px] text-ink">{shareUrl}</code>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={copyLink}>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
              <a href={shareUrl} target="_blank" rel="noreferrer">
                <Button size="sm" variant="ghost">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </Button>
              </a>
            </div>
          </div>
        </motion.div>
      </Card>

      {/* The page builder */}
      <PageSettingsForm value={pageSettings} onChange={setPageSettings} storeName={agent.name} />

      {/* Sticky save bar */}
      <div className="sticky bottom-4 mt-5 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 p-4 shadow-card backdrop-blur">
        <Button variant="ghost" onClick={() => navigate(`/agents/${agent.id}`)}>
          Cancel
        </Button>
        <Button onClick={onSave} loading={updateAgent.isPending}>
          <Save className="h-4 w-4" />
          Save changes
        </Button>
      </div>
    </PageContainer>
  );
}
