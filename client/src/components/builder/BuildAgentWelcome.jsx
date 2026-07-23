import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUp,
  Headset,
  TrendingUp,
  CalendarClock,
  Building2,
  UserCheck,
  Briefcase,
} from 'lucide-react';
import { cn } from '../../lib/cn.js';

/**
 * Quick-start templates. Each one pre-fills a few draft fields so the guided
 * chat can skip straight past the details it already knows. Tone values must
 * come from the flow's allowed set (Friendly / Professional / Warm / Confident
 * / Calm / Energetic) and purpose from the step-4 options.
 */
export const AGENT_TEMPLATES = [
  {
    id: 'customer-support',
    label: 'Customer Support',
    icon: Headset,
    tint: 'bg-orange-500/15 text-orange-400',
    prefill: {
      agentPurpose: 'Customer Support',
      tone: ['Friendly', 'Professional', 'Calm'],
      services: ['Answer product questions', 'Troubleshoot common issues', 'Handle complaints'],
    },
  },
  {
    id: 'sales-associate',
    label: 'Sales Associate',
    icon: TrendingUp,
    tint: 'bg-emerald-500/15 text-emerald-400',
    prefill: {
      agentPurpose: 'Sales Enquiries',
      tone: ['Confident', 'Friendly', 'Energetic'],
      services: ['Explain pricing & plans', 'Qualify leads', 'Book product demos'],
    },
  },
  {
    id: 'appointment-scheduler',
    label: 'Appointment Scheduler',
    icon: CalendarClock,
    tint: 'bg-amber-500/15 text-amber-400',
    prefill: {
      agentPurpose: 'Appointment Booking',
      tone: ['Friendly', 'Professional', 'Warm'],
      services: ['Check availability', 'Book appointments', 'Send reminders'],
    },
  },
  {
    id: 'receptionist',
    label: 'Receptionist',
    icon: Building2,
    tint: 'bg-sky-500/15 text-sky-400',
    prefill: {
      agentPurpose: 'General Reception',
      tone: ['Warm', 'Professional', 'Calm'],
      services: ['Greet callers', 'Route to the right team', 'Take messages'],
    },
  },
  {
    id: 'lead-qualifier',
    label: 'Lead Qualifier',
    icon: UserCheck,
    tint: 'bg-violet-500/15 text-violet-400',
    prefill: {
      agentPurpose: 'Lead Qualification',
      tone: ['Professional', 'Confident', 'Friendly'],
      services: ['Ask qualifying questions', 'Capture contact details', 'Gauge interest'],
    },
  },
  {
    id: 'general-assistant',
    label: 'General Assistant',
    icon: Briefcase,
    tint: 'bg-indigo-500/15 text-indigo-400',
    prefill: {
      agentPurpose: 'Customer Support',
      tone: ['Friendly', 'Warm', 'Professional'],
      services: ['Answer general questions', 'Share business info', 'Point callers to the right place'],
    },
  },
];

/**
 * The "Build a voice agent" welcome popup shown at the very start of the
 * create flow. Users can describe their use case in their own words, tap a
 * template to get a head start, or skip straight to the guided chat.
 */
export function BuildAgentWelcome({ open, sending, onSkip, onStart }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onSkip?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    // Focus the input shortly after the entrance animation settles.
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      clearTimeout(t);
    };
  }, [open, onSkip]);

  const canSend = value.trim().length > 0 && !sending;

  const submitUseCase = () => {
    if (!canSend) return;
    onStart?.({ useCase: value.trim() });
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitUseCase();
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-3 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={sending ? undefined : onSkip}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="build-agent-welcome-title"
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8, transition: { duration: 0.15 } }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex h-[76vh] max-h-[640px] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-pop"
          >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 pt-6 sm:px-7">
          <h2
            id="build-agent-welcome-title"
            className="text-[19px] font-bold tracking-tight text-ink"
          >
            Build a voice agent
          </h2>
          <button
            onClick={onSkip}
            disabled={sending}
            className="rounded-full border border-line-strong px-4 py-1.5 text-[13px] font-semibold text-ink-soft transition-colors hover:border-white/25 hover:text-ink disabled:opacity-50"
          >
            Skip
          </button>
        </div>

        {/* Intro + open space */}
        <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-7">
          <p className="max-w-xl text-[14.5px] leading-relaxed text-ink-soft">
            Hey! I&apos;m here to help you set up a voice agent in just a couple of minutes. What&apos;s
            the use case you&apos;re building for? Describe it in your own words, or tap a template
            below.
          </p>
        </div>

        {/* Templates + composer */}
        <div className="border-t border-line/70 px-4 pb-5 pt-4 sm:px-5">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {AGENT_TEMPLATES.map((t) => {
              const Icon = t.icon;
              return (
                <motion.button
                  key={t.id}
                  whileTap={{ scale: 0.97 }}
                  disabled={sending}
                  onClick={() => onStart?.({ template: t })}
                  className={cn(
                    'inline-flex flex-none items-center gap-2 rounded-full border border-line bg-surface-2 py-1.5 pl-1.5 pr-3.5',
                    'text-[13px] font-semibold text-ink transition-all duration-150',
                    'hover:-translate-y-px hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                >
                  <span className={cn('flex h-6 w-6 items-center justify-center rounded-full', t.tint)}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {t.label}
                </motion.button>
              );
            })}
          </div>

          <div className="flex items-end gap-2 rounded-2xl border border-line-strong bg-surface-2 p-1.5 transition-all focus-within:border-white/25 focus-within:shadow-focus-ring">
            <textarea
              ref={inputRef}
              rows={1}
              value={value}
              disabled={sending}
              maxLength={400}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Describe your agent's use case…"
              className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none disabled:cursor-not-allowed"
            />
            <button
              onClick={submitUseCase}
              disabled={!canSend}
              aria-label="Start building"
              className={cn(
                'flex h-10 w-10 flex-none items-center justify-center rounded-full transition-all duration-150',
                canSend
                  ? 'bg-primary text-[#0A0A0A] hover:bg-primary-hover'
                  : 'bg-white/[0.08] text-ink-faint'
              )}
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>
        </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
