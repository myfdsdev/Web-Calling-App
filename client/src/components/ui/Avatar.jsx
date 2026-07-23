import { cn } from '../../lib/cn.js';
import { initials } from '../../utils/agentHelpers.js';

const SIZES = {
  sm: 'h-9 w-9 text-[13px] rounded-[10px]',
  md: 'h-11 w-11 text-sm rounded-xl',
  lg: 'h-14 w-14 text-lg rounded-2xl',
  xl: 'h-20 w-20 text-2xl rounded-3xl',
};

export function AgentAvatar({ name, size = 'md', className }) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center border border-white/10 bg-white/[0.06] font-bold text-ink',
        SIZES[size],
        className
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
