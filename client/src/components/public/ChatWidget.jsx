import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  Volume2,
  VolumeX,
  Phone,
  PhoneOff,
  ArrowUp,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { publicService } from '../../services/vapiService.js';
import { useVapiCall } from '../../hooks/useVapiCall.js';
import { CallWaveform } from '../calling/CallWaveform.jsx';
import { CallTimer } from '../calling/CallTimer.jsx';
import { widgetBackground, callStyle } from '../../utils/pageSettings.js';
import { cn } from '../../lib/cn.js';

const uid = () => `m_${Math.random().toString(36).slice(2)}`;

/** Agent picture, falling back to a sparkle placeholder. */
export function AgentFace({ size = 56, image, className }) {
  return (
    <span
      className={cn(
        'relative flex flex-none items-center justify-center overflow-hidden rounded-full',
        'bg-gradient-to-br from-indigo-500/40 to-fuchsia-500/30 ring-1 ring-white/20',
        className
      )}
      style={{ width: size, height: size }}
    >
      {image ? (
        <img
          src={image}
          alt=""
          className="h-full w-full object-cover"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      ) : (
        <Sparkles className="text-white" style={{ width: size * 0.4, height: size * 0.4 }} />
      )}
      <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-[#0b0b14] bg-emerald-400" />
    </span>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-white/50"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

/** Glowing orb with expanding rings — the "live call" centrepiece. */
function CallOrb({ image, speaking }) {
  return (
    <div className="relative flex h-56 w-56 items-center justify-center">
      {/* Expanding halo rings */}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border border-white/25"
          style={{ width: 132, height: 132 }}
          animate={{ scale: [1, 1.95], opacity: [0.55, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.85, ease: 'easeOut' }}
        />
      ))}

      {/* Soft glow that breathes faster while the agent speaks */}
      <motion.span
        className="absolute rounded-full blur-3xl"
        style={{
          width: 200,
          height: 200,
          background: 'radial-gradient(circle, rgba(129,140,248,0.6), transparent 70%)',
        }}
        animate={{
          scale: speaking ? [1, 1.18, 1] : [1, 1.06, 1],
          opacity: speaking ? [0.7, 1, 0.7] : [0.5, 0.75, 0.5],
        }}
        transition={{ duration: speaking ? 1.1 : 2.6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.span
        animate={{ scale: speaking ? [1, 1.05, 1] : 1 }}
        transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        <AgentFace size={116} image={image} className="ring-2 ring-white/30" />
      </motion.span>
    </div>
  );
}

/** In-overlay voice-call view (connecting / active / ended / error). */
function CallView({ agent, call, image, onBackToChat }) {
  const label = {
    connecting: 'Connecting…',
    active: call.speaking ? `${agent.name} is speaking` : 'Listening…',
    ended: 'Call ended',
    error: 'Call failed',
  }[call.status];

  const live = call.status === 'active' || call.status === 'connecting';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center"
    >
      <CallOrb image={image} speaking={call.speaking} />

      <div>
        <p className="text-lg font-semibold text-white">{label}</p>
        {call.status === 'connecting' && (
          <p className="mt-1 text-sm text-white/50">Allow microphone access if prompted.</p>
        )}
        {call.status === 'error' && (
          <p className="mx-auto mt-1 max-w-sm text-sm text-white/60">{call.errorMessage}</p>
        )}
      </div>

      {call.status === 'active' && (
        <>
          <CallWaveform active volume={call.volume} speaking={call.speaking} className="w-full max-w-sm" />
          <CallTimer seconds={call.duration} className="text-2xl font-bold tabular-nums text-white" />
        </>
      )}

      <div className="mt-2 flex items-center gap-3">
        {live ? (
          <button
            onClick={call.stop}
            className="flex items-center gap-2 rounded-full bg-red-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition-colors hover:bg-red-600"
          >
            <PhoneOff className="h-4 w-4" />
            End call
          </button>
        ) : (
          <>
            <button
              onClick={() => call.start(agent.vapiAssistantId)}
              className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-white/90"
            >
              <Phone className="h-4 w-4" />
              Call again
            </button>
            <button
              onClick={onBackToChat}
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Back to chat
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

export function ChatWidget({
  agent,
  publicKey,
  callsEnabled = true,
  widget = {},
  autoCall = false,
  open,
  onOpenChange,
}) {
  const setOpen = (v) => onOpenChange?.(v);
  // Owner-configured intro, falling back to the agent's own details.
  const introImage = widget.image || agent.avatarUrl || '';
  const introName = widget.name || agent.name;
  const introRole = widget.role || '';
  const introDescription = widget.description || agent.tagline || agent.bio || '';

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [ttsMuted, setTtsMuted] = useState(false);
  // One id per visitor session — groups all chat + call activity into one lead.
  const sessionRef = useRef(`s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`);
  const callLeadSent = useRef(false);

  const call = useVapiCall({ publicKey, allowConfigFetch: false });
  const inCall = ['connecting', 'active'].includes(call.status);
  const showCall = inCall || call.status === 'ended' || call.status === 'error';

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const greeting = agent.firstMessage || `Hey, I'm ${agent.name} — how can I help you today?`;

  const speak = useCallback(
    (text) => {
      if (ttsMuted || typeof window === 'undefined' || !window.speechSynthesis) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.02;
        window.speechSynthesis.speak(u);
      } catch {
        /* ignore */
      }
    },
    [ttsMuted]
  );

  // Seed the greeting the first time the panel opens.
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ id: uid(), role: 'assistant', content: greeting }]);
      speak(greeting);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock scroll + Esc-to-close while the panel is open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && !inCall && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, inCall]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const stopSpeaking = () => {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
  };

  const toggleTts = () => {
    setTtsMuted((m) => {
      if (!m) stopSpeaking();
      return !m;
    });
  };

  const closePanel = () => {
    if (inCall) call.stop();
    call.reset();
    stopSpeaking();
    setOpen(false);
  };

  const restart = () => {
    stopSpeaking();
    setMessages([{ id: uid(), role: 'assistant', content: greeting }]);
    setInput('');
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { id: uid(), role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const { reply } = await publicService.chat(
        agent.publicId,
        next.map((m) => ({ role: m.role, content: m.content })),
        sessionRef.current
      );
      const answer = reply || "Sorry, I couldn't respond just now.";
      setMessages((m) => [...m, { id: uid(), role: 'assistant', content: answer }]);
      speak(answer);
    } catch {
      setMessages((m) => [
        ...m,
        { id: uid(), role: 'assistant', content: 'Something went wrong. Please try again, or start a voice call.' },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const startCall = () => {
    stopSpeaking();
    // Generate a lead as soon as the visitor initiates a call (once per session).
    if (!callLeadSent.current) {
      callLeadSent.current = true;
      publicService.callLead(agent.publicId, sessionRef.current).catch(() => {});
    }
    call.start(agent.vapiAssistantId);
  };

  // Opened via the "voice call" button — dial immediately, once per opening.
  const autoCallFired = useRef(false);
  useEffect(() => {
    if (!open) {
      autoCallFired.current = false;
      return;
    }
    if (autoCall && callsEnabled && !autoCallFired.current && call.status === 'idle') {
      autoCallFired.current = true;
      startCall();
    }
  }, [open, autoCall]); // eslint-disable-line react-hooks/exhaustive-deps

  // The opening line reads as a centred welcome, not a chat bubble.
  const [opening, ...rest] = messages;
  const conversationStarted = rest.length > 0 || sending;

  return (
    <>
      {/* Full-screen chat overlay */}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[95] bg-gradient-to-r from-fuchsia-600/70 via-indigo-600/60 to-sky-500/70 p-[2px]"
            >
              <div
                className="relative flex h-full w-full flex-col overflow-hidden font-prompt"
                style={widgetBackground(widget)}
              >
                {/* Header */}
                <div className="flex flex-none items-center justify-end gap-1 px-4 py-2.5 sm:px-6">
                  {!showCall && conversationStarted && (
                    <button
                      onClick={restart}
                      aria-label="Restart conversation"
                      title="Start over"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={toggleTts}
                    aria-label={ttsMuted ? 'Unmute voice' : 'Mute voice'}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {ttsMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={closePanel}
                    aria-label="Close chat"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Body */}
                {showCall ? (
                  <CallView agent={agent} call={call} image={introImage} onBackToChat={() => call.reset()} />
                ) : (
                  <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
                    <div className="mx-auto flex max-w-2xl flex-col">
                      {/* Identity + opening line, centred */}
                      <div className="flex flex-col items-center gap-4 pb-7 text-center">
                        <AgentFace size={112} image={introImage} />
                        <div>
                          <h2 className="font-kalam text-[30px] font-bold tracking-tight text-white sm:text-[34px]">
                            {introName}
                          </h2>
                          {introRole && (
                            <p className="mt-1 font-prompt text-[12px] font-semibold uppercase tracking-[0.18em] text-amber-300/90">
                              {introRole}
                            </p>
                          )}
                        </div>
                        {opening && (
                          <motion.p
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35 }}
                            className="mx-auto max-w-xl font-prompt text-[19px] font-medium leading-relaxed text-white/90 sm:text-[21px]"
                          >
                            {opening.content}
                          </motion.p>
                        )}
                      </div>

                      {/* The rest of the conversation as bubbles */}
                      <div className="flex flex-col gap-3">
                        {rest.map((m) => (
                          <div
                            key={m.id}
                            className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                          >
                            <div
                              className={cn(
                                'max-w-[85%] rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed',
                                m.role === 'user'
                                  ? 'rounded-br-sm bg-white text-gray-900'
                                  : 'rounded-bl-sm bg-white/10 text-white ring-1 ring-white/10 backdrop-blur'
                              )}
                            >
                              {m.content}
                            </div>
                          </div>
                        ))}
                        {sending && (
                          <div className="flex justify-start">
                            <div className="rounded-2xl rounded-bl-sm bg-white/10 px-4 py-3 ring-1 ring-white/10">
                              <TypingDots />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Composer */}
                {!showCall && (
                  <div className="flex-none px-4 pb-6 pt-2 sm:px-6">
                    <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-full border border-white/15 bg-white/[0.06] p-1.5 backdrop-blur">
                      <textarea
                        ref={inputRef}
                        rows={1}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Type your reply..."
                        className="max-h-28 flex-1 resize-none bg-transparent px-4 py-2.5 text-[15px] text-white placeholder:text-white/40 focus:outline-none"
                      />
                      <button
                        onClick={startCall}
                        disabled={!callsEnabled}
                        aria-label="Start voice call"
                        title={callsEnabled ? 'Start a voice call' : 'Voice calling is unavailable right now'}
                        style={callsEnabled ? callStyle(widget) : undefined}
                        className={cn(
                          'group relative flex h-10 w-10 flex-none items-center justify-center rounded-full',
                          'text-white shadow-lg transition-transform hover:scale-105',
                          'disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none disabled:hover:scale-100'
                        )}
                      >
                        <Phone className="relative h-5 w-5" />
                      </button>
                      <button
                        onClick={send}
                        disabled={!input.trim() || sending}
                        aria-label="Send message"
                        className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/20 transition-colors hover:bg-white/25 disabled:opacity-40 disabled:hover:bg-white/15"
                      >
                        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
                      </button>
                    </div>
                    <p className="mt-2 text-center text-[12px] text-white/40">
                      {callsEnabled
                        ? 'Tap the green phone to start a live voice call.'
                        : 'Voice calling is unavailable right now.'}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
