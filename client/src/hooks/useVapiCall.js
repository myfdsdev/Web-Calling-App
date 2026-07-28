import { useState, useRef, useEffect, useCallback } from 'react';
import Vapi from '@vapi-ai/web';
import { vapiService } from '../services/vapiService.js';

/**
 * Pull a human-readable message out of Vapi's varied error shapes so we never
 * surface a useless "[object Object]". Vapi may emit a string, an Error, or an
 * object like { error: { statusCode, message } } where message is a string or
 * an array of validation strings.
 */
function readVapiError(e) {
  if (!e) return '';
  if (typeof e === 'string') return e;
  const str = (v) => {
    if (typeof v === 'string') return v.trim();
    if (Array.isArray(v)) return v.filter((x) => typeof x === 'string').join(' ').trim();
    return '';
  };
  const nested = e.error ?? e;
  const msg =
    str(nested?.message) ||
    str(nested?.msg) ||
    str(nested?.error) ||
    str(e?.errorMsg) ||
    str(e?.message) ||
    str(e?.reason);
  if (msg) return msg;
  // Last resort: a readable dump rather than "[object Object]".
  try {
    const s = JSON.stringify(nested);
    if (s && s !== '{}' && s !== 'null') return s.slice(0, 300);
  } catch {
    /* ignore */
  }
  return '';
}

/**
 * Browser web-calling via the Vapi Web SDK (@vapi-ai/web).
 * Uses ONLY the public key that belongs to the active WORKSPACE — supplied
 * directly (public page) or fetched from the backend /vapi/config endpoint
 * (which resolves the workspace's own key). There is deliberately no build-time
 * env fallback, so the system key can never be used from the browser (BYOK).
 *
 * status: idle | connecting | active | ended | error
 */
export function useVapiCall(options = {}) {
  const { publicKey: providedKey, allowConfigFetch = true } = options;
  const [status, setStatus] = useState('idle');
  const [speaking, setSpeaking] = useState(false); // agent is speaking
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const vapiRef = useRef(null);
  const timerRef = useRef(null);
  // Only a workspace-provided key — never a build-time system key (BYOK).
  const publicKeyRef = useRef(providedKey || '');

  // Keep the ref in sync if the provided key arrives asynchronously.
  useEffect(() => {
    if (providedKey) publicKeyRef.current = providedKey;
  }, [providedKey]);

  const clearTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const teardown = useCallback(() => {
    clearTimer();
    if (vapiRef.current) {
      try {
        vapiRef.current.removeAllListeners?.();
        vapiRef.current.stop?.();
      } catch {
        /* ignore */
      }
      vapiRef.current = null;
    }
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  const resolveKey = useCallback(async () => {
    if (publicKeyRef.current) return publicKeyRef.current;
    // The public (unauthenticated) page can't hit the auth'd config endpoint.
    if (!allowConfigFetch) return '';
    try {
      const cfg = await vapiService.getConfig();
      if (cfg.publicKey) {
        publicKeyRef.current = cfg.publicKey;
        return cfg.publicKey;
      }
    } catch {
      /* fall through */
    }
    return '';
  }, [allowConfigFetch]);

  const attachListeners = (vapi) => {
    vapi.on('call-start', () => {
      setStatus('active');
      setDuration(0);
      clearTimer();
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    });
    vapi.on('call-end', () => {
      clearTimer();
      setSpeaking(false);
      setVolume(0);
      setStatus((s) => (s === 'error' ? s : 'ended'));
    });
    vapi.on('speech-start', () => setSpeaking(true));
    vapi.on('speech-end', () => setSpeaking(false));
    vapi.on('volume-level', (v) => setVolume(typeof v === 'number' ? v : 0));
    vapi.on('error', (e) => {
      clearTimer();
      const msg = readVapiError(e) || 'The call could not be completed. Please try again.';
      setErrorMessage(msg.slice(0, 240));
      setStatus('error');
    });
  };

  const start = useCallback(
    async (assistantId) => {
      if (!assistantId) {
        setErrorMessage('This agent is not connected to Vapi yet.');
        setStatus('error');
        return;
      }
      // Vapi assistant ids are UUIDs. A non-UUID means the agent was saved
      // before the Vapi key was configured, so it points at a placeholder id.
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assistantId)) {
        setErrorMessage(
          'This agent isn’t linked to a real Vapi assistant (its saved id is a placeholder). Re-create the agent, or repair its assistant id.'
        );
        setStatus('error');
        return;
      }
      setErrorMessage('');
      setStatus('connecting');

      const key = await resolveKey();
      if (!key) {
        setErrorMessage(
          'Web calling isn’t configured for this workspace. Add your Vapi keys in Workspace → API keys to enable calls.'
        );
        setStatus('error');
        return;
      }

      try {
        teardown();
        const vapi = new Vapi(key);
        vapiRef.current = vapi;
        attachListeners(vapi);
        setMuted(false);
        await vapi.start(assistantId);
      } catch (err) {
        clearTimer();
        const isPerm =
          err?.name === 'NotAllowedError' ||
          (typeof err?.message === 'string' && err.message.includes('Permission'));
        const msg = isPerm
          ? 'Microphone permission is required to start a call. Please allow access and try again.'
          : readVapiError(err) || 'Could not start the call. Please try again.';
        setErrorMessage(msg.slice(0, 240));
        setStatus('error');
      }

    },
    [resolveKey, teardown]
  );

  const stop = useCallback(() => {
    try {
      vapiRef.current?.stop?.();
    } catch {
      /* ignore */
    }
    clearTimer();
    setStatus('ended');
  }, []);

  const toggleMute = useCallback(() => {
    if (!vapiRef.current) return;
    const next = !muted;
    try {
      vapiRef.current.setMuted?.(next);
      setMuted(next);
    } catch {
      /* ignore */
    }
  }, [muted]);

  const reset = useCallback(() => {
    teardown();
    setStatus('idle');
    setDuration(0);
    setSpeaking(false);
    setVolume(0);
    setMuted(false);
    setErrorMessage('');
  }, [teardown]);

  return { status, speaking, muted, volume, duration, errorMessage, start, stop, toggleMute, reset };
}
