import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Plus } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { cn } from '../../lib/cn.js';

/** Renders quick-reply chips for single / multi select steps (+ optional custom). */
export function QuickReplies({ ui, disabled, onSubmit }) {
  const isMulti = ui.inputType === 'multi';
  const [selected, setSelected] = useState([]);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const options = (ui.options || []).filter((o) => o.value !== '__custom__');
  const hasCustom = ui.allowCustom || (ui.options || []).some((o) => o.value === '__custom__');

  const toggleMulti = (value) => {
    setSelected((cur) => {
      if (cur.includes(value)) return cur.filter((v) => v !== value);
      if (ui.maxSelections && cur.length >= ui.maxSelections) return cur;
      return [...cur, value];
    });
  };

  const chooseSingle = (option) => {
    if (disabled) return;
    onSubmit({ value: option.value, userEcho: option.label });
  };

  const submitCustom = () => {
    const v = customValue.trim();
    if (!v) return;
    onSubmit({ value: '__custom__', message: v, userEcho: v });
    setCustomValue('');
    setCustomOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = isMulti && selected.includes(option.value);
          return (
            <motion.button
              key={option.value}
              whileTap={{ scale: 0.97 }}
              disabled={disabled || (isMulti && ui.maxSelections && selected.length >= ui.maxSelections && !active)}
              onClick={() => (isMulti ? toggleMulti(option.value) : chooseSingle(option))}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all duration-150',
                'hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50',
                active
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-line bg-surface text-ink hover:border-primary/40 hover:bg-primary-soft/40'
              )}
            >
              {active && <Check className="h-3.5 w-3.5" />}
              {option.label}
            </motion.button>
          );
        })}

        {hasCustom && !customOpen && (
          <button
            disabled={disabled}
            onClick={() => setCustomOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink-soft transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Something else
          </button>
        )}
      </div>

      {customOpen && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <Input
            autoFocus
            placeholder="Type your answer…"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitCustom()}
          />
          <Button onClick={submitCustom} disabled={disabled || !customValue.trim()}>
            Add
          </Button>
        </motion.div>
      )}

      {isMulti && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-ink-soft">
            {selected.length}
            {ui.maxSelections ? ` / ${ui.maxSelections}` : ''} selected
          </span>
          <Button
            size="sm"
            disabled={disabled || selected.length === 0}
            onClick={() => onSubmit({ values: selected, userEcho: selected.join(', ') })}
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}
