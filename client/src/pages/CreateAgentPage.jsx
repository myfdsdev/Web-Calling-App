import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rocket, AlertTriangle } from 'lucide-react';
import { useAgentBuilder } from '../hooks/useAgentBuilder.js';
import { BuilderHeader } from '../components/builder/BuilderHeader.jsx';
import { BuilderProgress } from '../components/builder/BuilderProgress.jsx';
import { BuildAgentWelcome } from '../components/builder/BuildAgentWelcome.jsx';
import { ManualAgentForm } from '../components/builder/ManualAgentForm.jsx';
import { LiveAgentPreview } from '../components/builder/LiveAgentPreview.jsx';
import { AgentReviewSection } from '../components/agents/AgentReviewSection.jsx';
import { AgentCreationLoader } from '../components/agents/AgentCreationLoader.jsx';
import { FullPageLoader } from '../components/common/FullPageLoader.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';

export default function CreateAgentPage() {
  const navigate = useNavigate();
  const builder = useAgentBuilder();
  const { phase, draft, progress, saveState } = builder;
  const [createdAgent, setCreatedAgent] = useState(null);
  const [welcomeBusy, setWelcomeBusy] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // The popup IS the conversation: it stays open for the whole chat phase and
  // only closes when the user skips to the form or the flow reaches review.
  const showChat = phase === 'chat' && !manualMode;

  // A resumed draft that already holds answers/pre-fills skips the opening
  // use-case prompt, so a second pass can't overwrite what's already there.
  const draftHasData = Boolean(
    draft &&
      (draft.agentName ||
        draft.businessName ||
        draft.agentPurpose ||
        (draft.tone || []).length ||
        (draft.services || []).length ||
        (draft.languages || []).length ||
        draft.firstMessage ||
        draft.selectedVoiceId)
  );

  // Opening turn: the visitor describes a use case or taps a template. We
  // pre-fill those fields, then the same popup continues with the next step.
  const handleWelcomeStart = async ({ template, useCase }) => {
    const updates = template?.prefill
      ? { ...template.prefill }
      : useCase
        ? { agentPurpose: useCase.slice(0, 120) }
        : {};
    setWelcomeBusy(true);
    try {
      if (Object.keys(updates).length) await builder.patchDraft(updates);
    } finally {
      setWelcomeBusy(false);
    }
  };

  // Skip the chatbot → fill in the details manually via a form.
  const handleWelcomeSkip = () => {
    setManualMode(true);
  };

  const handleManualSubmit = async (updates) => {
    setManualSubmitting(true);
    try {
      const ok = await builder.submitManualDraft(updates);
      if (ok) setManualMode(false); // review screen takes over
    } finally {
      setManualSubmitting(false);
    }
  };

  useEffect(() => {
    if (phase === 'created' && createdAgent) {
      const t = setTimeout(() => navigate(`/agents/${createdAgent.id}`), 1400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase, createdAgent, navigate]);

  const handleCreate = async () => {
    try {
      const agent = await builder.createAgent();
      if (agent) setCreatedAgent(agent);
    } catch {
      /* handled in the hook via toast; draft stays saved */
    }
  };

  if (phase === 'loading') return <FullPageLoader inline label="Preparing your agent builder…" />;

  if (phase === 'error') {
    return (
      <div className="mx-auto max-w-content px-4 py-16 sm:px-6 lg:px-8">
        <ErrorState
          title="Couldn’t open the builder"
          message="Please check your connection and try again."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (phase === 'creating' || phase === 'created') {
    return <AgentCreationLoader done={phase === 'created'} />;
  }

  return (
    <div className="mx-auto w-full max-w-content px-4 pb-16 pt-5 sm:px-6 md:pt-8 lg:px-8">
      <BuilderHeader
        saveState={saveState}
        onExit={() => navigate('/agents')}
        onStartOver={phase === 'chat' ? () => setConfirmReset(true) : undefined}
      />
      {phase !== 'chat' && <BuilderProgress progress={progress} />}

      {phase === 'chat' ? (
          manualMode ? (
            <div className="mt-6">
              <ManualAgentForm
                submitting={manualSubmitting}
                onSubmit={handleManualSubmit}
                onSwitchToChat={() => setManualMode(false)}
              />
            </div>
          ) : (
            // The conversation lives entirely in the popup below — nothing to
            // render here behind it.
            null
          )
        ) : (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6"
          >
            <div className="mb-5">
              <h2 className="text-section font-bold text-ink">Review your voice agent</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Check every detail below. Use <b>Edit</b> on any section to adjust it through chat.
              </p>
            </div>

            {draft?.status === 'failed' && (
              <Card className="mb-5 border-danger/30 bg-danger/5 p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-danger/10 text-danger">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-ink">We couldn’t create your voice agent.</p>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      Your setup has been saved. Review the details and try again without repeating the
                      conversation.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
              <AgentReviewSection draft={draft} flow={builder.flow} onEdit={builder.editStep} />

              <div>
                <div className="sticky top-24 space-y-4">
                  <LiveAgentPreview draft={draft} progress={progress} />
                  <Card className="p-5">
                    <p className="text-sm text-ink-soft">
                      Ready to go live? We’ll create your assistant on Vapi and connect browser web
                      calling.
                    </p>
                    <Button
                      size="lg"
                      className="mt-4 w-full"
                      onClick={handleCreate}
                    >
                      <Rocket className="h-4 w-4" />
                      Create Voice Agent
                    </Button>
                  </Card>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      <BuildAgentWelcome
        open={showChat}
        sending={welcomeBusy || saveState === 'saving'}
        isTyping={builder.isTyping}
        messages={builder.messages}
        currentUi={builder.currentUi}
        voices={builder.voices}
        draft={draft}
        hasProgress={draftHasData}
        onSkip={handleWelcomeSkip}
        onStart={handleWelcomeStart}
        onSend={builder.send}
        onGenerateGreeting={builder.generateGreeting}
      />

      <ConfirmationDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => builder.startOver()}
        title="Start over?"
        description="This clears the current draft (name, purpose, tone and everything else) and begins a fresh agent. This can’t be undone."
        confirmLabel="Start over"
        destructive
      />
    </div>
  );
}
