import { Lead } from '../models/Lead.js';

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(?:\+?\d[\d\s().-]{6,}\d)/;
const NAME_RE = /(?:my name is|i am|i'?m|this is|myself|name[:\-]?)\s+([a-zA-Z][a-zA-Z'.-]+(?:\s+[a-zA-Z][a-zA-Z'.-]+)?)/i;
// Words that follow "I'm / I am" but aren't names (or connectors to drop).
const NAME_STOP = new Set([
  'looking', 'interested', 'trying', 'here', 'just', 'not', 'a', 'an', 'the',
  'good', 'fine', 'ok', 'okay', 'sorry', 'calling', 'asking', 'wondering', 'from',
  'and', 'my', 'email', 'number', 'phone', 'name', 'is', 'with', 'at', 'for',
]);

function titleCase(s) {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .slice(0, 80);
}

/** Best-effort contact extraction from the visitor's own messages. */
export function extractContact(userText) {
  const text = String(userText || '');
  const email = (text.match(EMAIL_RE) || [])[0] || '';

  let phone = (text.match(PHONE_RE) || [])[0] || '';
  if (phone) {
    const digits = phone.replace(/[^\d]/g, '');
    phone = digits.length >= 8 && digits.length <= 15 ? phone.trim() : '';
  }

  let name = '';
  const m = text.match(NAME_RE);
  if (m && m[1]) {
    const words = m[1].trim().split(/\s+/).filter((w) => !NAME_STOP.has(w.toLowerCase()));
    if (words.length) name = titleCase(words.slice(0, 2).join(' '));
  }

  return { name, email, phone };
}

/** Only overwrite a stored contact field when we've found a fresh value. */
function mergeContact(lead, found) {
  if (found.name && !lead.name) lead.name = found.name;
  if (found.email && !lead.email) lead.email = found.email;
  if (found.phone && !lead.phone) lead.phone = found.phone;
}

async function findOrInitLead(agent, sessionId) {
  let lead = null;
  if (sessionId) {
    lead = await Lead.findOne({ userId: agent.userId, agentId: agent._id, sessionId });
  }
  if (!lead) {
    lead = new Lead({
      userId: agent.userId,
      workspaceId: agent.workspaceId || null,
      agentId: agent._id,
      agentName: agent.name,
      publicId: agent.publicId,
      sessionId: sessionId || '',
    });
  }
  return lead;
}

/** Capture / update a lead from a public text-chat session. */
export async function captureChatLead({ agent, sessionId, messages }) {
  try {
    const lead = await findOrInitLead(agent, sessionId);
    const userText = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join('\n');

    mergeContact(lead, extractContact(userText));
    lead.transcript = messages.slice(-50).map((m) => ({ role: m.role, content: String(m.content || '').slice(0, 2000) }));
    lead.messageCount = messages.length;
    lead.summary = lead.summary || messages.find((m) => m.role === 'user')?.content?.slice(0, 200) || '';
    lead.channel = 'chat';
    lead.viaChat = true;
    lead.lastActivityAt = new Date();
    await lead.save();
    return lead;
  } catch {
    // Lead capture must never break the visitor's chat.
    return null;
  }
}

/** Capture / update a lead when a visitor starts a browser voice call. */
export async function captureCallLead({ agent, sessionId }) {
  try {
    const lead = await findOrInitLead(agent, sessionId);
    lead.channel = 'call';
    lead.viaCall = true;
    if (!lead.summary) lead.summary = 'Started a browser voice call.';
    lead.lastActivityAt = new Date();
    await lead.save();
    return lead;
  } catch {
    return null;
  }
}
