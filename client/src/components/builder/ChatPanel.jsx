import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot } from 'lucide-react';
import { ChatMessage } from './ChatMessage.jsx';
import { TypingIndicator } from './TypingIndicator.jsx';
import { QuickReplies } from './QuickReplies.jsx';
import { ChatInput } from './ChatInput.jsx';
import { GreetingComposer } from './GreetingComposer.jsx';
import { VoiceSelectionGrid } from './VoiceSelectionGrid.jsx';

export function ChatPanel({
  messages,
  isTyping,
  currentUi,
  voices,
  draft,
  sending,
  onSend,
  onGenerateGreeting,
}) {
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isTyping, currentUi]);

  const inputType = currentUi?.inputType;
  const showInlineControls = !isTyping && currentUi;
  const isTextStep = inputType === 'text' || inputType === 'textarea';

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Bot className="h-5 w-5" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-success" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Agent Setup Assistant</p>
            <p className="flex items-center gap-1 text-[12px] text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Online
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.map((m) => (
          <ChatMessage key={m.id} role={m.role} content={m.content} />
        ))}

        {isTyping && (
          <div className="flex items-end gap-2.5">
            <span className="mb-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary-soft text-primary">
              <Bot className="h-4 w-4" />
            </span>
            <TypingIndicator />
          </div>
        )}

        {/* Inline controls for the current step */}
        <AnimatePresence>
          {showInlineControls && !isTextStep && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pl-10"
            >
              {(inputType === 'single' || inputType === 'multi') && (
                <QuickReplies ui={currentUi} disabled={sending} onSubmit={onSend} />
              )}

              {inputType === 'greeting' && (
                <GreetingComposer
                  disabled={sending}
                  defaultValue={draft?.firstMessage}
                  onGenerate={onGenerateGreeting}
                  onConfirm={(msg) => onSend({ message: msg, userEcho: msg })}
                />
              )}

              {inputType === 'voice' && (
                <VoiceSelectionGrid
                  voices={voices}
                  disabled={sending}
                  selectedVoiceId={draft?.selectedVoiceId}
                  onConfirm={(voice) =>
                    onSend({ voiceId: voice.id, userEcho: `${voice.name} — ${voice.type}` })
                  }
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Text input footer */}
      <ChatInput
        ui={isTextStep ? currentUi : null}
        disabled={!isTextStep || sending}
        sending={sending}
        onSubmit={onSend}
      />
    </div>
  );
}
