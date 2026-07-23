import { cn } from '../../lib/cn.js';

const TONES = {
  active: 'bg-success/10 text-success',
  draft: 'bg-white/[0.06] text-ink-soft',
  disabled: 'bg-white/[0.06] text-ink-soft',
  failed: 'bg-danger/10 text-danger',
  creating: 'bg-warning/10 text-warning',
  'ready-for-review': 'bg-primary-soft text-primary',
  created: 'bg-success/10 text-success',
  neutral: 'bg-white/[0.06] text-ink-soft',
  primary: 'bg-primary-soft text-primary',
};

export function Badge({ tone = 'neutral', className, dot = false, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold',
        TONES[tone] || TONES.neutral,
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}
