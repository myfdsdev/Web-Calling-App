import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button.jsx';

function AnimatedOrb() {
  return (
    <div className="relative flex h-40 w-40 items-center justify-center" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border border-primary/30"
          style={{ width: 70 + i * 40, height: 70 + i * 40 }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 3 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
        />
      ))}
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] shadow-lg">
        <div className="flex items-end gap-1">
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 rounded-full bg-primary"
              animate={{ height: [8, 22, 8] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.12 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeroBanner() {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 md:p-8"
      style={{ background: 'radial-gradient(600px 200px at 15% 0%, rgba(255,255,255,0.06), transparent), #0B0B0D' }}
    >
      <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-ink">
            <Sparkles className="h-3.5 w-3.5" />
            AI Web Agent Builder
          </span>
          <h2 className="mt-4 text-[24px] font-bold leading-tight text-ink md:text-[28px]">
            Build your next voice agent through conversation
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-soft md:text-[15px]">
            Answer a few simple questions and let AI create your agent instructions, greeting, voice
            setup and business configuration.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={() => navigate('/agents/create')}>
              Create Voice Agent
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate('/agents')}>
              View Agents
            </Button>
          </div>
        </div>
        <div className="hidden flex-none md:block">
          <AnimatedOrb />
        </div>
      </div>
    </motion.div>
  );
}
