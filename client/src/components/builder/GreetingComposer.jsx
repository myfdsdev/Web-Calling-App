import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, Check, Pencil } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { Textarea } from '../ui/Input.jsx';

/**
 * Step 8 UI: choose to generate the greeting or write it, then review/edit
 * before confirming. Uses the dedicated generate-greeting endpoint.
 */
export function GreetingComposer({ disabled, defaultValue, onGenerate, onConfirm }) {
  const [mode, setMode] = useState(null); // null | 'generate' | 'write'
  const [text, setText] = useState(defaultValue || '');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  const doGenerate = async () => {
    setLoading(true);
    setMode('generate');
    const msg = await onGenerate();
    setLoading(false);
    if (msg) {
      setText(msg);
      setEditing(false);
    }
  };

  if (!mode) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={disabled} onClick={doGenerate}>
          <Sparkles className="h-4 w-4" />
          Generate for me
        </Button>
        <Button variant="secondary" disabled={disabled} onClick={() => { setMode('write'); setEditing(true); }}>
          <Pencil className="h-4 w-4" />
          I’ll write it
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-line bg-surface p-4"
          >
            <div className="flex items-center gap-2 text-sm text-ink-soft">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              Writing a warm opening line…
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-primary/20 bg-primary-soft/40 p-4"
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-primary">
              {mode === 'generate' ? 'Generated opening message' : 'Your opening message'}
            </p>
            {editing ? (
              <Textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={400}
                className="min-h-[90px] bg-surface"
                placeholder="Hello, thank you for calling…"
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">“{text}”</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            disabled={disabled || !text.trim()}
            onClick={() => onConfirm(text.trim())}
          >
            <Check className="h-4 w-4" />
            Use this
          </Button>
          {mode === 'generate' && (
            <Button variant="secondary" disabled={disabled} onClick={doGenerate}>
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </Button>
          )}
          {!editing ? (
            <Button variant="ghost" disabled={disabled} onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          ) : (
            <Button variant="ghost" disabled={disabled} onClick={() => setEditing(false)}>
              Done editing
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
