import { forwardRef } from 'react';
import { cn } from '../../lib/cn.js';

export const Input = forwardRef(function Input({ className, label, error, id, ...props }, ref) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-2 block text-[13px] font-semibold text-ink">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          'h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-ink-faint',
          'transition-all duration-150 focus:border-primary focus:shadow-focus-ring focus:outline-none',
          error && 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(229,72,77,0.15)]',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea({ className, label, error, id, ...props }, ref) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-2 block text-[13px] font-semibold text-ink">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className={cn(
          'min-h-[112px] w-full resize-y rounded-[10px] border border-line bg-surface p-3.5 text-sm text-ink placeholder:text-ink-faint',
          'transition-all duration-150 focus:border-primary focus:shadow-focus-ring focus:outline-none',
          error && 'border-danger',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
});
