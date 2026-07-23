import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { assistantBubble, userBubble } from '../../lib/motion.js';

export function ChatMessage({ role, content }) {
  const isAssistant = role === 'assistant';
  return (
    <motion.div
      variants={isAssistant ? assistantBubble : userBubble}
      initial="hidden"
      animate="show"
      className={cn('flex items-end gap-2.5', isAssistant ? 'justify-start' : 'justify-end')}
    >
      {isAssistant && (
        <span className="mb-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary-soft text-primary">
          <Bot className="h-4 w-4" />
        </span>
      )}
      <div
        className={cn(
          'max-w-[76%] whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed',
          isAssistant
            ? 'rounded-2xl rounded-bl-sm bg-white/[0.06] text-ink'
            : 'rounded-2xl rounded-br-sm bg-primary text-[#0A0A0A]'
        )}
      >
        {content}
      </div>
    </motion.div>
  );
}
