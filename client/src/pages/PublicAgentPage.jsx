import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ShieldOff, MessageSquare, Phone } from 'lucide-react';
import { publicService } from '../services/vapiService.js';
import { ChatWidget, AgentFace } from '../components/public/ChatWidget.jsx';
import { FullPageLoader } from '../components/common/FullPageLoader.jsx';
import { withPageDefaults, widgetBackground, ctaStyle, callStyle } from '../utils/pageSettings.js';

function Unavailable() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0b14] px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-white/60">
          <ShieldOff className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-white">Page not available</h1>
        <p className="mt-2 text-sm text-white/60">
          This agent doesn’t exist or hasn’t been published. Check the link and try again.
        </p>
      </div>
    </div>
  );
}

/**
 * The public agent page — a welcome screen that opens straight into the
 * chat/call widget.
 */
export default function PublicAgentPage() {
  const { publicId } = useParams();
  const [chatOpen, setChatOpen] = useState(false);
  // Set when the visitor picks the call button, so the widget dials on open.
  const [autoCall, setAutoCall] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-agent', publicId],
    queryFn: () => publicService.getAgent(publicId),
    retry: false,
  });

  if (isLoading) return <FullPageLoader label="Loading…" />;
  if (isError || !data?.agent) return <Unavailable />;

  const agent = data.agent;
  const w = withPageDefaults(agent.pageSettings).chatWidget;
  const image = w.image || agent.avatarUrl || '';
  const role = w.role || '';
  const name = w.name || agent.name;
  const welcome =
    w.description || agent.tagline || agent.bio || agent.firstMessage || `Hi! I'm ${name}. How can I help?`;
  const cta = w.ctaLabel || 'Start the conversation';
  const callCta = w.callLabel || 'Start a voice call';
  const callsOn = data.callsEnabled !== false;

  return (
    <div
      // Extra bottom padding shifts the centred block visually higher.
      className="flex min-h-screen flex-col items-center justify-center px-4 pb-[16vh] pt-12 font-prompt text-white"
      style={widgetBackground(w)}
    >
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        // Each gap is set explicitly below rather than via a shared `gap`,
        // so the rhythm matches the reference exactly.
        className="flex w-full max-w-2xl flex-col items-center text-center"
      >
        {/* Glowing avatar */}
        <div className="relative flex items-center justify-center">
          <motion.span
            className="absolute rounded-full blur-3xl"
            style={{
              width: 260,
              height: 260,
              background: 'radial-gradient(circle, rgba(129,140,248,0.55), transparent 70%)',
            }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0.8, 0.55] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <AgentFace size={176} image={image} className="relative ring-2 ring-white/25" />
        </div>

        <div className="mt-8">
          <h1 className="font-kalam text-[28px] font-bold tracking-tight sm:text-[34px]">
            {name}
          </h1>
          {role && (
            <p className="mt-2 font-prompt text-[13px] font-semibold uppercase tracking-[0.22em] text-amber-300/90">
              {role}
            </p>
          )}
        </div>

        <p className="mx-auto mt-[52px] max-w-xl font-prompt text-[17px] font-extralight leading-relaxed text-white/80 sm:text-lg">
          {welcome}
        </p>

        {/* Equal-width actions so the pair reads as one balanced row */}
        <div className="mt-[64px] flex w-full flex-col items-stretch gap-3.5 sm:w-auto sm:flex-row sm:items-center sm:gap-5">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setAutoCall(false);
              setChatOpen(true);
            }}
            style={ctaStyle(w)}
            className="inline-flex items-center justify-center gap-2.5 rounded-full px-8 py-4 font-prompt text-[15px] font-semibold text-white shadow-xl ring-1 ring-white/15 sm:min-w-[16rem]"
          >
            <MessageSquare className="h-[18px] w-[18px]" />
            {cta}
          </motion.button>

          {callsOn && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setAutoCall(true);
                setChatOpen(true);
              }}
              style={callStyle(w)}
              className="inline-flex items-center justify-center gap-2.5 rounded-full px-8 py-4 font-prompt text-[15px] font-semibold text-white shadow-xl ring-1 ring-white/15 sm:min-w-[16rem]"
            >
              <Phone className="h-[18px] w-[18px]" />
              {callCta}
            </motion.button>
          )}
        </div>
      </motion.div>

      <ChatWidget
        agent={agent}
        publicKey={data.vapiPublicKey}
        callsEnabled={callsOn}
        widget={w}
        autoCall={autoCall}
        open={chatOpen}
        onOpenChange={setChatOpen}
      />
    </div>
  );
}
