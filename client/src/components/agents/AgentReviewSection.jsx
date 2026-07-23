import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, ChevronDown, Code2, User, Briefcase, MessageCircle } from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { cn } from '../../lib/cn.js';
import { staggerItem } from '../../lib/motion.js';

function Field({ label, value }) {
  const has = Array.isArray(value) ? value.length > 0 : Boolean(value);
  const display = Array.isArray(value) ? value.join(', ') : value;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={cn('mt-0.5 text-sm', has ? 'text-ink' : 'italic text-ink-soft')}>
        {has ? display : 'Not added'}
      </p>
    </div>
  );
}

function ReviewCard({ icon: Icon, title, stepKey, flow, onEdit, children }) {
  const step = flow.find((s) => s.stepKey === stepKey);
  return (
    <motion.div variants={staggerItem}>
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <h3 className="text-card-title font-semibold text-ink">{title}</h3>
          </div>
          {step && onEdit && (
            <Button size="sm" variant="ghost" onClick={() => onEdit(step)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>
        <div className="space-y-4">{children}</div>
      </Card>
    </motion.div>
  );
}

function SystemPromptPreview({ prompt }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-ink-soft">
            <Code2 className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-card-title font-semibold text-ink">Agent Instructions</h3>
            <p className="text-xs text-ink-soft">Generated system prompt · advanced</p>
          </div>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-ink-soft transition-transform', open && 'rotate-180')} />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden"
      >
        <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-surface p-4 text-[12.5px] leading-relaxed text-ink">
          {prompt || 'The system prompt will be generated on creation.'}
        </pre>
      </motion.div>
    </Card>
  );
}

export function AgentReviewSection({ draft, flow, onEdit }) {
  return (
    <div className="space-y-5">
      <ReviewCard icon={User} title="Agent Identity" stepKey="agentName" flow={flow} onEdit={onEdit}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Agent name" value={draft.agentName} />
          <Field label="Business name" value={draft.businessName} />
          <Field label="Business type" value={draft.businessType} />
        </div>
      </ReviewCard>

      <ReviewCard icon={Briefcase} title="Agent Role" stepKey="agentPurpose" flow={flow} onEdit={onEdit}>
        <Field label="Primary purpose" value={draft.agentPurpose} />
        <Field label="Services" value={draft.services} />
        <Field label="Escalation behavior" value={draft.escalationInstructions} />
      </ReviewCard>

      <ReviewCard icon={MessageCircle} title="Communication" stepKey="tone" flow={flow} onEdit={onEdit}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tone" value={draft.tone} />
          <Field label="Languages" value={draft.languages} />
          <Field label="Voice" value={draft.selectedVoiceName} />
        </div>
        <div className="border-t border-line/70 pt-4">
          <Field label="Opening message" value={draft.firstMessage} />
        </div>
      </ReviewCard>

      <SystemPromptPreview prompt={draft.generatedSystemPrompt} />
    </div>
  );
}
