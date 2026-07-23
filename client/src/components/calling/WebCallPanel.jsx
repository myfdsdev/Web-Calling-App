import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, RefreshCw, X, PhoneCall, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { AgentAvatar } from '../ui/Avatar.jsx';
import { CallWaveform } from './CallWaveform.jsx';
import { CallTimer } from './CallTimer.jsx';
import { useVapiCall } from '../../hooks/useVapiCall.js';
import { cn } from '../../lib/cn.js';

function PulseRings({ children }) {
  return (
    <div className="relative flex items-center justify-center">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border border-primary/30"
          style={{ width: 96 + i * 34, height: 96 + i * 34 }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.1, 0.5] }}
          transition={{ duration: 2 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.25 }}
        />
      ))}
      {children}
    </div>
  );
}

export function WebCallPanel({ agent, compact = false, publicKey, allowConfigFetch = true }) {
  const call = useVapiCall({ publicKey, allowConfigFetch });
  const { status } = call;

  // Clean up any active call when the component unmounts / agent changes.
  useEffect(() => () => call.reset(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const statusLabel = {
    idle: 'Ready',
    connecting: 'Connecting…',
    active: call.speaking ? 'Agent speaking' : 'Listening',
    ended: 'Call ended',
    error: 'Call failed',
  }[status];

  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-2xl border border-line bg-surface p-6 text-center shadow-card',
        compact ? '' : 'py-8'
      )}
    >
      <AnimatePresence mode="wait">
        {/* READY */}
        {status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <AgentAvatar name={agent.name} size="xl" />
            <h3 className="mt-4 text-lg font-bold text-ink">Ready to test {agent.name}</h3>
            <p className="mt-1 max-w-xs text-sm text-ink-soft">
              Start a browser voice call and speak with your agent in real time.
            </p>
            <Button size="lg" className="mt-6" onClick={() => call.start(agent.vapiAssistantId)}>
              <Phone className="h-4 w-4" />
              Start Test Call
            </Button>
          </motion.div>
        )}

        {/* CONNECTING */}
        {status === 'connecting' && (
          <motion.div
            key="connecting"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <div className="my-4">
              <PulseRings>
                <AgentAvatar name={agent.name} size="xl" />
              </PulseRings>
            </div>
            <h3 className="mt-6 text-lg font-bold text-ink">Connecting to {agent.name}</h3>
            <p className="mt-1 text-sm text-ink-soft">Allow microphone access if prompted.</p>
            <Button variant="secondary" className="mt-6" onClick={call.stop}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </motion.div>
        )}

        {/* ACTIVE */}
        {status === 'active' && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex w-full flex-col items-center"
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
              <span className="text-sm font-semibold text-ink">{statusLabel}</span>
            </div>
            <CallWaveform active volume={call.volume} speaking={call.speaking} className="my-5 w-full" />
            <CallTimer seconds={call.duration} className="text-2xl font-bold tabular-nums text-ink" />
            <div className="mt-6 flex items-center gap-3">
              <Button
                size="icon"
                variant={call.muted ? 'primary' : 'secondary'}
                onClick={call.toggleMute}
                aria-label={call.muted ? 'Unmute' : 'Mute'}
              >
                {call.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              <Button variant="danger" size="lg" onClick={call.stop}>
                <PhoneOff className="h-4 w-4" />
                End Call
              </Button>
            </div>
          </motion.div>
        )}

        {/* ENDED */}
        {status === 'ended' && (
          <motion.div
            key="ended"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.06]">
              <PhoneOff className="h-7 w-7 text-ink-soft" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-ink">Call ended</h3>
            {call.duration > 0 && (
              <p className="mt-1 text-sm text-ink-soft">
                Duration <CallTimer seconds={call.duration} className="font-semibold text-ink" />
              </p>
            )}
            <Button className="mt-6" onClick={() => call.start(agent.vapiAssistantId)}>
              <PhoneCall className="h-4 w-4" />
              Call Again
            </Button>
          </motion.div>
        )}

        {/* ERROR */}
        {status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-danger">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-ink">Call failed</h3>
            <p className="mt-1 max-w-xs text-sm text-ink-soft">{call.errorMessage}</p>
            <Button className="mt-6" onClick={() => call.start(agent.vapiAssistantId)}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
