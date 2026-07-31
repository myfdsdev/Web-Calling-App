import { env } from '../../config/env.js';

/**
 * Email provider registry — mirrors the BYOK/AI resolution shape so both read
 * alike. Resend is pure HTTP (no SDK, no SMTP ports, which some hosts block).
 * Add SMTP/nodemailer only once something actually needs it.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const SEND_TIMEOUT_MS = 15000;

const resend = {
  id: 'resend',
  isConfigured() {
    return Boolean(env.email.resendApiKey && env.email.from);
  },
  async send({ from, to, subject, html, text, replyTo }) {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      // Every fetch needs a deadline, including the DNS lookup — a hung request
      // must not wedge a reset/welcome flow forever.
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.email.resendApiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    const payload = await res.json().catch(() => ({}));
    if (res.ok) return { id: payload?.id || '', raw: payload };

    // Resend returns 403 for BOTH a bad API key AND an unverified sending domain.
    // Blaming the key sends people regenerating good credentials — disambiguate on
    // the message and raise EMAIL_DOMAIN_UNVERIFIED separately.
    const message = String(payload?.message || payload?.name || payload?.error || `HTTP ${res.status}`);
    const domainUnverified = /not verified|verify a domain|domain is not/i.test(message);
    const err = new Error(message);
    err.status = res.status;
    err.code = domainUnverified ? 'EMAIL_DOMAIN_UNVERIFIED' : 'EMAIL_SEND_FAILED';
    throw err;
  },
};

/** The disabled provider — configured=false, send() is a no-op. */
const none = {
  id: 'none',
  isConfigured() {
    return false;
  },
  async send() {
    return { id: '', raw: null };
  },
};

const REGISTRY = { resend, none };

/** The provider selected by EMAIL_PROVIDER (falls back to the no-op `none`). */
export function activeProvider() {
  return REGISTRY[env.email.provider] || none;
}

export { resend, none };
