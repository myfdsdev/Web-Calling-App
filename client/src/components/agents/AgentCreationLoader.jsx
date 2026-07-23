import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Circle } from 'lucide-react';
import { cn } from '../../lib/cn.js';

const STEPS = [
  { key: 'profile', label: 'Preparing business profile' },
  { key: 'instructions', label: 'Generating conversation instructions' },
  { key: 'voice', label: 'Configuring voice' },
  { key: 'assistant', label: 'Creating Vapi assistant' },
  { key: 'webcall', label: 'Connecting web calling' },
];

/**
 * Honest creation loader. The first three steps reflect near-instant local work
 * and advance on a timer; the real async work ("Creating Vapi assistant") stays
 * loading until the backend confirms via `done`. Nothing shows complete before
 * the backend responds.
 */
export function AgentCreationLoader({ done, failed }) {
  const [localIndex, setLocalIndex] = useState(0);

  useEffect(() => {
    if (done || failed) return undefined;
    // Advance through the first 3 local steps, then hold on step 3 (assistant).
    if (localIndex < 3) {
      const t = setTimeout(() => setLocalIndex((i) => i + 1), 650);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [localIndex, done, failed]);

  const activeIndex = done ? STEPS.length : localIndex;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md rounded-3xl border border-line bg-surface p-8 text-center shadow-card"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <div className="relative flex h-20 w-20 items-center justify-center">
            {!done &&
              [0, 1].map((i) => (
                <motion.span
                  key={i}
                  className="absolute rounded-full border-2 border-primary/30"
                  style={{ width: 56 + i * 22, height: 56 + i * 22 }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.15, 0.5] }}
                  transition={{ duration: 2 + i, repeat: Infinity, ease: 'easeInOut' }}
                />
              ))}
            <div
              className={cn(
                'relative flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-colors',
                done ? 'bg-success text-white' : 'bg-primary text-[#0A0A0A]'
              )}
            >
              {done ? (
                <Check className="h-8 w-8" />
              ) : (
                <div className="flex items-end gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.span
                      key={i}
                      className="w-1.5 rounded-full bg-canvas"
                      animate={{ height: [6, 18, 6] }}
                      transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-ink">
          {done ? 'Your agent is ready!' : 'Creating your voice agent'}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {done ? 'Redirecting to your new agent…' : 'This only takes a moment.'}
        </p>

        <div className="mt-6 space-y-1 text-left">
          {STEPS.map((step, i) => {
            const isDone = i < activeIndex;
            const isActive = i === activeIndex && !done;
            return (
              <div
                key={step.key}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                  isActive && 'bg-primary-soft/50'
                )}
              >
                {isDone ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-white">
                    <Check className="h-3 w-3" />
                  </span>
                ) : isActive ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-ink-faint" />
                )}
                <span
                  className={cn(
                    'text-sm',
                    isDone ? 'font-medium text-ink' : isActive ? 'font-semibold text-primary' : 'text-ink-soft'
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
