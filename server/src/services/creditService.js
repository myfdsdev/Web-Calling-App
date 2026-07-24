import { User, nextRenewal } from '../models/User.js';
import { CreditTransaction } from '../models/CreditTransaction.js';
import { getPlan } from '../config/plans.js';

/** Total spendable balance = monthly allowance + purchased top-ups. */
export function balanceOf(user) {
  return (user?.credits || 0) + (user?.bonusCredits || 0);
}

async function log(userId, { type, amount, balanceAfter, source = '', reason = '', agentId = null, meta = {} }) {
  try {
    await CreditTransaction.create({ userId, type, amount, balanceAfter, source, reason, agentId, meta });
  } catch {
    /* the ledger is best-effort — never block the operation it describes */
  }
}

/**
 * Reset the monthly allowance if the cycle has rolled over. Purchased
 * (bonus) credits are untouched — they carry over indefinitely.
 */
export async function ensureRenewal(user) {
  if (!user) return user;
  const now = new Date();
  if (user.creditsRenewAt && user.creditsRenewAt > now) return user;

  const plan = getPlan(user.plan);
  const updated = await User.findOneAndUpdate(
    { _id: user._id, $or: [{ creditsRenewAt: { $lte: now } }, { creditsRenewAt: null }] },
    { $set: { credits: plan.credits, creditsRenewAt: nextRenewal(now) } },
    { new: true }
  );
  if (updated) {
    await log(user._id, {
      type: 'grant',
      amount: plan.credits,
      balanceAfter: balanceOf(updated),
      source: 'plan',
      reason: `Monthly ${plan.name} allowance`,
    });
    return updated;
  }
  return user;
}

/** Load a user with their cycle rolled forward. */
export async function getAccount(userId) {
  const user = await User.findById(userId);
  if (!user) return null;
  return ensureRenewal(user);
}

/**
 * Spend credits. Monthly allowance is used first, then purchased top-ups.
 * Returns { ok, balance, short } — `ok:false` means the balance was too low
 * and nothing was deducted.
 */
export async function spend(userId, amount, details = {}) {
  const cost = Math.max(0, Math.ceil(Number(amount) || 0));
  if (cost === 0) {
    const u = await getAccount(userId);
    return { ok: true, balance: balanceOf(u) };
  }

  const user = await getAccount(userId);
  if (!user) return { ok: false, balance: 0, short: cost };

  const total = balanceOf(user);
  if (total < cost) return { ok: false, balance: total, short: cost - total };

  const fromMonthly = Math.min(user.credits || 0, cost);
  const fromBonus = cost - fromMonthly;

  const updated = await User.findOneAndUpdate(
    { _id: user._id, credits: { $gte: fromMonthly }, bonusCredits: { $gte: fromBonus } },
    { $inc: { credits: -fromMonthly, bonusCredits: -fromBonus } },
    { new: true }
  );
  if (!updated) {
    // Lost a race against a concurrent spend — report as insufficient.
    const fresh = await User.findById(user._id);
    return { ok: false, balance: balanceOf(fresh), short: cost };
  }

  const balance = balanceOf(updated);
  await log(user._id, {
    type: 'usage',
    amount: -cost,
    balanceAfter: balance,
    source: details.source || '',
    reason: details.reason || '',
    agentId: details.agentId || null,
    meta: details.meta || {},
  });

  return { ok: true, balance };
}

/** Add purchased (non-expiring) credits. */
export async function addTopUp(userId, credits, reason = 'Credit pack') {
  const amount = Math.max(0, Math.ceil(Number(credits) || 0));
  if (!amount) return null;
  const updated = await User.findByIdAndUpdate(
    userId,
    { $inc: { bonusCredits: amount } },
    { new: true }
  );
  if (!updated) return null;
  await log(userId, {
    type: 'topup',
    amount,
    balanceAfter: balanceOf(updated),
    source: 'pack',
    reason,
  });
  return updated;
}

/** Switch plans: the new allowance applies immediately and the cycle restarts. */
export async function changePlan(userId, planId) {
  const plan = getPlan(planId);
  const now = new Date();
  const updated = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        plan: plan.id,
        credits: plan.credits,
        creditsRenewAt: nextRenewal(now),
        planUpdatedAt: now,
      },
    },
    { new: true }
  );
  if (!updated) return null;
  await log(userId, {
    type: 'grant',
    amount: plan.credits,
    balanceAfter: balanceOf(updated),
    source: 'plan',
    reason: `Switched to ${plan.name}`,
  });
  return updated;
}

/** True when the account can afford `cost` credits right now. */
export async function canAfford(userId, cost) {
  const user = await getAccount(userId);
  return Boolean(user) && balanceOf(user) >= cost;
}
