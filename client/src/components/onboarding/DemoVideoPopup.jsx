import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore.js';
import { DEMO_VIDEO_ID } from '../../config/demoVideo.js';
import { DemoVideoDialog } from './DemoVideoDialog.jsx';

const SEEN_KEY = 'ringwebai.demoSeen';

/**
 * Flip to true to pop the demo on EVERY sign-in. Default is once per account:
 * a returning user shouldn't have to dismiss the same video every morning —
 * "Watch demo" in the sidebar re-opens it whenever they want it.
 */
const SHOW_EVERY_LOGIN = false;

/** Event the sidebar fires to re-open the demo. */
export const OPEN_DEMO_EVENT = 'ringwebai:open-demo';

/**
 * Opens the demo video over the first authenticated screen. Mounted inside the
 * protected layout so it can appear on top of whatever the user lands on.
 */
export function DemoVideoPopup() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id || '';
  const [open, setOpen] = useState(false);

  // Read during render, BEFORE any effect runs — OnboardingApiKeys clears this
  // flag in its own effect, and a fresh signup gets the API-keys prompt (which
  // gates the whole app) rather than two dialogs stacked on each other. The
  // demo then pops on their next sign-in, since we don't mark it seen here.
  const [freshSignup] = useState(() => localStorage.getItem('ringwebai.justSignedUp') === '1');

  useEffect(() => {
    if (!DEMO_VIDEO_ID || !userId || freshSignup) return undefined;
    if (!SHOW_EVERY_LOGIN && localStorage.getItem(`${SEEN_KEY}:${userId}`) === '1') return undefined;
    // Let the first screen paint before the dialog slides over it.
    const timer = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(timer);
  }, [userId, freshSignup]);

  // Sidebar "Watch demo" — works regardless of the seen flag.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_DEMO_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_DEMO_EVENT, onOpen);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    // Marked seen only once they've actually been shown it — keyed per account so
    // a second user on the same browser still gets their own first-run demo.
    if (userId) localStorage.setItem(`${SEEN_KEY}:${userId}`, '1');
  }, [userId]);

  if (!DEMO_VIDEO_ID) return null;
  return <DemoVideoDialog open={open} onClose={close} videoId={DEMO_VIDEO_ID} />;
}
