import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, X, Rocket, AlertTriangle } from 'lucide-react';
import { useAgentBuilder } from '../hooks/useAgentBuilder.js';
import { BuilderHeader } from '../components/builder/BuilderHeader.jsx';
import { BuilderProgress } from '../components/builder/BuilderProgress.jsx';
import { BuildAgentWelcome } from '../components/builder/BuildAgentWelcome.jsx';
import { ManualAgentForm } from '../components/builder/ManualAgentForm.jsx';
import { ChatPanel } from '../components/builder/ChatPanel.jsx';
import { LiveAgentPreview } from '../components/builder/LiveAgentPreview.jsx';
import { AgentReviewSection } from '../components/agents/AgentReviewSection.jsx';
import { AgentCreationLoader } from '../components/agents/AgentCreationLoader.jsx';
import { FullPageLoader } from '../components/common/FullPageLoader.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';

function MobilePreviewSheet({ draft, progress }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-pop"
      >
        <Eye className="h-4 w-4" />
        Preview
      </button>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end">
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative max-h-[80vh] w-full overflow-y-auto rounded-t-3xl bg-canvas p-4 pb-8"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-card-title font-semibold text-ink">Live Preview</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-white/[0.06]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <LiveAgentPreview draft={draft} progress={progress} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CreateAgentPage() {
  const navigate = useNavigate();
  const builder = useAgentBuilder();
  const { phase, draft, progress, saveState } = builder;
  const [createdAgent, setCreatedAgent] = useState(null);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [welcomeBusy, setWelcomeBusy] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Show the welcome popup whenever the conversation hasn't started yet —
  // i.e. no question has been answered. This covers both a brand-new draft and
  // a resumed-but-empty one (a partially-filled draft resumes straight to chat).
  const hasAnswered =
    builder.messages.some((m) => m.role === 'user') || (draft?.currentStep ?? 1) > 1;
  const showWelcome =
    phase === 'chat' && !manualMode && !welcomeDismissed && !hasAnswered;

  // Chat path: user describes a use case or taps a template → prefill + chat.
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
      setWelcomeDismissed(true);
    }
  };

  // Skip the chatbot → fill in the details manually via a form.
  const handleWelcomeSkip = () => {
    setWelcomeDismissed(true);
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
      <BuilderHeader saveState={saveState} onExit={() => navigate('/agents')} />
      {!manualMode && <BuilderProgress progress={progress} />}

      {phase === 'chat' ? (
          manualMode ? (
            <div className="mt-6">
              <ManualAgentForm
                voices={builder.voices}
                submitting={manualSubmitting}
                onSubmit={handleManualSubmit}
                onSwitchToChat={() => setManualMode(false)}
              />
            </div>
          ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]"
          >
            <div className="h-[calc(100vh-230px)] max-h-[760px] min-h-[480px]">
              <ChatPanel
                messages={builder.messages}
                isTyping={builder.isTyping}
                currentUi={builder.currentUi}
                voices={builder.voices}
                draft={draft}
                sending={saveState === 'saving' || builder.isTyping}
                onSend={builder.send}
                onGenerateGreeting={builder.generateGreeting}
              />
            </div>
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <LiveAgentPreview draft={draft} progress={progress} />
              </div>
            </div>
          </motion.div>
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

      {phase === 'chat' && !manualMode && <MobilePreviewSheet draft={draft} progress={progress} />}

      <BuildAgentWelcome
        open={showWelcome}
        sending={welcomeBusy}
        onSkip={handleWelcomeSkip}
        onStart={handleWelcomeStart}
      />
    </div>
  );
}
