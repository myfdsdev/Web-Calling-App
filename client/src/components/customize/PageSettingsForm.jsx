import { useRef } from 'react';
import { toast } from 'sonner';
import { Bot, FolderOpen, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { Input, Textarea } from '../ui/Input.jsx';
import { cn } from '../../lib/cn.js';

// Shared shape/merge live in utils so the public page can reuse them without
// pulling this admin form into its bundle. Re-exported for existing imports.
export { DEFAULT_PAGE_SETTINGS, withPageDefaults } from '../../utils/pageSettings.js';
import { widgetBackground, ctaStyle, callStyle } from '../../utils/pageSettings.js';

function Field({ label, hint, children }) {
  return (
    <div>
      {label && (
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      )}
      {children}
      {hint && <p className="mt-1.5 text-[12px] text-ink-soft">{hint}</p>}
    </div>
  );
}

/**
 * Shrink a picked image to an avatar-sized square-ish thumbnail. Any photo is
 * accepted — it's downscaled and compressed in the browser, so we never have to
 * reject a file for being too large. WebP first (small + keeps transparency),
 * PNG as the fallback for browsers without WebP encoding.
 */
function downscaleImage(file, max = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode failed'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        let out = canvas.toDataURL('image/webp', 0.9);
        if (!out.startsWith('data:image/webp')) out = canvas.toDataURL('image/png');
        resolve(out);
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

/** URL input + Browse (local file is resized in-browser, then embedded). */
function BrowseInput({ value = '', onChange, placeholder }) {
  const fileRef = useRef(null);
  const isData = value.startsWith('data:');

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    // Guard against decoding an absurd file and freezing the tab.
    if (file.size > 15 * 1024 * 1024) {
      toast.error('That image is enormous. Please pick one under 15MB.');
      return;
    }
    try {
      onChange(await downscaleImage(file));
    } catch {
      toast.error('Could not read that image. Try a different file.');
    }
  };

  return (
    <div className="flex gap-2">
      {isData ? (
        <div className="flex h-11 flex-1 items-center justify-between rounded-[10px] border border-line bg-surface px-3.5 text-sm text-ink-soft">
          Uploaded image
          <button type="button" onClick={() => onChange('')} className="text-[12px] hover:text-danger">
            Remove
          </button>
        </div>
      ) : (
        <Input className="flex-1" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
        <FolderOpen className="h-4 w-4" />
        Browse
      </Button>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 flex-none cursor-pointer rounded-lg border border-line bg-surface p-1"
          aria-label={label}
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono" />
      </div>
    </div>
  );
}

/** How the widget will introduce itself to visitors. */
function WidgetPreview({ image, name, role, description, widget }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line" style={widgetBackground(widget)}>
      <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
        <span className="relative flex h-20 w-20 flex-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500/40 to-fuchsia-500/30 ring-1 ring-white/20">
          {image ? (
            <img
              src={image}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          ) : (
            <Sparkles className="h-8 w-8 text-white" />
          )}
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0b0b14] bg-emerald-400" />
        </span>
        <div>
          <p className="text-[17px] font-bold tracking-tight text-white">{name || 'Your agent'}</p>
          {role && (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/90">{role}</p>
          )}
          {description ? (
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-white/60">{description}</p>
          ) : (
            <p className="mt-1.5 text-[13px] italic text-white/30">Add a short description…</p>
          )}
        </div>
        <span className="mt-1 rounded-full bg-white/10 px-4 py-2 text-[12px] font-semibold text-white/70">
          Type your reply…
        </span>
      </div>
    </div>
  );
}

/**
 * Settings for the public agent page — which is just the chat/call widget.
 */
export function PageSettingsForm({ value, onChange, storeName }) {
  const w = value.chatWidget;
  const setWidget = (patch) => onChange({ ...value, chatWidget: { ...w, ...patch } });

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white/[0.06] text-ink-soft">
          <Bot className="h-5 w-5" />
        </span>
        <div>
          <p className="text-card-title font-semibold text-ink">Chat Widget</p>
          <p className="text-[12px] text-ink-soft">What visitors see when they open your agent</p>
        </div>
      </div>

      <div className="space-y-5 border-t border-line/70 px-5 py-5 sm:px-6">
        <Field
          label="Agent Image"
          hint="Shown at the top of the chat and on the launcher button. Browse to upload any photo (it's resized automatically), or paste a direct image link ending in .png / .jpg. Leave empty for the default avatar."
        >
          <BrowseInput
            value={w.image}
            onChange={(x) => setWidget({ image: x })}
            placeholder="https://example.com/agent.png"
          />
        </Field>

        <Field label="Agent Name" hint="Leave empty to use the agent's own name.">
          <Input
            value={w.name}
            onChange={(e) => setWidget({ name: e.target.value })}
            placeholder={storeName || 'e.g. Krishna Buses Assistant'}
          />
        </Field>

        <Field label="Role" hint="The small line under the name — e.g. “BOOKING ASSISTANT”. Optional.">
          <Input
            value={w.role}
            onChange={(e) => setWidget({ role: e.target.value })}
            placeholder="e.g. Booking Assistant"
          />
        </Field>

        <Field
          label="Agent Description"
          hint="One or two lines telling visitors what this agent can help with."
        >
          <Textarea
            value={w.description}
            onChange={(e) => setWidget({ description: e.target.value })}
            className={cn('min-h-[80px]')}
            placeholder="e.g. I can check bus timings, book tickets and answer questions about your trip."
          />
        </Field>

        <Field label="Background Gradient" hint="Used on the welcome screen and behind the chat.">
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField label="Start colour" value={w.bgStart} onChange={(x) => setWidget({ bgStart: x })} />
            <ColorField label="End colour" value={w.bgEnd} onChange={(x) => setWidget({ bgEnd: x })} />
          </div>
        </Field>

        {/* Chat button */}
        <Field label="Chat Button">
          <div className="space-y-3">
            <Input
              value={w.ctaLabel}
              onChange={(e) => setWidget({ ctaLabel: e.target.value })}
              placeholder="Start the conversation"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField label="Gradient from" value={w.ctaFrom} onChange={(x) => setWidget({ ctaFrom: x })} />
              <ColorField label="Gradient to" value={w.ctaTo} onChange={(x) => setWidget({ ctaTo: x })} />
            </div>
            <div
              style={ctaStyle(w)}
              className="flex items-center justify-center rounded-full px-6 py-3 text-[14px] font-bold text-white"
            >
              {w.ctaLabel || 'Start the conversation'}
            </div>
          </div>
        </Field>

        {/* Voice-call button */}
        <Field label="Voice Call Button" hint="Also used for the phone button inside the chat.">
          <div className="space-y-3">
            <Input
              value={w.callLabel}
              onChange={(e) => setWidget({ callLabel: e.target.value })}
              placeholder="Start a voice call"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField label="Gradient from" value={w.callFrom} onChange={(x) => setWidget({ callFrom: x })} />
              <ColorField label="Gradient to" value={w.callTo} onChange={(x) => setWidget({ callTo: x })} />
            </div>
            <div
              style={callStyle(w)}
              className="flex items-center justify-center rounded-full px-6 py-3 text-[14px] font-bold text-white"
            >
              {w.callLabel || 'Start a voice call'}
            </div>
          </div>
        </Field>

        <Field label="Preview">
          <WidgetPreview
            image={w.image}
            name={w.name || storeName}
            role={w.role}
            description={w.description}
            widget={w}
          />
        </Field>
      </div>
    </Card>
  );
}
