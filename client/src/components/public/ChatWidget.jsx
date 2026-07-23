import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Volume2, VolumeX, Mic, ArrowUp, Loader2, PhoneOff } from 'lucide-react';
import { publicService } from '../../services/vapiService.js';
import { useVapiCall } from '../../hooks/useVapiCall.js';
import { CallWaveform } from '../calling/CallWaveform.jsx';
import { CallTimer } from '../calling/CallTimer.jsx';
import { cn } from '../../lib/cn.js';

const uid = () => `m_${Math.random().toString(36).slice(2)}`;

/** Glowing sparkle avatar used in the launcher + chat header. */
function SparkAvatar({ size = 56 }) {
  return (
    <span
      className="relative flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/40 to-fuchsia-500/30 ring-1 ring-white/20"
      style={{ width: size, height: size }}
    >
      <Sparkles className="text-white" style={{ width: size * 0.4, height: size * 0.4 }} />
      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0b0b12] bg-emerald-400" />
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

export function ChatWidget({ agent, publicKey, open, onOpenChange }) {
  const setOpen = (v) => onOpenChange?.(v);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [ttsMuted, setTtsMuted] = useState(false);
  // One id per visitor session — groups all chat + call activity into one lead.
  const sessionRef = useRef(`s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`);
  const callLeadSent = useRef(false);

  const call = useVapiCall({ publicKey, allowConfigFetch: false });
  const inCall = ['connecting', 'active'].includes(call.status);
  // Whenever a call is in any non-idle state, the call view replaces the chat.
  const showCall = inCall || call.status === 'ended' || call.status === 'error';

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const greeting = agent.firstMessage || `Hey, I'm ${agent.name} — how can I help you today?`;
  const bubble = greeting.length > 34 ? `${greeting.slice(0, 32)}…` : greeting;

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

  return (
    <>
      {/* Floating launcher */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 z-[80] flex -translate-x-1/2 flex-col items-center gap-2"
          >
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="max-w-[220px] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2 text-[13px] font-medium text-gray-900 shadow-lg"
            >
              {bubble}
            </motion.div>
            <button
              onClick={() => setOpen(true)}
              aria-label={`Chat with ${agent.name}`}
              className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-600 shadow-xl ring-4 ring-white/10 transition-transform hover:scale-105"
            >
              <Sparkles className="h-7 w-7 text-white" />
              <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
              <div className="relative flex h-full w-full flex-col overflow-hidden bg-[radial-gradient(1000px_500px_at_50%_-10%,#1b1b3a,#0b0b14_60%)]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-4 sm:px-6">
                  <div className="w-10" />
                  <SparkAvatar size={54} />
                  <div className="flex w-auto items-center gap-1">
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
                </div>

                {/* Body */}
                {showCall ? (
                  <CallView agent={agent} call={call} onBackToChat={() => call.reset()} />
                ) : (
                  <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                    <div className="mx-auto flex max-w-2xl flex-col gap-3">
                      {messages.map((m) => (
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
                )}

                {/* Composer */}
                {!showCall && (
                  <div className="px-4 pb-6 pt-2 sm:px-6">
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
                        aria-label="Start voice call"
                        title="Start a voice call"
                        className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <Mic className="h-5 w-5" />
                      </button>
                      <button
                        onClick={send}
                        disabled={!input.trim() || sending}
                        aria-label="Send message"
                        className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-white transition-opacity disabled:opacity-40"
                      >
                        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
                      </button>
                    </div>
                    <p className="mt-2 text-center text-[12px] text-white/40">
                      Tap the mic to start a live voice call.
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

/** In-overlay voice-call view (connecting / active / ended / error). */
function CallView({ agent, call, onBackToChat }) {
  const label = {
    connecting: 'Connecting…',
    active: call.speaking ? `${agent.name} is speaking` : 'Listening…',
    ended: 'Call ended',
    error: 'Call failed',
  }[call.status];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <SparkAvatar size={96} />
      <div>
        <p className="text-lg font-semibold text-white">{label}</p>
        {call.status === 'error' && (
          <p className="mx-auto mt-1 max-w-xs text-sm text-white/60">{call.errorMessage}</p>
        )}
      </div>

      {call.status === 'active' && (
        <>
          <CallWaveform active volume={call.volume} speaking={call.speaking} className="w-full max-w-sm" />
          <CallTimer seconds={call.duration} className="text-2xl font-bold tabular-nums text-white" />
        </>
      )}

      <div className="flex items-center gap-3">
        {call.status === 'active' || call.status === 'connecting' ? (
          <button
            onClick={call.stop}
            className="flex items-center gap-2 rounded-full bg-red-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-600"
          >
            <PhoneOff className="h-4 w-4" />
            End Call
          </button>
        ) : (
          <>
            <button
              onClick={() => call.start(agent.vapiAssistantId)}
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-white/90"
            >
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
    </div>
  );
}
