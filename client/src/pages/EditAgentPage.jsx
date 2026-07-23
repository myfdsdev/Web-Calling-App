import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, Check, Info, Play, Pause } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';
import { FullPageLoader } from '../components/common/FullPageLoader.jsx';
import { useAgent, useUpdateAgent } from '../hooks/useAgents.js';
import { agentBuilderService } from '../services/agentBuilderService.js';
import { useAudioPreview } from '../hooks/useAudioPreview.js';
import { cn } from '../lib/cn.js';

const TONE_OPTIONS = ['Friendly', 'Professional', 'Warm', 'Confident', 'Calm', 'Energetic'];
const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Spanish', 'French'];

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
                playingId === v.id ? 'border-primary bg-primary text-white' : 'border-line text-ink-soft'
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

export default function EditAgentPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useAgent(agentId);
  const { data: voiceData } = useQuery({
    queryKey: ['voices'],
    queryFn: () => agentBuilderService.getVoices(),
    staleTime: Infinity,
  });
  const updateAgent = useUpdateAgent();

  const agent = data?.agent;
  const [form, setForm] = useState(null);

  // Initialize the form once the agent loads.
  useMemo(() => {
    if (agent && !form) {
      setForm({
        name: agent.name || '',
        businessName: agent.businessName || '',
        businessType: agent.businessType || '',
        purpose: agent.purpose || '',
        servicesText: (agent.services || []).join('\n'),
        tone: agent.tone || [],
        languages: agent.languages || [],
        firstMessage: agent.firstMessage || '',
        escalationInstructions: agent.escalationInstructions || '',
        selectedVoiceId: agent.voiceId || '',
      });
    }
  }, [agent]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || !form) return <FullPageLoader inline label="Loading agent…" />;
  if (isError || !agent) {
    return (
      <PageContainer animate={false}>
        <ErrorState title="Agent not found" onRetry={refetch} />
      </PageContainer>
    );
  }

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const onSave = async () => {
    if (!form.name.trim()) {
      toast.error('Agent name is required.');
      return;
    }
    const updates = {
      name: form.name.trim(),
      businessName: form.businessName.trim(),
      businessType: form.businessType.trim(),
      purpose: form.purpose.trim(),
      services: form.servicesText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
      tone: form.tone,
      languages: form.languages,
      firstMessage: form.firstMessage.trim(),
      escalationInstructions: form.escalationInstructions.trim(),
      selectedVoiceId: form.selectedVoiceId,
    };
    try {
      await updateAgent.mutateAsync({ id: agent.id, updates });
      toast.success('Agent updated — Vapi assistant synced.');
      navigate(`/agents/${agent.id}`);
    } catch (err) {
      toast.error(err.normalizedMessage || 'Could not update the agent.');
    }
  };

  const voices = voiceData?.voices || [];

  return (
    <PageContainer>
      <Link
        to={`/agents/${agent.id}`}
        className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to details
      </Link>

      <div className="mb-8">
        <h1 className="text-[26px] font-bold tracking-tight text-ink md:text-[32px]">Edit {agent.name}</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Update your agent’s details. Saving keeps the same Vapi assistant and re-syncs its
          configuration.
        </p>
      </div>

      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-5">
        <Card className="p-6">
          <h3 className="mb-4 text-card-title font-semibold text-ink">Identity</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Agent name" value={form.name} onChange={(e) => set({ name: e.target.value })} />
            <Input label="Business name" value={form.businessName} onChange={(e) => set({ businessName: e.target.value })} />
            <Input label="Business type" value={form.businessType} onChange={(e) => set({ businessType: e.target.value })} />
            <Input label="Primary purpose" value={form.purpose} onChange={(e) => set({ purpose: e.target.value })} />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 text-card-title font-semibold text-ink">Knowledge</h3>
          <Textarea
            label="Services (one per line)"
            value={form.servicesText}
            onChange={(e) => set({ servicesText: e.target.value })}
            placeholder={'Property buying\nRentals\nSite visits'}
          />
        </Card>

        <Card className="p-6">
          <h3 className="mb-2 text-card-title font-semibold text-ink">Communication</h3>
          <p className="mb-2 text-[13px] font-semibold text-ink">Tone (up to 3)</p>
          <ChipMulti options={TONE_OPTIONS} value={form.tone} onChange={(tone) => set({ tone })} max={3} />
          <p className="mb-2 mt-5 text-[13px] font-semibold text-ink">Languages</p>
          <ChipMulti options={LANGUAGE_OPTIONS} value={form.languages} onChange={(languages) => set({ languages })} />
          <div className="mt-5">
            <Textarea
              label="Opening message"
              value={form.firstMessage}
              onChange={(e) => set({ firstMessage: e.target.value })}
            />
          </div>
          <div className="mt-4">
            <Textarea
              label="Escalation behavior"
              value={form.escalationInstructions}
              onChange={(e) => set({ escalationInstructions: e.target.value })}
            />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 text-card-title font-semibold text-ink">Voice</h3>
          <VoicePicker voices={voices} value={form.selectedVoiceId} onChange={(selectedVoiceId) => set({ selectedVoiceId })} />
        </Card>

        <div className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4 shadow-card">
          <p className="flex items-center gap-2 text-[13px] text-ink-soft">
            <Info className="h-4 w-4 text-primary" />
            The system prompt is regenerated automatically from these details.
          </p>
          <div className="flex gap-2.5">
            <Button variant="ghost" onClick={() => navigate(`/agents/${agent.id}`)}>
              Cancel
            </Button>
            <Button onClick={onSave} loading={updateAgent.isPending}>
              <Check className="h-4 w-4" />
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
