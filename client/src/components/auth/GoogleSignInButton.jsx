import { useEffect, useRef, useState } from 'react';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

/** Load the Google Identity Services script once, shared across mounts. */
let gsiPromise = null;
function loadGsi() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load Google sign-in.'));
    document.head.appendChild(s);
  });
  return gsiPromise;
}

/**
 * Renders Google's official "Sign in with Google" button. Nothing is shown when
 * VITE_GOOGLE_CLIENT_ID isn't set, so the app still works without it.
 */
export function GoogleSignInButton({ onCredential, text = 'signin_with' }) {
  const holder = useRef(null);
  const [failed, setFailed] = useState(false);
  // Keep the latest callback without re-initialising Google on every render.
  const cb = useRef(onCredential);
  cb.current = onCredential;

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let cancelled = false;

    loadGsi()
      .then(() => {
        if (cancelled || !holder.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (res) => res?.credential && cb.current?.(res.credential),
        });
        holder.current.innerHTML = '';
        window.google.accounts.id.renderButton(holder.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text,
          width: 320,
          logo_alignment: 'left',
        });
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!CLIENT_ID) return null;

  return (
    <div className="mt-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[12px] font-medium text-ink-soft">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <div ref={holder} className="flex justify-center" />
      {failed && (
        <p className="mt-2 text-center text-[12px] text-ink-soft">
          Google sign-in couldn’t load. Please check your connection.
        </p>
      )}
    </div>
  );
}
