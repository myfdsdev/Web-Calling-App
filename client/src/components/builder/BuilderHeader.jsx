import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, AlertCircle, X, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button.jsx';

function SaveStatus({ state }) {
  const map = {
    saving: { icon: Loader2, text: 'Saving…', cls: 'text-ink-soft', spin: true },
    saved: { icon: Check, text: 'Saved', cls: 'text-success' },
    error: { icon: AlertCircle, text: 'Save failed', cls: 'text-danger' },
    idle: { icon: Check, text: 'Saved automatically', cls: 'text-ink-soft' },
  };
  const { icon: Icon, text, cls, spin } = map[state] || map.idle;
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={state}
        initial={{ opacity: 0, y: -3 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 3 }}
        transition={{ duration: 0.15 }}
        className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${cls}`}
      >
        <Icon className={`h-3.5 w-3.5 ${spin ? 'animate-spin' : ''}`} />
        {text}
      </motion.span>
    </AnimatePresence>
  );
}

export function BuilderHeader({ saveState, onExit, onStartOver }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-ink md:text-[28px]">
          Create Voice Agent
        </h1>
        <p className="mt-1 text-sm text-ink-soft">Build your agent through a guided conversation.</p>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <SaveStatus state={saveState} />
        {onStartOver && (
          <Button variant="ghost" size="sm" onClick={onStartOver}>
            <RotateCcw className="h-4 w-4" />
            Start over
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onExit}>
          <X className="h-4 w-4" />
          Exit Setup
        </Button>
      </div>
    </div>
  );
}
