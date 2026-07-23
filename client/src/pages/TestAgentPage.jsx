import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Pencil, Info } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { AgentStatusBadge } from '../components/agents/AgentStatusBadge.jsx';
import { WebCallPanel } from '../components/calling/WebCallPanel.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';
import { FullPageLoader } from '../components/common/FullPageLoader.jsx';
import { useAgent } from '../hooks/useAgents.js';

export default function TestAgentPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useAgent(agentId);

  if (isLoading) return <FullPageLoader inline label="Loading agent…" />;
  if (isError || !data?.agent) {
    return (
      <PageContainer animate={false}>
        <ErrorState title="Agent not found" onRetry={refetch} />
      </PageContainer>
    );
  }

  const agent = data.agent;

  return (
    <PageContainer>
      <Link
        to={`/agents/${agent.id}`}
        className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to details
      </Link>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[26px] font-bold tracking-tight text-ink md:text-[32px]">Test {agent.name}</h1>
            <AgentStatusBadge status={agent.status} />
          </div>
          <p className="mt-1.5 text-sm text-ink-soft">
            Have a live browser conversation with your voice agent.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate(`/agents/${agent.id}/edit`)}>
          <Pencil className="h-4 w-4" />
          Edit Agent
        </Button>
      </div>

      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <WebCallPanel agent={agent} />

        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2 text-primary">
              <Info className="h-4 w-4" />
              <h3 className="text-sm font-semibold">How testing works</h3>
            </div>
            <ul className="space-y-2.5 text-sm text-ink-soft">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-primary" />
                Click <b className="text-ink">Start Test Call</b> and allow microphone access.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-primary" />
                Speak naturally — the agent listens and responds in real time.
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-primary" />
                End the call any time. Calls run entirely in your browser.
              </li>
            </ul>
          </Card>

          <Card className="p-5">
            <h3 className="mb-2 text-sm font-semibold text-ink">Opening line</h3>
            <p className="text-sm italic text-ink-soft">“{agent.firstMessage}”</p>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
