import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { cn } from '../../lib/cn.js';
import { useAudioPreview } from '../../hooks/useAudioPreview.js';

function VoiceCard({ voice, selected, onSelect, onPreview, playing }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Select ${voice.name}, ${voice.type}`}
      onClick={() => onSelect(voice)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(voice);
        }
      }}
      className={cn(
        'relative flex min-h-[150px] cursor-pointer flex-col rounded-2xl border p-[18px] transition-all duration-150 focus-ring',
        selected
          ? 'border-2 border-primary bg-primary-soft/60'
          : 'border border-line bg-surface hover:border-primary/40 hover:shadow-card'
      )}
    >
      {selected && (
        <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-sm font-bold text-ink">
          {voice.name.slice(0, 2)}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ink">{voice.name}</p>
          <p className="text-[12px] text-ink-soft">{voice.type}</p>
        </div>
      </div>
      <p className="mt-3 flex-1 text-[13px] leading-relaxed text-ink-soft">{voice.description}</p>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {voice.languages.map((l) => (
            <span key={l} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-ink-soft">
              {l}
            </span>
          ))}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreview(voice);
          }}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
            playing
              ? 'border-primary bg-primary text-white'
              : 'border-line bg-surface text-ink-soft hover:border-primary hover:text-primary'
          )}
          aria-label={playing ? 'Stop preview' : 'Play preview'}
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
      </div>
    </motion.div>
  );
}

export function VoiceSelectionGrid({ voices, disabled, onConfirm, selectedVoiceId }) {
  const { play, playingId, supported } = useAudioPreview();
  const [selected, setSelected] = useState(
    voices.find((v) => v.voiceId === selectedVoiceId)?.id || null
  );

  const selectedVoice = voices.find((v) => v.id === selected);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {voices.map((voice) => (
          <VoiceCard
            key={voice.id}
            voice={voice}
            selected={selected === voice.id}
            playing={playingId === voice.id}
            onSelect={(v) => setSelected(v.id)}
            onPreview={play}
          />
        ))}
      </div>
      {!supported && (
        <p className="flex items-center gap-1.5 text-xs text-ink-soft">
          <Volume2 className="h-3.5 w-3.5" />
          Voice preview isn’t available in this browser, but you can still select a voice.
        </p>
      )}
      <div className="flex justify-end">
        <Button
          disabled={disabled || !selectedVoice}
          onClick={() => onConfirm(selectedVoice)}
        >
          {selectedVoice ? `Use ${selectedVoice.name}` : 'Select a voice'}
        </Button>
      </div>
    </div>
  );
}
