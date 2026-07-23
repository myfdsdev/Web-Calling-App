import { motion } from 'framer-motion';
import { cn } from '../../lib/cn.js';

const BARS = 28;

/**
 * Active-call waveform. When a real volume level is available it drives the bar
 * heights; otherwise it falls back to a restrained idle animation. Motion pauses
 * when the call is not active.
 */
export function CallWaveform({ active, volume = 0, speaking = false, className }) {
  return (
    <div className={cn('flex h-16 items-center justify-center gap-1', className)} aria-hidden>
      {Array.from({ length: BARS }).map((_, i) => {
        const center = 1 - Math.abs(i - BARS / 2) / (BARS / 2); // taller in the middle
        const base = 6 + center * 10;
        const reactive = active ? base + volume * 44 * (0.5 + center) : 6;
        return (
          <motion.span
            key={i}
            className={cn(
              'w-1 rounded-full',
              !active ? 'bg-white/20' : speaking ? 'bg-primary' : 'bg-primary/60'
            )}
            animate={
              active
                ? { height: [base, Math.min(reactive, 60), base] }
                : { height: 6 }
            }
            transition={
              active
                ? { duration: 0.6 + (i % 5) * 0.06, repeat: Infinity, ease: 'easeInOut', delay: i * 0.02 }
                : { duration: 0.2 }
            }
          />
        );
      })}
    </div>
  );
}
