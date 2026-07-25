/**
 * Pricing plans + credit economics.
 *
 * ── Cost basis (MEASURED on the Vapi dashboard, not estimated) ───────────────
 *   Voice call = $0.09 / minute all-in:
 *       Deepgram Nova-2 transcriber   $0.01
 *       OpenAI gpt-4o-mini            $0.01
 *       Vapi "Elliot" voice           $0.02
 *       Vapi platform fee            ~$0.05
 *   Text chat  ≈ $0.0002 / message (gemini-2.0-flash — effectively free)
 *
 * Voice dominates cost, so credits are priced off voice minutes.
 *
 * ── Credit unit ─────────────────────────────────────────────────────────────
 *   1 voice minute  = 10 credits   ($0.09 cost  → 1 credit ≈ $0.009)
 *   1 chat reply    =  1 credit    (costs ~nothing; covers infra + keeps the
 *                                   model simple and predictable)
 *
 * Plans are sized for ~64-72% gross margin, with a volume discount as the
 * tier goes up ($0.32 → $0.27 → $0.25 per minute for the customer).
 */

export const VOICE_CREDITS_PER_MINUTE = 10;
export const CHAT_CREDITS_PER_MESSAGE = 1;

/** Minutes are billed rounded up — a 10-second call still costs a minute. */
export function creditsForCallSeconds(seconds) {
  const secs = Math.max(0, Number(seconds) || 0);
  if (secs === 0) return 0;
  return Math.ceil(secs / 60) * VOICE_CREDITS_PER_MINUTE;
}

export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try it out',
    priceMonthly: 0,
    credits: 100, // ≈ 10 voice minutes
    maxAgents: 1,
    maxMembers: 1, // just you
    features: [
      '1 voice agent',
      '100 credits / month (~10 call minutes)',
      'Shareable public page',
      'Chat + web calling',
      'Lead capture',
      'Solo workspace',
    ],
    limits: { customBranding: false, customCode: false, prioritySupport: false },
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For a single business',
    priceMonthly: 19,
    credits: 600, // 60 voice minutes · cost $5.40 · margin ~72% · $0.32/min
    maxAgents: 3,
    maxMembers: 3,
    popular: false,
    features: [
      '3 voice agents',
      '600 credits / month (~60 call minutes)',
      'Everything in Free',
      'Invite up to 3 teammates',
      'Full page customization',
      'Email support',
    ],
    limits: { customBranding: false, customCode: false, prioritySupport: false },
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For growing teams',
    priceMonthly: 49,
    credits: 1800, // 180 voice minutes · cost $16.20 · margin ~67% · $0.27/min
    maxAgents: 10,
    maxMembers: 10,
    popular: true,
    features: [
      '10 voice agents',
      '1,800 credits / month (~180 call minutes)',
      'Everything in Starter',
      'Invite up to 10 teammates',
      'Remove “Powered by” branding',
      'Custom code / tracking pixels',
    ],
    limits: { customBranding: true, customCode: true, prioritySupport: false },
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'High volume',
    priceMonthly: 149,
    credits: 6000, // 600 voice minutes · cost $54 · margin ~64% · $0.25/min
    maxAgents: 50,
    maxMembers: 50,
    features: [
      '50 voice agents',
      '6,000 credits / month (~600 call minutes)',
      'Everything in Pro',
      'Invite up to 50 teammates',
      'Priority support',
      'Highest concurrency',
    ],
    limits: { customBranding: true, customCode: true, prioritySupport: true },
  },
];

/**
 * One-off credit packs for users who run out mid-month. Priced slightly above
 * the plan rate ($0.40 → $0.35 → $0.30 per minute) so subscribing stays better.
 */
export const CREDIT_PACKS = [
  { id: 'pack_250', credits: 250, price: 10 }, // 25 min · cost $2.25 · ~77%
  { id: 'pack_1000', credits: 1000, price: 35 }, // 100 min · cost $9 · ~74%
  { id: 'pack_3000', credits: 3000, price: 90 }, // 300 min · cost $27 · ~70%
];

export const DEFAULT_PLAN_ID = 'free';

const PLAN_MAP = new Map(PLANS.map((p) => [p.id, p]));

export function getPlan(planId) {
  return PLAN_MAP.get(planId) || PLAN_MAP.get(DEFAULT_PLAN_ID);
}

export function getPack(packId) {
  return CREDIT_PACKS.find((p) => p.id === packId) || null;
}
