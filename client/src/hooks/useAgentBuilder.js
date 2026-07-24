import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { agentBuilderService } from '../services/agentBuilderService.js';

const uid = () => `local_${Math.random().toString(36).slice(2)}_${performance.now().toString(36)}`;

/**
 * Which draft this tab is currently building.
 *
 * Held in sessionStorage so a page REFRESH resumes the same conversation, while
 * navigating away (React unmount runs, a refresh doesn't) clears it — so the
 * next visit to "Create Agent" always starts a brand-new agent.
 */
const ACTIVE_DRAFT_KEY = 'vox.activeDraftId';
const readActiveDraft = () => {
  try {
    return sessionStorage.getItem(ACTIVE_DRAFT_KEY) || null;
  } catch {
    return null;
  }
};
const writeActiveDraft = (id) => {
  try {
    if (id) sessionStorage.setItem(ACTIVE_DRAFT_KEY, id);
    else sessionStorage.removeItem(ACTIVE_DRAFT_KEY);
  } catch {
    /* private mode — resume simply won't survive a refresh */
  }
};

/**
 * Owns all conversational-builder state: messages, draft, progress, autosave
 * status and the transitions between chat → review → creating → created.
 */
export function useAgentBuilder() {
  const [draftId, setDraftId] = useState(null);
  const [resumed, setResumed] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState(null);
  const [progress, setProgress] = useState(null);
  const [currentUi, setCurrentUi] = useState(null);
  const [phase, setPhase] = useState('loading'); // loading | chat | review | creating | created | error
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [isTyping, setIsTyping] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [voices, setVoices] = useState([]);
  const [flow, setFlow] = useState([]);
  const sendingRef = useRef(false);
  const savedTimer = useRef(null);
  const initializedRef = useRef(false);

  const flashSaved = useCallback(() => {
    setSaveState('saved');
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaveState('idle'), 2000);
  }, []);

  const applyServerState = useCallback((data) => {
    if (data.draft) setDraft(data.draft);
    if (data.progress) setProgress(data.progress);
    const ui = data.assistantMessage?.structuredData?.ui;
    if (ui) setCurrentUi(ui);
  }, []);

  // ── Initialize / resume ────────────────────────────────────────────────
  const init = useCallback(async () => {
    // Run exactly once — guards against React StrictMode's double-invoked mount
    // effect, whose second (stale) run could otherwise revert a later phase.
    if (initializedRef.current) return;
    initializedRef.current = true;
    setPhase('loading');
    try {
      const [startData, voiceData, flowData] = await Promise.all([
        // Only resume when this tab was already mid-conversation (a refresh).
        agentBuilderService.start(readActiveDraft()),
        agentBuilderService.getVoices().catch(() => ({ voices: [] })),
        agentBuilderService.getFlow().catch(() => ({ steps: [] })),
      ]);
      setVoices(voiceData.voices || []);
      setFlow(flowData.steps || []);
      setDraftId(startData.draftId);
      writeActiveDraft(startData.draftId);
      setResumed(Boolean(startData.resumed));
      setDraft(startData.draft);
      setProgress(startData.progress);
      setMessages(startData.messages?.length ? startData.messages : [startData.assistantMessage]);
      const lastAssistant = [...(startData.messages || [])].reverse().find((m) => m.role === 'assistant');
      setCurrentUi(lastAssistant?.structuredData?.ui || startData.assistantMessage?.structuredData?.ui || null);

      if (startData.progress?.isComplete && startData.draft?.status !== 'created') {
        await enterReview(startData.draftId);
      } else {
        // Only leave the loading state — never DOWNGRADE a phase the user has
        // already advanced past (guards against a slow duplicate init, e.g. the
        // one StrictMode fires, resolving after a later transition).
        setPhase((p) => (p === 'loading' ? 'chat' : p));
      }
    } catch (err) {
      toast.error(err.normalizedMessage || 'Could not start the agent builder.');
      setPhase('error');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    init();
    return () => {
      clearTimeout(savedTimer.current);
      // Leaving the builder (SPA navigation) ends this attempt, so the next
      // visit starts fresh. A page refresh doesn't run this, so F5 resumes.
      writeActiveDraft(null);
    };
  }, [init]);

  // ── Send an answer ─────────────────────────────────────────────────────
  const send = useCallback(
    async (payload) => {
      if (!draftId || sendingRef.current) return;
      sendingRef.current = true;
      setSaveState('saving');

      // Optimistic user bubble.
      const echo =
        payload.userEcho ??
        payload.message ??
        (Array.isArray(payload.values) ? payload.values.join(', ') : payload.value) ??
        '';
      const optimistic = { id: uid(), role: 'user', content: echo, optimistic: true };
      if (echo) setMessages((m) => [...m, optimistic]);
      setIsTyping(true);
      setCurrentUi(null); // lock input while responding

      try {
        // When editing a field from the review screen, tell the backend WHICH
        // step this answer is for (currentStep is past the flow at review time).
        const request = { draftId, ...payload };
        if (editingStep && !request.stepKey) request.stepKey = editingStep;
        const data = await agentBuilderService.sendMessage(request);
        // Replace optimistic echo with the server's stored user message.
        setMessages((m) => {
          const withoutOptimistic = m.filter((x) => x.id !== optimistic.id);
          const additions = [];
          if (data.userMessage) additions.push(data.userMessage);
          if (data.assistantMessage) additions.push(data.assistantMessage);
          return [...withoutOptimistic, ...additions];
        });
        applyServerState(data);
        flashSaved();

        // Editing a past step: return to review once done.
        if (editingStep) {
          setEditingStep(null);
          if (data.draft?.status !== 'created') {
            await enterReview(draftId);
          }
        } else if (data.isComplete) {
          await enterReview(draftId);
        }
      } catch (err) {
        setMessages((m) => m.filter((x) => x.id !== optimistic.id));
        setSaveState('error');
        toast.error(err.normalizedMessage || 'Could not save your answer. Please try again.');
        // Restore the input for the current step.
        setCurrentUi((prev) => prev || currentUi);
      } finally {
        setIsTyping(false);
        sendingRef.current = false;
      }
    },
    [draftId, applyServerState, flashSaved, editingStep, currentUi]
  );

  // Safety net: once every step is answered, guarantee the review screen
  // appears even if the in-flight transition missed due to state-update timing.
  useEffect(() => {
    if (
      phase === 'chat' &&
      !editingStep &&
      progress?.isComplete &&
      draft?.status &&
      draft.status !== 'created'
    ) {
      setPhase('review');
    }
  }, [phase, editingStep, progress?.isComplete, draft?.status]);

  // ── Greeting generation ────────────────────────────────────────────────
  const generateGreeting = useCallback(async () => {
    if (!draftId) return null;
    try {
      const { firstMessage } = await agentBuilderService.generateGreeting(draftId);
      return firstMessage;
    } catch (err) {
      toast.error(err.normalizedMessage || 'Could not generate a greeting.');
      return null;
    }
  }, [draftId]);

  // ── Enter review (ensures the system prompt exists) ────────────────────
  const enterReview = useCallback(async (id) => {
    try {
      const data = await agentBuilderService.review(id || draftId);
      setDraft(data.draft);
      setProgress(data.progress);
      setPhase('review');
    } catch (err) {
      toast.error(err.normalizedMessage || 'Could not prepare the review.');
      // Don't downgrade if the user has already moved on.
      setPhase((p) => (p === 'creating' || p === 'created' ? p : 'chat'));
    }
  }, [draftId]);

  // ── Edit a step from the review screen (returns to chat at that step) ──
  const editStep = useCallback(
    (step) => {
      setEditingStep(step.stepKey);
      setPhase('chat');
      setCurrentUi(step);
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: 'assistant',
          content: `Sure — let's update the ${step.title.toLowerCase()}. ${step.question || ''}`.trim(),
          structuredData: { ui: step },
        },
      ]);
    },
    []
  );

  // ── Manual builder: save all fields at once, then go to review ─────────
  const submitManualDraft = useCallback(
    async (updates) => {
      if (!draftId) return false;
      setSaveState('saving');
      try {
        const patched = await agentBuilderService.patchDraft(draftId, updates);
        setDraft(patched.draft);
        setProgress(patched.progress);
        const reviewed = await agentBuilderService.review(draftId);
        setDraft(reviewed.draft);
        setProgress(reviewed.progress);
        setPhase('review');
        flashSaved();
        return true;
      } catch (err) {
        setSaveState('error');
        toast.error(
          err.normalizedMessage || 'Please complete the required details and try again.'
        );
        return false;
      }
    },
    [draftId, flashSaved]
  );

  // ── Direct field patch (inline edits) ─────────────────────────────────
  const patchDraft = useCallback(
    async (updates) => {
      if (!draftId) return;
      try {
        const data = await agentBuilderService.patchDraft(draftId, updates);
        setDraft(data.draft);
        setProgress(data.progress);
        flashSaved();
      } catch (err) {
        toast.error(err.normalizedMessage || 'Could not save the change.');
      }
    },
    [draftId, flashSaved]
  );

  // ── Discard the current draft and begin a brand-new one ───────────────
  const startOver = useCallback(async () => {
    try {
      if (draftId) await agentBuilderService.deleteDraft(draftId);
    } catch {
      /* ignore — we're resetting regardless */
    }
    writeActiveDraft(null); // the reload must not resume what we just deleted
    // A clean reload re-runs init(), which finds no draft and creates a fresh one.
    window.location.reload();
  }, [draftId]);

  // ── Create the real Vapi agent ─────────────────────────────────────────
  const createAgent = useCallback(async () => {
    if (!draftId) return null;
    setPhase('creating');
    try {
      const data = await agentBuilderService.createVapiAgent(draftId);
      setPhase('created');
      return data.agent;
    } catch (err) {
      // Refresh the draft so its (now "failed") status surfaces in the review UI.
      try {
        const fresh = await agentBuilderService.getDraft(draftId);
        setDraft(fresh.draft);
        setProgress(fresh.progress);
      } catch {
        /* keep existing draft state */
      }
      setPhase('review');
      toast.error(err.normalizedMessage || 'Could not create the voice agent.');
      throw err;
    }
  }, [draftId]);

  return {
    draftId,
    resumed,
    messages,
    draft,
    progress,
    currentUi,
    phase,
    saveState,
    isTyping,
    voices,
    flow,
    editingStep,
    setPhase,
    send,
    generateGreeting,
    enterReview,
    editStep,
    patchDraft,
    submitManualDraft,
    startOver,
    createAgent,
  };
}
