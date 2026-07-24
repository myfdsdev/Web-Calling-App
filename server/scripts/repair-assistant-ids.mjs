/**
 * Repair agents whose `vapiAssistantId` is a placeholder instead of a real
 * Vapi assistant UUID (they were created before VAPI_PRIVATE_API_KEY was set).
 *
 * Matches each broken local agent to a Vapi assistant by name.
 *
 *   node scripts/repair-assistant-ids.mjs          # dry run — shows the plan
 *   node scripts/repair-assistant-ids.mjs --apply  # writes the fixes
 */
import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const envText = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

if (!env.MONGODB_URI) throw new Error('MONGODB_URI missing from server/.env');
if (!env.VAPI_PRIVATE_API_KEY) throw new Error('VAPI_PRIVATE_API_KEY missing from server/.env');

const base = (env.VAPI_BASE_URL || 'https://api.vapi.ai').replace(/\/$/, '');

// ── Pull the real assistants from Vapi ──────────────────────────────────────
const res = await fetch(`${base}/assistant`, {
  headers: { Authorization: `Bearer ${env.VAPI_PRIVATE_API_KEY}` },
});
if (!res.ok) throw new Error(`Vapi GET /assistant failed: ${res.status} ${await res.text()}`);
const raw = await res.json();
const remote = Array.isArray(raw) ? raw : raw.results || [];
console.log(`Vapi assistants: ${remote.length}`);

const byName = new Map();
for (const a of remote) {
  const key = String(a.name || '').trim().toLowerCase();
  if (!key) continue;
  if (!byName.has(key)) byName.set(key, []);
  byName.get(key).push(a);
}

// ── Inspect local agents ────────────────────────────────────────────────────
await mongoose.connect(env.MONGODB_URI);
const col = mongoose.connection.db.collection('agents');
const agents = await col.find({}, { projection: { name: 1, vapiAssistantId: 1 } }).toArray();

let fixable = 0;
let unmatched = 0;

console.log(`\nLocal agents: ${agents.length}\n`);
for (const a of agents) {
  const current = a.vapiAssistantId || '';
  if (UUID.test(current)) {
    console.log(`OK      ${a.name} → already a real assistant id`);
    continue;
  }

  const matches = byName.get(String(a.name || '').trim().toLowerCase()) || [];
  if (matches.length === 0) {
    unmatched += 1;
    console.log(`NO MATCH ${a.name} → "${current}" (no Vapi assistant with this name — re-create this agent)`);
    continue;
  }
  if (matches.length > 1) {
    console.log(`NOTE    ${a.name} → ${matches.length} Vapi assistants share this name; using the first.`);
  }

  const target = matches[0];
  fixable += 1;
  console.log(`FIX     ${a.name} → "${current}"  ⇒  ${target.id}`);

  if (APPLY) {
    await col.updateOne({ _id: a._id }, { $set: { vapiAssistantId: target.id } });
  }
}

console.log(
  `\n${APPLY ? 'Applied' : 'Would fix'}: ${fixable}   |   Needs re-creation: ${unmatched}` +
    (APPLY ? '' : '\n\nRun again with --apply to write these changes.')
);

await mongoose.disconnect();
