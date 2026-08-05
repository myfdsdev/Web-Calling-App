import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  KeyRound,
  Eye,
  EyeOff,
  Check,
  ExternalLink,
  ShieldCheck,
  Trash2,
  Phone,
  Sparkles,
} from 'lucide-react';
import { Dialog, DialogClose } from '../ui/Dialog.jsx';
import { Button } from '../ui/Button.jsx';
import { useApiKeys, useSaveApiKeys, useClearApiKey } from '../../hooks/useApiKeys.js';
import { cn } from '../../lib/cn.js';

/** A single labelled field; `secret` renders a password input with a reveal toggle. */
function Field({ label, value, onChange, placeholder, secret, hint, help }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[13px] font-semibold text-ink">{label}</label>
        {hint && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
            <Check className="h-3 w-3" />
            Saved {hint}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          type={secret && !show ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            'h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-ink-faint',
            'transition-all duration-150 focus:border-primary focus:shadow-focus-ring focus:outline-none',
            secret && 'pr-11 font-mono'
          )}
        />
        {secret && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-soft hover:bg-white/[0.06] hover:text-ink"
            aria-label={show ? 'Hide' : 'Show'}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {help && <p className="mt-1.5 text-[12px] text-ink-soft">{help}</p>}
    </div>
  );
}

function ProviderHeader({ icon: Icon, title, subtitle, configured, onRemove, removing }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-ink-soft">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[14px] font-semibold text-ink">{title}</p>
          <p className="text-[12px] text-ink-soft">{subtitle}</p>
        </div>
      </div>
      {configured && onRemove && (
        <button
          onClick={onRemove}
          disabled={removing}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-ink-soft transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove
        </button>
      )}
    </div>
  );
}

/**
 * Configure a workspace's own Vapi + Gemini keys (BYOK). Secrets are never
 * pre-filled — the server only tells us whether each key is set (masked hint).
 * Reused for the post-signup onboarding popup and the settings entry point.
 */
export function ApiKeysDialog({ open, onClose, workspaceId, canManage = true, onboarding = false }) {
  const { data, isLoading } = useApiKeys(workspaceId, open);
  const save = useSaveApiKeys(workspaceId);
  const clear = useClearApiKey(workspaceId);
  const status = data?.apiKeys;

  const [form, setForm] = useState({
    vapiPrivateKey: '',
    vapiPublicKey: '',
    geminiApiKey: '',
    geminiModel: '',
  });

  // Prefill the non-secret fields (public key, model) once status loads.
  useEffect(() => {
    if (!status) return;
    setForm((f) => ({
      ...f,
      vapiPublicKey: status.vapi.publicKey || '',
      geminiModel: status.gemini.model || '',
    }));
  }, [status]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const payload = {};
    if (form.vapiPrivateKey.trim()) payload.vapiPrivateKey = form.vapiPrivateKey.trim();
    if (form.geminiApiKey.trim()) payload.geminiApiKey = form.geminiApiKey.trim();
    // Non-secret fields: send when changed (so edits AND clears both apply).
    if (form.vapiPublicKey !== (status?.vapi.publicKey || '')) payload.vapiPublicKey = form.vapiPublicKey.trim();
    if (form.geminiModel !== (status?.gemini.model || '')) payload.geminiModel = form.geminiModel.trim();

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    save.mutate(payload, {
      onSuccess: () => setForm((f) => ({ ...f, vapiPrivateKey: '', geminiApiKey: '' })),
    });
  };

  const vapiReady = status?.vapi.configured && status?.vapi.publicKeySet;
  const bothReady = vapiReady && status?.gemini.configured;

  return (
    <Dialog open={open} onClose={onClose} className="max-w-xl" labelledBy="api-keys-title" closeOnBackdrop={!onboarding}>
      <div className="max-h-[88vh] overflow-y-auto p-6">
        <DialogClose onClose={onClose} />

        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h3 id="api-keys-title" className="text-card-title font-semibold text-ink">
              {onboarding ? 'Connect your API keys' : 'API keys'}
            </h3>
            <p className="text-[12px] text-ink-soft">
              ringwebai runs on <span className="font-semibold text-ink">your own</span> Vapi &amp; Gemini
              accounts — usage is billed to you by those providers.
            </p>
          </div>
        </div>

        {bothReady && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-success/25 bg-success/[0.08] px-4 py-3 text-[13px] text-ink">
            <ShieldCheck className="h-4 w-4 flex-none text-success" />
            Your workspace is fully connected and ready to build agents.
          </div>
        )}

        {!canManage ? (
          <div className="rounded-xl border border-line bg-surface px-4 py-6 text-center text-sm text-ink-soft">
            Only the workspace owner or an admin can manage API keys.
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-white/[0.03]" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Vapi */}
            <section className="rounded-2xl border border-line bg-surface p-4">
              <ProviderHeader
                icon={Phone}
                title="Vapi (voice)"
                subtitle="Powers your voice agents & web calling."
                configured={status?.vapi.configured}
                onRemove={() => clear.mutate('vapi')}
                removing={clear.isPending}
              />
              <div className="mt-4 space-y-4">
                <Field
                  label="Private API key"
                  secret
                  value={form.vapiPrivateKey}
                  onChange={set('vapiPrivateKey')}
                  placeholder={status?.vapi.configured ? 'Enter a new key to replace' : 'vapi_private_...'}
                  hint={status?.vapi.configured ? status.vapi.hint : ''}
                />
                <Field
                  label="Public key"
                  value={form.vapiPublicKey}
                  onChange={set('vapiPublicKey')}
                  placeholder="vapi_public_..."
                  help="Browser-safe key used to start web calls."
                />
              </div>
              <a
                href="https://dashboard.vapi.ai/org/api-keys"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"
              >
                Get your Vapi keys <ExternalLink className="h-3 w-3" />
              </a>
            </section>

            {/* Gemini */}
            <section className="rounded-2xl border border-line bg-surface p-4">
              <ProviderHeader
                icon={Sparkles}
                title="Google Gemini (AI)"
                subtitle="Writes prompts & powers the chat widget."
                configured={status?.gemini.configured}
                onRemove={() => clear.mutate('gemini')}
                removing={clear.isPending}
              />
              <div className="mt-4 space-y-4">
                <Field
                  label="API key"
                  secret
                  value={form.geminiApiKey}
                  onChange={set('geminiApiKey')}
                  placeholder={status?.gemini.configured ? 'Enter a new key to replace' : 'AIza...'}
                  hint={status?.gemini.configured ? status.gemini.hint : ''}
                />
                <Field
                  label="Model (optional)"
                  value={form.geminiModel}
                  onChange={set('geminiModel')}
                  placeholder="gemini-2.0-flash"
                  help="Leave blank to use the default."
                />
              </div>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"
              >
                Get your Gemini key <ExternalLink className="h-3 w-3" />
              </a>
            </section>

            <div className="flex items-center justify-end gap-2">
              {onboarding && (
                <Button variant="ghost" onClick={onClose}>
                  I’ll do this later
                </Button>
              )}
              <Button onClick={submit} loading={save.isPending}>
                Save keys
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
