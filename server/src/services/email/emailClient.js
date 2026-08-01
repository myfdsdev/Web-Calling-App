import { env, emailEnabled } from '../../config/env.js';
import { activeProvider } from './providers.js';

/**
 * Send one transactional email.
 *
 * Contract — this NEVER throws and NEVER logs the body. Reset links and passwords
 * are credentials, so we log only recipient, subject and provider id. A missing
 * or broken provider degrades to `{ sent: false }` so a single misconfiguration
 * can't break password reset (or anything else) for everyone.
 *
 * Callers must NOT surface `sent` to the end user — "no email was sent" would
 * reveal whether an account exists.
 */
export async function sendEmail({ to, subject, html, text, replyTo }) {
  const provider = activeProvider();

  if (!emailEnabled() || !provider.isConfigured()) {
    // Dev convenience: note that mail is off, but never print the body.
    if (!env.isProd && !env.isTest) {
      // eslint-disable-next-line no-console
      console.info(`[email] provider not configured — skipped "${subject}" → ${to}`);
    }
    return { sent: false, reason: 'not_configured' };
  }

  try {
    const { id } = await provider.send({
      from: env.email.from,
      to,
      subject,
      html,
      text,
      replyTo: replyTo || env.email.replyTo || '',
    });
    if (!env.isTest) {
      // eslint-disable-next-line no-console
      console.info(`[email] sent "${subject}" → ${to} via ${provider.id} (${id || 'no-id'})`);
    }
    return { sent: true, id };
  } catch (err) {
    if (!env.isTest) {
      // eslint-disable-next-line no-console
      console.error(`[email] failed "${subject}" → ${to}: ${err.code || 'ERROR'} — ${err.message}`);
    }
    return { sent: false, reason: err.code || 'send_failed' };
  }
}
