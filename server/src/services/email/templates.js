import { env } from '../../config/env.js';

/**
 * Every template returns { subject, html, text }.
 *
 * Rules: styles are INLINE (mail clients strip <style> blocks) and every message
 * carries a plain-text part (HTML-only mail scores worse with spam filters and is
 * unreadable in text-only clients).
 */

const BRAND = '#6C5CE7';

function esc(s) {
  return String(s == null ? '' : s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

/** Shared shell: a centered card with a header bar and a footer. */
function layout({ heading, bodyHtml }) {
  const app = esc(env.appName);
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a2e;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(16,16,40,0.08);">
        <tr><td style="background:${BRAND};padding:20px 28px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.2px;">${app}</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#1a1a2e;">${esc(heading)}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:0 28px 28px;">
          <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#8a8aa3;">
            You received this email because an action was taken on your ${app} account.
            If it wasn't you, you can safely ignore this message.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td style="border-radius:8px;background:${BRAND};">
    <a href="${esc(href)}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(label)}</a>
  </td></tr></table>`;
}

/** Password reset link. Short-lived, single-use. */
export function passwordReset({ name, resetUrl, expiresMinutes = 60 }) {
  const app = env.appName;
  const hi = name ? `Hi ${esc(name)},` : 'Hi,';
  const html = layout({
    heading: 'Reset your password',
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${hi}</p>
      <p style="margin:0 0 4px;font-size:15px;line-height:1.6;">We received a request to reset your ${esc(app)} password. Click below to choose a new one.</p>
      ${button(resetUrl, 'Reset password')}
      <p style="margin:0 0 4px;font-size:13px;line-height:1.6;color:#6a6a85;">This link expires in ${expiresMinutes} minutes and can be used once. If the button doesn't work, paste this URL into your browser:</p>
      <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;color:${BRAND};">${esc(resetUrl)}</p>`,
  });
  const text = `${name ? `Hi ${name},` : 'Hi,'}

We received a request to reset your ${app} password. Open this link to choose a new one (expires in ${expiresMinutes} minutes, single use):

${resetUrl}

If you didn't request this, you can ignore this email — your password won't change.`;
  return { subject: `Reset your ${app} password`, html, text };
}

/** Welcome mail with first-login credentials (store-bridge provisioning). */
export function welcomeCredentials({ name, email, temporaryPassword, loginUrl }) {
  const app = env.appName;
  const hi = name ? `Hi ${esc(name)},` : 'Hi,';
  const html = layout({
    heading: `Welcome to ${esc(app)}`,
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${hi}</p>
      <p style="margin:0 0 4px;font-size:15px;line-height:1.6;">Your account is ready. Sign in with the credentials below and change your password from your account settings.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;background:#f4f4f7;border-radius:8px;">
        <tr><td style="padding:14px 16px;font-size:14px;color:#1a1a2e;">
          <div style="margin-bottom:8px;"><span style="color:#8a8aa3;">Email</span><br><strong>${esc(email)}</strong></div>
          <div><span style="color:#8a8aa3;">Temporary password</span><br><strong style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:15px;">${esc(temporaryPassword)}</strong></div>
        </td></tr>
      </table>
      ${button(loginUrl, 'Sign in')}
      <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;color:${BRAND};">${esc(loginUrl)}</p>`,
  });
  const text = `${name ? `Hi ${name},` : 'Hi,'}

Welcome to ${app}! Your account is ready.

Email: ${email}
Temporary password: ${temporaryPassword}

Sign in and change your password from your account settings:
${loginUrl}`;
  return { subject: `Welcome to ${app} — your login details`, html, text };
}

/** Invitation to join a workspace. */
export function teamInvite({ inviterName, workspaceName, inviteUrl, role }) {
  const app = env.appName;
  const who = inviterName ? esc(inviterName) : 'A teammate';
  const ws = workspaceName ? `“${esc(workspaceName)}”` : 'their workspace';
  const html = layout({
    heading: `You're invited to ${esc(app)}`,
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${who} invited you to join ${ws}${role ? ` as a <strong>${esc(role)}</strong>` : ''} on ${esc(app)}.</p>
      ${button(inviteUrl, 'Accept invitation')}
      <p style="margin:0 0 4px;font-size:13px;line-height:1.6;color:#6a6a85;">Or paste this link into your browser:</p>
      <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;color:${BRAND};">${esc(inviteUrl)}</p>`,
  });
  const text = `${inviterName || 'A teammate'} invited you to join ${workspaceName || 'their workspace'}${role ? ` as a ${role}` : ''} on ${app}.

Accept the invitation:
${inviteUrl}`;
  return { subject: `You're invited to join ${workspaceName || app}`, html, text };
}
