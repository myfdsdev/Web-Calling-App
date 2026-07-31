import { env, emailEnabled } from '../config/env.js';

/**
 * Send a transactional email through Resend's REST API (no SDK dependency — same
 * fetch approach as the Vapi client). When no key is configured we skip sending
 * and just report it, so local/dev flows never break on a missing provider.
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!emailEnabled()) {
    if (!env.isTest) {
      // eslint-disable-next-line no-console
      console.log(`[email:skipped] RESEND_API_KEY not set — would send "${subject}" to ${to}`);
    }
    return { sent: false, skipped: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resend.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.resend.from, to: [to], subject, html, ...(text ? { text } : {}) }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend responded ${res.status}: ${body.slice(0, 200)}`);
  }
  return { sent: true };
}

/** Password-reset email: a single clear CTA button + a plain-text fallback link. */
export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const safeName = (name || 'there').replace(/[<>&]/g, '');
  const subject = 'Reset your Vox password';
  const html = `
  <div style="margin:0;padding:24px;background:#0b0b0d;font-family:Inter,Segoe UI,Arial,sans-serif;color:#f4f4f5">
    <div style="max-width:480px;margin:0 auto;background:#141417;border:1px solid #1d1d20;border-radius:16px;padding:32px">
      <div style="font-size:18px;font-weight:800;letter-spacing:-0.02em;margin-bottom:20px">Vox</div>
      <h1 style="font-size:20px;margin:0 0 12px">Reset your password</h1>
      <p style="font-size:14px;line-height:1.6;color:#8a8a90;margin:0 0 24px">
        Hi ${safeName}, we received a request to reset your password. Click the button below to choose a
        new one. This link expires in 60 minutes and can be used once.
      </p>
      <a href="${resetUrl}" style="display:inline-block;background:#ffffff;color:#0a0a0a;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:10px">
        Reset password
      </a>
      <p style="font-size:12px;line-height:1.6;color:#5c5c63;margin:24px 0 0">
        If you didn't request this, you can safely ignore this email — your password won't change.
      </p>
      <p style="font-size:12px;line-height:1.6;color:#5c5c63;margin:16px 0 0;word-break:break-all">
        Or paste this link into your browser:<br />${resetUrl}
      </p>
    </div>
  </div>`;
  const text = `Reset your Vox password\n\nHi ${safeName}, open this link to choose a new password (expires in 60 minutes, single use):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`;

  return sendEmail({ to, subject, html, text });
}
