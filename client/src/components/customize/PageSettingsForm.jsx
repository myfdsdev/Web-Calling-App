import { useRef } from 'react';
import { toast } from 'sonner';
import {
  Image as ImageIcon,
  Package,
  MessageSquare,
  HelpCircle,
  Layers,
  ImagePlus,
  ShieldCheck,
  PanelBottom,
  Code2,
  ToggleRight,
  ToggleLeft,
  FolderOpen,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { Input, Textarea } from '../ui/Input.jsx';
import { hexAlpha } from '../../utils/agentHelpers.js';
import { cn } from '../../lib/cn.js';

// Shared shape/merge live in utils so the public page can reuse them without
// pulling this admin form into its bundle. Re-exported for existing imports.
export { DEFAULT_PAGE_SETTINGS, withPageDefaults } from '../../utils/pageSettings.js';

// ── Small building blocks ────────────────────────────────────────────────────

function EnablePill({ enabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      className={cn(
        'inline-flex flex-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors',
        enabled ? 'border-primary/30 bg-primary-soft text-ink' : 'border-line text-ink-soft hover:text-ink'
      )}
    >
      {enabled ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4" />}
      {enabled ? 'Enabled' : 'Disabled'}
    </button>
  );
}

function SectionShell({ icon: Icon, title, subtitle, enabled, onToggle, children }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white/[0.06] text-ink-soft">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-card-title font-semibold text-ink">{title}</p>
            {subtitle && <p className="text-[12px] text-ink-soft">{subtitle}</p>}
          </div>
        </div>
        {onToggle && <EnablePill enabled={enabled} onToggle={onToggle} />}
      </div>
      {enabled && children && (
        <div className="space-y-5 border-t border-line/70 px-5 py-5 sm:px-6">{children}</div>
      )}
    </Card>
  );
}

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

function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex gap-1 rounded-lg border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
            value === o.value ? 'bg-white/[0.1] text-ink' : 'text-ink-soft hover:text-ink'
          )}
        >
          {o.label}
        </button>
      ))}
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

