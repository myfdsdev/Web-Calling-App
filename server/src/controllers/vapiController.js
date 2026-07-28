import { Agent } from '../models/Agent.js';
import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import { creditsForCallSeconds } from '../config/plans.js';
import { spend } from '../services/creditService.js';
import { resolveVapiConfig } from '../services/apiKeyService.js';

/**
 * GET /api/vapi/config
 * Browser-safe web-calling config for the ACTIVE workspace (BYOK-aware).
 * NEVER returns the private key.
 */
export const config = asyncHandler(async (req, res) => {
  const vapiConfig = await resolveVapiConfig(req.workspaceId);
  return ok(res, {
    configured: Boolean(vapiConfig.publicKey),
    publicKey: vapiConfig.publicKey || '',
    byo: vapiConfig.isByo,
  });
});

function extractAssistantId(message) {
  return (
    message?.call?.assistantId ||
    message?.assistantId ||
    message?.assistant?.id ||
    message?.call?.assistant?.id ||
    null
  );
}

function extractDurationSeconds(message) {
  if (typeof message?.durationSeconds === 'number') return message.durationSeconds;
  if (typeof message?.call?.duration === 'number') return message.call.duration;
  const started = message?.startedAt || message?.call?.startedAt;
  const ended = message?.endedAt || message?.call?.endedAt;
  if (started && ended) {
    const secs = (new Date(ended).getTime() - new Date(started).getTime()) / 1000;
    if (Number.isFinite(secs) && secs > 0) return Math.round(secs);
  }
  return 0;
}

/**
 * POST /api/vapi/webhook
 * Handles Vapi server events. Optional shared-secret verification via header.
 * Always responds 200 quickly so Vapi does not retry storm.
 */
export const webhook = asyncHandler(async (req, res) => {
  // Optional verification — only enforced if a secret is configured.
  if (env.vapi.webhookSecret) {
    const provided = req.headers['x-vapi-secret'] || req.headers['x-vapi-signature'];
    if (provided !== env.vapi.webhookSecret) {
      return res.status(401).json({ success: false, message: 'Invalid webhook signature.' });
    }
  }

  const message = req.body?.message || req.body || {};
  const type = message.type || req.body?.type;

  try {
    if (type === 'end-of-call-report') {
      const assistantId = extractAssistantId(message);
      if (assistantId) {
        const agent = await Agent.findOne({ vapiAssistantId: assistantId });
        if (agent) {
          const today = new Date().toISOString().slice(0, 10);
          const seconds = extractDurationSeconds(message);
          if (agent.stats.statsDate !== today) {
            agent.stats.statsDate = today;
            agent.stats.callsToday = 0;
          }
          agent.stats.totalCalls += 1;
          agent.stats.callsToday += 1;
          agent.stats.totalCallSeconds += seconds;
          agent.stats.lastCallAt = new Date();
          await agent.save();

          // BYOK: if the workspace runs on its own Vapi account, the user already
          // paid Vapi directly — the app charges no credits. Only meter the
          // system-key path (where the app fronts the cost).
          const vapiConfig = await resolveVapiConfig(agent.workspaceId);
          const cost = vapiConfig.isByo ? 0 : creditsForCallSeconds(seconds);
          if (cost > 0) {
            const details = {
              source: 'call',
              reason: `Voice call · ${Math.ceil(seconds / 60)} min`,
              agentId: agent._id,
              meta: { seconds },
            };
            const charged = await spend(agent.userId, cost, details);
            if (!charged.ok && charged.balance > 0) {
              await spend(agent.userId, charged.balance, { ...details, reason: `${details.reason} (partial)` });
            }
          }
        }
      }
    }
    // Other event types (status-update, transcript, hang, etc.) are acknowledged.
  } catch (err) {
    if (!env.isTest) {
      // eslint-disable-next-line no-console
      console.warn('Webhook processing error (acknowledged):', err?.message);
    }
  }

  return res.status(200).json({ success: true, received: true });
});
