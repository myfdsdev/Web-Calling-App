import { Agent } from '../models/Agent.js';
import { CreditTransaction } from '../models/CreditTransaction.js';
import { ok, AppError } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  PLANS,
  CREDIT_PACKS,
  getPlan,
  getPack,
  VOICE_CREDITS_PER_MINUTE,
  CHAT_CREDITS_PER_MESSAGE,
} from '../config/plans.js';
import { getAccount, balanceOf, changePlan, addTopUp } from '../services/creditService.js';
import { planChangeSchema, topUpSchema } from '../validators/agentValidator.js';

/** GET /api/billing/plans — the catalogue (no auth needed beyond the router). */
export const listPlans = asyncHandler(async (req, res) => {
  return ok(res, {
    // `hidden` plans (e.g. Admin) are registration-assigned, never self-selectable.
    plans: PLANS.filter((p) => !p.hidden),
    packs: CREDIT_PACKS,
    rates: {
      voiceCreditsPerMinute: VOICE_CREDITS_PER_MINUTE,
      chatCreditsPerMessage: CHAT_CREDITS_PER_MESSAGE,
    },
  });
});

/**
 * GET /api/billing/me — plan, balance and usage for the ACTIVE WORKSPACE.
 * Credits are a shared pool owned by the workspace owner, so every member sees
 * the same balance (members read-only; only the owner can change it).
 */
export const myBilling = asyncHandler(async (req, res) => {
  const user = await getAccount(req.ownerId);
  if (!user) throw new AppError('Account not found.', 404, 'USER_NOT_FOUND');

  const plan = getPlan(user.plan);
  const agentCount = await Agent.countDocuments({ workspaceId: req.workspaceId });

  // Usage since the current cycle started (renewal date minus one month).
  const cycleStart = new Date(user.creditsRenewAt || Date.now());
  cycleStart.setMonth(cycleStart.getMonth() - 1);

  const usage = await CreditTransaction.aggregate([
    { $match: { userId: user._id, type: 'usage', createdAt: { $gte: cycleStart } } },
    { $group: { _id: '$source', spent: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);

  const bySource = { call: { spent: 0, count: 0 }, chat: { spent: 0, count: 0 } };
  for (const row of usage) {
    const key = row._id === 'call' ? 'call' : row._id === 'chat' ? 'chat' : null;
    if (key) bySource[key] = { spent: Math.abs(row.spent), count: row.count };
  }

  return ok(res, {
    plan,
    credits: {
      total: balanceOf(user),
      monthly: user.credits || 0,
      bonus: user.bonusCredits || 0,
      allowance: plan.credits,
      renewsAt: user.creditsRenewAt,
    },
    usage: {
      cycleStart,
      callCredits: bySource.call.spent,
      calls: bySource.call.count,
      chatCredits: bySource.chat.spent,
      chats: bySource.chat.count,
      voiceMinutesLeft: Math.floor(balanceOf(user) / VOICE_CREDITS_PER_MINUTE),
    },
    limits: { agents: { used: agentCount, max: plan.maxAgents }, ...plan.limits },
    rates: {
      voiceCreditsPerMinute: VOICE_CREDITS_PER_MINUTE,
      chatCreditsPerMessage: CHAT_CREDITS_PER_MESSAGE,
    },
  });
});

/**
 * POST /api/billing/plan — switch plans.
 * NOTE: no payment gateway is wired up yet; this changes the plan directly.
 */
export const setPlan = asyncHandler(async (req, res) => {
  const { planId } = planChangeSchema.parse(req.body);
  if (!PLANS.some((p) => p.id === planId)) {
    throw new AppError('Unknown plan.', 422, 'UNKNOWN_PLAN');
  }
  const user = await changePlan(req.ownerId, planId);
  if (!user) throw new AppError('Account not found.', 404, 'USER_NOT_FOUND');
  const plan = getPlan(user.plan);
  return ok(res, { plan, credits: balanceOf(user) }, `Switched to ${plan.name}.`);
});

/**
 * POST /api/billing/topup — add a credit pack.
 * NOTE: no payment gateway yet; credits are granted immediately.
 */
export const topUp = asyncHandler(async (req, res) => {
  const { packId } = topUpSchema.parse(req.body);
  const pack = getPack(packId);
  if (!pack) throw new AppError('Unknown credit pack.', 422, 'UNKNOWN_PACK');
  const user = await addTopUp(req.ownerId, pack.credits, `${pack.credits} credit pack`);
  if (!user) throw new AppError('Account not found.', 404, 'USER_NOT_FOUND');
  return ok(res, { credits: balanceOf(user) }, `${pack.credits} credits added.`);
});

/** GET /api/billing/transactions — recent ledger entries. */
export const listTransactions = asyncHandler(async (req, res) => {
  const rows = await CreditTransaction.find({ userId: req.ownerId })
    .sort({ createdAt: -1 })
    .limit(100);
  return ok(res, { transactions: rows.map((r) => r.toJSONView()) });
});
