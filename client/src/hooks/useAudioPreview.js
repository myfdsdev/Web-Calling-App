import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Voice preview using the browser SpeechSynthesis API. This is a real, local
 * preview (no fake audio) and guarantees only ONE preview plays at a time.
 * It best-effort matches the browser voice to the selected voice's gender/lang.
 */
export function useAudioPreview() {
  const [playingId, setPlayingId] = useState(null);
  const [supported, setSupported] = useState(true);
  const voicesRef = useRef([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSupported(false);
      return undefined;
    }
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.addEventListener?.('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setPlayingId(null);
  }, [supported]);

  const pickBrowserVoice = useCallback((voice) => {
    const all = voicesRef.current;
    if (!all.length) return null;
    const wantHindi = (voice.languages || []).some((l) => /hindi/i.test(l));
    const langMatch = all.filter((v) =>
      wantHindi ? /hi(-|_|$)/i.test(v.lang) : /en(-|_|$)/i.test(v.lang)
    );
    const pool = langMatch.length ? langMatch : all;
    const female = /female|zira|samantha|victoria|karen|tessa|fiona|neha|paige|ava/i;
    const male = /male|david|daniel|alex|fred|rishi|harry|rohan/i;
    const gender = voice.gender === 'Female' ? female : male;
    return pool.find((v) => gender.test(v.name)) || pool[0];
  }, []);

  const play = useCallback(
    (voice) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      if (playingId === voice.id) {
        setPlayingId(null);
        return;
      }
      const sample = `Hi, I'm ${voice.name}. Thanks for calling — how can I help you today?`;
      const utter = new SpeechSynthesisUtterance(sample);
      const bv = pickBrowserVoice(voice);
      if (bv) utter.voice = bv;
      utter.rate = 1;
      utter.pitch = voice.gender === 'Female' ? 1.05 : 0.95;
      utter.onend = () => setPlayingId((id) => (id === voice.id ? null : id));
      utter.onerror = () => setPlayingId(null);
      setPlayingId(voice.id);
      window.speechSynthesis.speak(utter);
    },
    [supported, playingId, pickBrowserVoice]
  );

  return { play, stop, playingId, supported };
}
