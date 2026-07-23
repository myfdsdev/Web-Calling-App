import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { cn } from '../../lib/cn.js';

/** Text/textarea input footer. Enter sends; Shift+Enter adds a new line. */
export function ChatInput({ ui, disabled, sending, onSubmit }) {
  const [value, setValue] = useState('');
  const ref = useRef(null);
  const multiline = ui?.inputType === 'textarea';
  const maxLength = multiline ? 1500 : 200;

  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled, ui]);

  useEffect(() => {
    if (multiline && ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${Math.min(ref.current.scrollHeight, 160)}px`;
    }
  }, [value, multiline]);

  const canSend = value.trim().length > 0 && !disabled && !sending;

  const submit = () => {
    if (!canSend) return;
    onSubmit({ message: value.trim(), userEcho: value.trim() });
    setValue('');
    if (ref.current) ref.current.style.height = 'auto';
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !multiline) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && multiline) {
      e.preventDefault();
      submit();
    }
  };

  const placeholder = disabled
    ? 'Choose an option above…'
    : ui?.placeholder || 'Type your answer…';

  return (
    <div className="border-t border-line bg-surface px-4 py-4 sm:px-5">
      <div
        className={cn(
          'flex items-end gap-2 rounded-xl border bg-surface p-1.5 transition-all',
          disabled ? 'border-line opacity-70' : 'border-line-strong focus-within:border-primary focus-within:shadow-focus-ring'
        )}
      >
        <textarea
          ref={ref}
          rows={1}
          value={value}
          disabled={disabled}
          maxLength={maxLength}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent px-2.5 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none disabled:cursor-not-allowed"
        />
        <Button
          size="icon"
          onClick={submit}
          disabled={!canSend}
          loading={sending}
          aria-label="Send message"
        >
          {!sending && <Send className="h-4 w-4" />}
        </Button>
      </div>
      {multiline && (
        <p className="mt-1.5 px-1 text-[11px] text-ink-soft">
          Press <kbd className="rounded bg-white/[0.06] px-1">⌘/Ctrl + Enter</kbd> to send · one item per
          line
        </p>
      )}
    </div>
  );
}
