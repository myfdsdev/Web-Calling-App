import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Check, Play, Pause, Sparkles, ArrowRight, MessagesSquare } from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { Input, Textarea } from '../ui/Input.jsx';
import { useAudioPreview } from '../../hooks/useAudioPreview.js';
import { cn } from '../../lib/cn.js';

const TONE_OPTIONS = ['Friendly', 'Professional', 'Warm', 'Confident', 'Calm', 'Energetic'];
const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Spanish', 'French'];
const BUSINESS_TYPES = ['Real Estate', 'Dental or Clinic', 'Restaurant', 'Coaching', 'E-commerce', 'Local Service'];
const PURPOSE_OPTIONS = [
  'Customer Support',
  'Lead Qualification',
  'Appointment Booking',
  'Sales Enquiries',
  'General Reception',
];

/** Multi-select chips (tone / languages). */
function ChipMulti({ options, value, onChange, max }) {
  const toggle = (opt) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else if (!max || value.length < max) onChange([...value, opt]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              'rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all',
              active
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-line bg-surface text-ink hover:border-primary/40'
            )}
          >
            {active && <Check className="mr-1 inline h-3.5 w-3.5" />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/** Single-select suggestion chips that fill a text field. */
function SuggestChips({ options, value, onPick }) {
  return (
    <div className="mb-2.5 flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onPick(opt)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-all',
              active
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-line bg-surface text-ink-soft hover:border-primary/40 hover:text-ink'
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/** Voice cards with inline preview. */
function VoicePicker({ voices, value, onChange }) {
  const { play, playingId } = useAudioPreview();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {voices.map((v) => {
        const active = value === v.voiceId;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(v.voiceId)}
            className={cn(
              'relative flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all',
              active ? 'border-2 border-primary bg-primary-soft/60' : 'border-line bg-surface hover:border-primary/40'
            )}
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-sm font-bold text-ink">
              {v.name.slice(0, 2)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{v.name}</p>
              <p className="truncate text-[12px] text-ink-soft">{v.type}</p>
            </div>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                play(v);
              }}
              className={cn(
                'flex h-8 w-8 flex-none items-center justify-center rounded-lg border',
                playingId === v.id ? 'border-primary bg-primary text-[#0A0A0A]' : 'border-line text-ink-soft'
              )}
            >
              {playingId === v.id ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Manual agent builder — the alternative to the conversational chatbot. Users
 * fill in every detail themselves; submitting takes them to the same review
 * screen the chat flow ends on.
 */
export function ManualAgentForm({ voices, submitting, onSubmit, onSwitchToChat }) {
  const [form, setForm] = useState({
    agentName: '',
    businessName: '',
    businessType: '',
    agentPurpose: '',
    servicesText: '',
    tone: [],
    languages: ['English'],
    firstMessage: '',
    escalationInstructions: '',
    selectedVoiceId: '',
  });

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const suggestGreeting = () => {
    const biz = form.businessName.trim() || 'our company';
    const name = form.agentName.trim() || 'your assistant';
    set({ firstMessage: `Hello, thanks for calling ${biz}! This is ${name}. How can I help you today?` });
  };

  const submit = () => {
    const missing = [];
    if (!form.agentName.trim()) missing.push('agent name');
    if (!form.businessName.trim()) missing.push('business name');
    if (!form.businessType.trim()) missing.push('business type');
    if (!form.agentPurpose.trim()) missing.push('purpose');
    if (!form.tone.length) missing.push('tone');
    if (!form.languages.length) missing.push('language');
    if (!form.firstMessage.trim()) missing.push('opening message');
    if (!form.selectedVoiceId) missing.push('voice');
    if (missing.length) {
      toast.error(`Please fill in: ${missing.join(', ')}.`);
      return;
    }
    onSubmit({
      agentName: form.agentName.trim(),
      businessName: form.businessName.trim(),
      businessType: form.businessType.trim(),
      agentPurpose: form.agentPurpose.trim(),
      services: form.servicesText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
      tone: form.tone,
      languages: form.languages,
      firstMessage: form.firstMessage.trim(),
      escalationInstructions: form.escalationInstructions.trim(),
      selectedVoiceId: form.selectedVoiceId,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto grid max-w-3xl grid-cols-1 gap-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-section font-bold text-ink">Fill in the details</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Enter everything yourself, then review and create.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onSwitchToChat} disabled={submitting}>
          <MessagesSquare className="h-4 w-4" />
          Build with chat instead
        </Button>
      </div>

      {/* Identity */}
      <Card className="p-6">
        <h3 className="mb-4 text-card-title font-semibold text-ink">Identity</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Agent name"
            placeholder="e.g. Emma"
            value={form.agentName}
            onChange={(e) => set({ agentName: e.target.value })}
          />
          <Input
            label="Business name"
            placeholder="e.g. Green Valley Real Estate"
            value={form.businessName}
            onChange={(e) => set({ businessName: e.target.value })}
          />
        </div>
        <div className="mt-4">
          <p className="mb-2 text-[13px] font-semibold text-ink">Business type</p>
          <SuggestChips options={BUSINESS_TYPES} value={form.businessType} onPick={(v) => set({ businessType: v })} />
          <Input
            placeholder="e.g. Real Estate"
            value={form.businessType}
            onChange={(e) => set({ businessType: e.target.value })}
          />
        </div>
        <div className="mt-4">
          <p className="mb-2 text-[13px] font-semibold text-ink">Primary purpose</p>
          <SuggestChips options={PURPOSE_OPTIONS} value={form.agentPurpose} onPick={(v) => set({ agentPurpose: v })} />
          <Input
            placeholder="What should this agent mainly help callers with?"
            value={form.agentPurpose}
            onChange={(e) => set({ agentPurpose: e.target.value })}
          />
        </div>
      </Card>

      {/* Knowledge */}
      <Card className="p-6">
        <h3 className="mb-4 text-card-title font-semibold text-ink">Knowledge</h3>
        <Textarea
          label="Services (one per line)"
          value={form.servicesText}
          onChange={(e) => set({ servicesText: e.target.value })}
          placeholder={'Property buying & selling\nRentals\nSite visits & valuations'}
        />
      </Card>

      {/* Communication */}
      <Card className="p-6">
        <h3 className="mb-2 text-card-title font-semibold text-ink">Communication</h3>
        <p className="mb-2 text-[13px] font-semibold text-ink">Tone (up to 3)</p>
        <ChipMulti options={TONE_OPTIONS} value={form.tone} onChange={(tone) => set({ tone })} max={3} />

        <p className="mb-2 mt-5 text-[13px] font-semibold text-ink">Languages</p>
        <ChipMulti options={LANGUAGE_OPTIONS} value={form.languages} onChange={(languages) => set({ languages })} />

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink">Opening message</span>
            <button
              type="button"
              onClick={suggestGreeting}
              className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-soft hover:text-ink"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Suggest
            </button>
          </div>
          <Textarea
            value={form.firstMessage}
            onChange={(e) => set({ firstMessage: e.target.value })}
            placeholder="The first thing callers hear when they connect."
          />
        </div>

        <div className="mt-4">
          <Textarea
            label="If a caller needs a human (optional)"
            value={form.escalationInstructions}
            onChange={(e) => set({ escalationInstructions: e.target.value })}
            placeholder="e.g. Collect the caller's name and number so the team can follow up."
          />
        </div>
      </Card>

      {/* Voice */}
      <Card className="p-6">
        <h3 className="mb-4 text-card-title font-semibold text-ink">Voice</h3>
        {voices.length ? (
          <VoicePicker
            voices={voices}
            value={form.selectedVoiceId}
            onChange={(selectedVoiceId) => set({ selectedVoiceId })}
          />
        ) : (
          <p className="text-sm text-ink-soft">Loading voices…</p>
        )}
      </Card>

      {/* Actions */}
      <div className="sticky bottom-4 flex items-center justify-between gap-2.5 rounded-2xl border border-line bg-surface/95 p-4 shadow-card backdrop-blur">
        <p className="hidden text-[13px] text-ink-soft sm:block">
          You can fine-tune everything on the next screen.
        </p>
        <Button onClick={submit} loading={submitting} className="ml-auto">
          Continue to review
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </motion.div>
  );
}