/** URL input + Browse (local file → data URL for quick previews). */
function BrowseInput({ value = '', onChange, placeholder }) {
  const fileRef = useRef(null);
  const isData = value.startsWith('data:');

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300 * 1024) {
      toast.error('Image is too large (max 300KB). Please paste a hosted URL instead.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result || ''));
    reader.readAsDataURL(file);
    e.target.value = '';
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

// ── Hero live preview ────────────────────────────────────────────────────────

function HeroPreview({ hero, storeName }) {
  const op = Math.max(0, Math.min(100, Number(hero.opacity) || 0)) / 100;
  const usingImage = hero.background === 'image' && hero.backgroundImage;
  const style = usingImage
    ? { backgroundImage: `url(${hero.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : hero.background === 'solid'
      ? { background: hexAlpha(hero.startColor, op) }
      : { background: `linear-gradient(135deg, ${hexAlpha(hero.startColor, op)}, ${hexAlpha(hero.endColor, op)})` };

  const align =
    hero.alignment === 'left'
      ? 'items-start text-left'
      : hero.alignment === 'right'
        ? 'items-end text-right'
        : 'items-center text-center';

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[#0d0d10]">
      <div className={cn('flex min-h-[210px] flex-col justify-center gap-2.5 p-8', align)} style={style}>
        {hero.storeLogo ? (
          <img src={hero.storeLogo} alt="" className="mb-1 h-8 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
        ) : null}
        {hero.badge && (
          <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[11px] font-semibold text-white/90">
            {hero.badge}
          </span>
        )}
        <h3 className="bg-gradient-to-r from-indigo-300 to-sky-300 bg-clip-text text-2xl font-extrabold text-transparent">
          {hero.headline || storeName || 'Your Store'}
        </h3>
        {hero.subtitle && <p className="max-w-md text-sm text-white/70">{hero.subtitle}</p>}
        <div className={cn('mt-2 flex flex-wrap gap-2', hero.alignment === 'center' && 'justify-center')}>
          <span className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-black">
            {hero.primaryCta || 'Browse deals'}
          </span>
          {hero.secondaryCta && (
            <span className="rounded-full border border-white/30 px-4 py-2 text-[13px] font-semibold text-white">
              {hero.secondaryCta}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── The full form ────────────────────────────────────────────────────────────

const SOCIALS = [
  ['facebook', 'Facebook URL'],
  ['instagram', 'Instagram URL'],
  ['twitter', 'Twitter URL'],
  ['linkedin', 'Linkedin URL'],
  ['youtube', 'Youtube URL'],
  ['tiktok', 'Tiktok URL'],
];

export function PageSettingsForm({ value, onChange, storeName }) {
  const v = value;
  // Patch a whole section, or a single field within a section.
  const setSection = (key, patch) => onChange({ ...v, [key]: { ...v[key], ...patch } });
  const hero = v.hero;
  const setHero = (patch) => setSection('hero', patch);

  return (
    <div className="space-y-5">
      {/* HERO */}
      <SectionShell
        icon={ImageIcon}
        title="Hero Section"
        enabled={hero.enabled}
        onToggle={(on) => setHero({ enabled: on })}
      >
        <Field label="Store Logo" hint="Shown in your store's top navigation bar. Leave empty to use your brand logo.">
          <BrowseInput value={hero.storeLogo} onChange={(x) => setHero({ storeLogo: x })} placeholder="https://example.com/logo.png" />
        </Field>

        <Field label="Hero Side Image" hint="A feature image shown beside your hero headline (e.g. a product shot or illustration).">
          <BrowseInput value={hero.heroSideImage} onChange={(x) => setHero({ heroSideImage: x })} placeholder="https://example.com/hero-visual.png" />
        </Field>

        <Segmented
          options={[
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' },
          ]}
          value={hero.alignment}
          onChange={(x) => setHero({ alignment: x })}
        />

        <Field label="Badge">
          <Input value={hero.badge} onChange={(e) => setHero({ badge: e.target.value })} placeholder="The Future of SaaS Ownership" />
        </Field>

        <Field label="Headline & Subtitle">
          <div className="space-y-2.5">
            <Input value={hero.headline} onChange={(e) => setHero({ headline: e.target.value })} placeholder="Welcome to our marketplace" />
            <Input value={hero.subtitle} onChange={(e) => setHero({ subtitle: e.target.value })} placeholder="Discover amazing software deals" />
          </div>
        </Field>

        <Field label="CTA Buttons" hint="The secondary (outlined) button only shows on the full-image hero.">
          <div className="space-y-2.5">
            <Input value={hero.primaryCta} onChange={(e) => setHero({ primaryCta: e.target.value })} placeholder="Primary button (e.g. Connect Wallet)" />
            <Input value={hero.secondaryCta} onChange={(e) => setHero({ secondaryCta: e.target.value })} placeholder="Secondary button — outlined (e.g. Whitelist Now)" />
          </div>
        </Field>

        <Field label="Background">
          <Segmented
            options={[
              { label: 'Gradient', value: 'gradient' },
              { label: 'Solid Color', value: 'solid' },
              { label: 'Image', value: 'image' },
            ]}
            value={hero.background}
            onChange={(x) => setHero({ background: x })}
          />
        </Field>

        {hero.background === 'image' ? (
          <BrowseInput value={hero.backgroundImage} onChange={(x) => setHero({ backgroundImage: x })} placeholder="https://example.com/background.jpg" />
        ) : (
          <div className={cn('grid gap-4', hero.background === 'gradient' ? 'sm:grid-cols-2' : 'sm:grid-cols-1')}>
            <ColorField label="Start Color" value={hero.startColor} onChange={(x) => setHero({ startColor: x })} />
            {hero.background === 'gradient' && (
              <ColorField label="End Color" value={hero.endColor} onChange={(x) => setHero({ endColor: x })} />
            )}
          </div>
        )}

        <Field>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">Background Opacity</span>
            <span className="text-[13px] font-semibold text-primary">{hero.opacity}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={hero.opacity}
            onChange={(e) => setHero({ opacity: Number(e.target.value) })}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-white"
          />
        </Field>

        <Field label="Live Preview">
          <HeroPreview hero={hero} storeName={storeName} />
        </Field>
      </SectionShell>

      {/* PRODUCT SECTIONS */}
      <SectionShell
        icon={Package}
        title="Product Sections"
        enabled={v.products.enabled}
        onToggle={(on) => setSection('products', { enabled: on })}
      >
        <Field label="Section Title">
          <Input value={v.products.title} onChange={(e) => setSection('products', { title: e.target.value })} placeholder="Featured Deals" />
        </Field>
      </SectionShell>

      {/* TOGGLE-ONLY SECTIONS */}
      <SectionShell icon={MessageSquare} title="Testimonials" enabled={v.testimonials.enabled} onToggle={(on) => setSection('testimonials', { enabled: on })} />
      <SectionShell icon={HelpCircle} title="FAQ Section" enabled={v.faq.enabled} onToggle={(on) => setSection('faq', { enabled: on })} />
      <SectionShell icon={Layers} title="Custom Section Boxes" enabled={v.customBoxes.enabled} onToggle={(on) => setSection('customBoxes', { enabled: on })} />
      <SectionShell icon={ImagePlus} title="Custom Banner" enabled={v.customBanner.enabled} onToggle={(on) => setSection('customBanner', { enabled: on })} />
      <SectionShell icon={ShieldCheck} title="Trust & Policy Badges" enabled={v.trustBadges.enabled} onToggle={(on) => setSection('trustBadges', { enabled: on })} />

      {/* FOOTER */}
      <SectionShell
        icon={PanelBottom}
        title="Footer"
        enabled={v.footer.enabled}
        onToggle={(on) => setSection('footer', { enabled: on })}
      >
        <Field label="Footer Text">
          <Textarea
            value={v.footer.text}
            onChange={(e) => setSection('footer', { text: e.target.value })}
            className="min-h-[80px]"
            placeholder="© 2025 Your Store. All rights reserved."
          />
        </Field>

        <Field label="Footer Logo (optional — falls back to store logo)">
          <BrowseInput value={v.footer.logo} onChange={(x) => setSection('footer', { logo: x })} placeholder="https://…" />
        </Field>

        <Field label="Social Media Links">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {SOCIALS.map(([key, ph]) => (
              <Input
                key={key}
                value={v.footer.social[key]}
                onChange={(e) => setSection('footer', { social: { ...v.footer.social, [key]: e.target.value } })}
                placeholder={ph}
              />
            ))}
          </div>
        </Field>

        <div className="flex items-center justify-between border-t border-line/70 pt-4">
          <p className="text-[12px] text-ink-soft">Add custom pages (Privacy, Terms…) as footer links.</p>
          <Button type="button" variant="secondary" size="sm">
            <FileText className="h-4 w-4" />
            Add Custom Page
          </Button>
        </div>
      </SectionShell>

      {/* CUSTOM CODE */}
      <SectionShell icon={Code2} title="Custom Code (Pixels & Scripts)" subtitle="FB / Google pixel, analytics, verification tags">
        <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/[0.07] px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-warning" />
          <p className="text-[12.5px] text-ink-soft">
            Paste tracking pixels, analytics, or verification snippets. This code runs on your public
            store — only add code from sources you trust.
          </p>
        </div>

        <Field label="Head Code (e.g. Meta / Google Pixel, GA, verification)">
          <Textarea
            value={v.customCode.headCode}
            onChange={(e) => setSection('customCode', { headCode: e.target.value })}
            className="min-h-[120px] font-mono text-[12.5px]"
            placeholder={'<!-- Meta Pixel, Google Analytics, etc. -->\n<script>...</script>'}
          />
        </Field>

        <Field label="Body Code (loads at end of page — chat widgets, etc.)">
          <Textarea
            value={v.customCode.bodyCode}
            onChange={(e) => setSection('customCode', { bodyCode: e.target.value })}
            className="min-h-[120px] font-mono text-[12.5px]"
            placeholder={'<!-- Chat widget, noscript pixel, etc. -->'}
          />
        </Field>
      </SectionShell>
    </div>
  );
}
