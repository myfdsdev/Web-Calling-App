import { cn } from '../../lib/cn.js';

export function Switch({ checked, onChange, disabled, label, id }) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors duration-200 focus-ring disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-white/20'
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-surface shadow transition-transform duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}
