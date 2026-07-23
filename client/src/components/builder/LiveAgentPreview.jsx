import { motion } from 'framer-motion';
import { Building2, Target, Sparkles, Languages, Mic, MessageSquare } from 'lucide-react';
import { AgentAvatar } from '../ui/Avatar.jsx';
import { Badge } from '../ui/Badge.jsx';
import { CircularProgress } from '../ui/ProgressBar.jsx';

function AnimatedValue({ value, empty = 'Not added yet' }) {
  const has = Array.isArray(value) ? value.length > 0 : Boolean(value);
  const display = Array.isArray(value) ? value.join(', ') : value;
  // Keyed re-mount: when the value changes React swaps the element and the
  // enter animation replays (fade + slide up). Robust under StrictMode.
  return (
    <motion.p
      key={has ? String(display) : 'empty'}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={has ? 'text-sm font-medium text-ink' : 'text-sm italic text-ink-soft'}
    >
      {has ? display : empty}
    </motion.p>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-white/[0.06] text-ink-soft">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
        <div className="mt-0.5 break-words">
          <AnimatedValue value={value} />
        </div>
      </div>
    </div>
  );
}

function MiniWave() {
  return (
    <div className="flex items-end gap-0.5" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="w-1 rounded-full bg-primary"
          animate={{ height: [5, 13, 5] }}
          transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }}
        />
      ))}
    </div>
  );
}

export function LiveAgentPreview({ draft, progress }) {
  const name = draft?.agentName || 'Your Agent';
  const completion = draft?.completionPercentage ?? progress?.completionPercentage ?? 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-line bg-gradient-to-br from-primary-soft/70 to-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AgentAvatar name={name} size="lg" />
            <div>
              <p className="text-[15px] font-bold text-ink">{name}</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge tone="draft">Draft</Badge>
                <MiniWave />
              </div>
            </div>
          </div>
          <CircularProgress value={completion} size={52} stroke={5} />
        </div>
        <p className="mt-3 text-[12px] font-medium text-ink-soft">
          Agent profile {completion}% complete
        </p>
      </div>

      {/* Details */}
      <div className="divide-y divide-line/70 px-5 py-1">
        <Row icon={Building2} label="Business" value={draft?.businessName} />
        <Row icon={Target} label="Purpose" value={draft?.agentPurpose} />
        <Row icon={Sparkles} label="Tone" value={draft?.tone} />
        <Row icon={Languages} label="Language" value={draft?.languages} />
        <Row icon={Mic} label="Selected Voice" value={draft?.selectedVoiceName} />
        <Row icon={MessageSquare} label="Opening Message" value={draft?.firstMessage} />
      </div>
    </div>
  );
}
