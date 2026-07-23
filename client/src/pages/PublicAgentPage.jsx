import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ShieldOff, PackageOpen } from 'lucide-react';
import { publicService } from '../services/vapiService.js';
import { ChatWidget } from '../components/public/ChatWidget.jsx';
import { FullPageLoader } from '../components/common/FullPageLoader.jsx';
import { withPageDefaults } from '../utils/pageSettings.js';
import { hexAlpha } from '../utils/agentHelpers.js';
import { cn } from '../lib/cn.js';

const SOCIALS = ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok'];

/** Inject owner-provided custom code (pixels/scripts), re-executing <script>s. */
function injectCode(code, target) {
  if (!code || !code.trim()) return () => {};
  const holder = document.createElement('div');
  holder.innerHTML = code;
  const added = [];
  Array.from(holder.childNodes).forEach((node) => {
    let el = node;
    if (node.tagName === 'SCRIPT') {
      el = document.createElement('script');
      Array.from(node.attributes).forEach((a) => el.setAttribute(a.name, a.value));
      el.text = node.textContent || '';
    }
    target.appendChild(el);
    added.push(el);
  });
  return () => added.forEach((n) => n.remove());
}

function Unavailable() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0b14] px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-white/60">
          <ShieldOff className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-white">Page not available</h1>
        <p className="mt-2 text-sm text-white/60">
          This page doesn’t exist or hasn’t been published. Check the link and try again.
        </p>
      </div>
    </div>
  );
}

export default function PublicAgentPage() {
  const { publicId } = useParams();
  const [chatOpen, setChatOpen] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-agent', publicId],
    queryFn: () => publicService.getAgent(publicId),
    retry: false,
  });

  const agent = data?.agent;
  const ps = agent ? withPageDefaults(agent.pageSettings) : null;

  // Owner custom code (head + body).
  useEffect(() => {
    if (!ps) return undefined;
    const cleanHead = injectCode(ps.customCode.headCode, document.head);
    const cleanBody = injectCode(ps.customCode.bodyCode, document.body);
    return () => {
      cleanHead();
      cleanBody();
    };
  }, [ps?.customCode?.headCode, ps?.customCode?.bodyCode]);

  if (isLoading) return <FullPageLoader label="Loading…" />;
  if (isError || !agent) return <Unavailable />;

  const hero = ps.hero;
  const op = Math.max(0, Math.min(100, Number(hero.opacity) || 0)) / 100;
  const usingImage = hero.background === 'image' && hero.backgroundImage;
  const heroBg = usingImage
    ? {
        backgroundImage: `linear-gradient(rgba(9,9,18,${1 - op}), rgba(9,9,18,${1 - op})), url(${hero.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : hero.background === 'solid'
      ? { background: hexAlpha(hero.startColor, op) }
      : { background: `linear-gradient(135deg, ${hexAlpha(hero.startColor, op)}, ${hexAlpha(hero.endColor, op)})` };

  const align =
    hero.alignment === 'left'
      ? 'items-start text-left'
      : hero.alignment === 'right'
        ? 'items-end text-right'
        : 'items-center text-center';

  const headline = hero.headline || agent.businessName || agent.name;
  const ctaText = hero.primaryCta || `Chat with ${agent.name}`;

  return (
    <div className="min-h-screen bg-[#0b0b14] text-white">
      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8">
        {hero.storeLogo ? (
          <img src={hero.storeLogo} alt="" className="h-8 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
        ) : (
          <span className="text-lg font-bold tracking-tight">{agent.name}</span>
        )}
        {agent.voiceName && (
          <span className="rounded-full border border-white/15 px-3 py-1 text-[12px] font-medium text-white/70">
            {agent.voiceName} voice
          </span>
        )}
      </header>

      {/* HERO */}
      {hero.enabled && (
        <section style={heroBg} className="relative overflow-hidden">
          <div className={cn('mx-auto flex min-h-[62vh] max-w-4xl flex-col justify-center gap-5 px-6 py-20', align)}>
            {hero.badge && (
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[13px] font-semibold backdrop-blur"
              >
                {hero.badge}
              </motion.span>
            )}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-5xl font-extrabold uppercase tracking-tight sm:text-6xl"
            >
              {headline}
            </motion.h1>
            {hero.subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="max-w-xl text-lg text-white/70"
              >
                {hero.subtitle}
              </motion.p>
            )}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className={cn('mt-2 flex flex-wrap gap-3', hero.alignment === 'center' && 'justify-center')}
            >
              <button
                onClick={() => setChatOpen(true)}
                className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-600 px-7 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.03]"
              >
                {ctaText}
              </button>
              {hero.secondaryCta && (
                <button
                  onClick={() => setChatOpen(true)}
                  className="rounded-full border border-white/25 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  {hero.secondaryCta}
                </button>
              )}
            </motion.div>
          </div>
        </section>
      )}

      {/* PRODUCTS / listings */}
      {ps.products.enabled && (
        <section className="mx-auto max-w-4xl px-6 py-16">
          {ps.products.title && (
            <h2 className="mb-8 text-center text-2xl font-bold text-white">{ps.products.title}</h2>
          )}
          <div className="flex flex-col items-center rounded-3xl border border-white/10 bg-white/[0.02] py-16 text-center">
            <PackageOpen className="h-10 w-10 text-white/30" />
            <p className="mt-4 text-lg font-semibold text-white/70">No listings yet</p>
            <p className="mt-1 text-sm text-white/40">This store hasn’t published any deals.</p>
          </div>
        </section>
      )}

      {/* FOOTER */}
      {ps.footer.enabled && (
        <footer className="border-t border-white/10 px-6 py-10">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center">
            {ps.footer.logo ? (
              <img src={ps.footer.logo} alt="" className="h-7 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
            ) : null}
            {ps.footer.text && <p className="text-sm text-white/50">{ps.footer.text}</p>}
            <div className="flex flex-wrap justify-center gap-2">
              {SOCIALS.filter((s) => ps.footer.social[s]).map((s) => (
                <a
                  key={s}
                  href={ps.footer.social[s]}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/15 px-3.5 py-1.5 text-[12px] font-semibold capitalize text-white/60 transition-colors hover:border-white/30 hover:text-white"
                >
                  {s}
                </a>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-white/30">
              Powered by{' '}
              <Link to="/" className="font-semibold text-white/60 hover:text-white">
                Vox
              </Link>
            </p>
          </div>
        </footer>
      )}

      {/* Chat + call widget */}
      <ChatWidget agent={agent} publicKey={data.vapiPublicKey} open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
}
