import { motion } from 'framer-motion';
import { cn } from '../../lib/cn.js';

/** Decorative voice-agent illustration used across empty states. */
export function VoiceAgentIllustration({ className }) {
  return (
    <div className={cn('relative flex h-24 w-24 items-center justify-center', className)}>
      <div className="absolute inset-0 rounded-full bg-primary-soft" />
      <div className="absolute inset-2 rounded-full bg-white/[0.08]" />
      <svg viewBox="0 0 48 48" className="relative h-12 w-12 text-primary" fill="none">
        <rect x="17" y="10" width="14" height="20" rx="7" fill="currentColor" />
        <path
          d="M13 24a11 11 0 0 0 22 0"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path d="M24 35v4M18 39h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function EmptyState({ icon, title, description, action, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white/60 px-6 py-14 text-center',
        className
      )}
    >
      {icon || <VoiceAgentIllustration />}
      <h3 className="mt-5 text-lg font-bold text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-soft">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}
