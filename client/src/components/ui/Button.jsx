import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn.js';

const VARIANTS = {
  primary:
    'bg-primary text-[#0A0A0A] hover:bg-primary-hover hover:-translate-y-px disabled:hover:translate-y-0',
  secondary:
    'bg-white/[0.03] text-ink border border-line-strong hover:border-white/25 hover:bg-white/[0.06]',
  ghost: 'bg-transparent text-ink-soft hover:bg-white/[0.06] hover:text-ink',
  danger: 'bg-danger text-white hover:brightness-110 hover:-translate-y-px',
  'danger-soft': 'bg-danger/10 text-danger hover:bg-danger/15',
  subtle: 'bg-white/[0.06] text-ink hover:bg-white/[0.1]',
};

const SIZES = {
  sm: 'h-9 px-3.5 text-[13px] rounded-[10px] gap-1.5',
  md: 'h-11 px-[18px] text-sm rounded-[10px] gap-2',
  lg: 'h-12 px-6 text-[15px] rounded-xl gap-2',
  icon: 'h-10 w-10 rounded-[10px] justify-center',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className, loading = false, disabled, children, ...props },
  ref
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.98 }}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold select-none transition-all duration-150 ease-premium focus-ring',
        'disabled:opacity-55 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </motion.button>
  );
});
