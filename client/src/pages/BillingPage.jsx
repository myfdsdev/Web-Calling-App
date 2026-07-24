import { motion } from 'framer-motion';
import {
  Zap,
  Check,
  Phone,
  MessageSquare,
  Bot,
  Sparkles,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { ProgressBar } from '../components/ui/ProgressBar.jsx';
import { FullPageLoader } from '../components/common/FullPageLoader.jsx';
import { ErrorState } from '../components/common/ErrorState.jsx';
import {
  usePlans,
  useMyBilling,
  useCreditTransactions,
  useSetPlan,
  useTopUp,
} from '../hooks/useBilling.js';
import { pageVariants, staggerItem } from '../lib/motion.js';
import { cn } from '../lib/cn.js';

function fmt(n) {
  return new Intl.NumberFormat().format(Math.max(0, Math.round(n || 0)));
}

function when(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3.5">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white/[0.06] text-ink-soft">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[19px] font-bold leading-none text-ink">{value}</p>
        <p className="mt-1 text-[12px] text-ink-soft">{label}</p>
        {sub && <p className="mt-0.5 text-[11px] text-ink-faint">{sub}</p>}
      </div>
    </div>
  );
}

function PlanCard({ plan, current, onChoose, busy }) {
  const isCurrent = current === plan.id;
  return (
    <motion.div variants={staggerItem}>
      <Card
        className={cn(
          'relative flex h-full flex-col p-5',
          plan.popular && !isCurrent && 'border-white/20',
          isCurrent && 'border-primary/40 bg-primary-soft/40'
        )}
      >
        {plan.popular && !isCurrent && (
          <span className="absolute -top-2.5 left-5 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-black">
            Most popular
          </span>
        )}
        {isCurrent && (
          <span className="absolute -top-2.5 left-5">
            <Badge tone="primary">Current plan</Badge>
          </span>
        )}

        <div className="mb-3">
          <p className="text-card-title font-semibold text-ink">{plan.name}</p>
          <p className="text-[12px] text-ink-soft">{plan.tagline}</p>
        </div>

        <div className="mb-4 flex items-baseline gap-1">
          <span className="text-[28px] font-bold tracking-tight text-ink">${plan.priceMonthly}</span>
          <span className="text-[13px] text-ink-soft">/month</span>
        </div>

        <div className="mb-4 rounded-lg bg-white/[0.04] px-3 py-2">
          <p className="text-[13px] font-semibold text-ink">{fmt(plan.credits)} credits</p>
          <p className="text-[11px] text-ink-soft">≈ {fmt(plan.credits / 10)} voice minutes</p>
        </div>

        <ul className="mb-5 flex-1 space-y-2">
          {plan.features.map((f) => (
            <li key={f} className="flex gap-2 text-[13px] text-ink-soft">
              <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
              {f}
            </li>
          ))}
        </ul>

        <Button
          variant={isCurrent ? 'secondary' : plan.popular ? 'primary' : 'secondary'}
          disabled={isCurrent || busy}
          onClick={() => onChoose(plan.id)}
          className="w-full"
        >
          {isCurrent ? 'Your plan' : `Switch to ${plan.name}`}
        </Button>
      </Card>
    </motion.div>
  );
}

export default function BillingPage() {
  const plansQuery = usePlans();
  const meQuery = useMyBilling();
  const txQuery = useCreditTransactions();
  const setPlan = useSetPlan();
  const topUp = useTopUp();

  if (plansQuery.isLoading || meQuery.isLoading) {
    return <FullPageLoader inline label="Loading your plan…" />;
  }
  if (plansQuery.isError || meQuery.isError) {
    return (
      <PageContainer animate={false}>
        <ErrorState title="Couldn’t load billing" onRetry={() => { plansQuery.refetch(); meQuery.refetch(); }} />
      </PageContainer>
    );
  }

  const { plans, packs, rates } = plansQuery.data;
  const { plan, credits, usage, limits } = meQuery.data;
  const transactions = txQuery.data?.transactions || [];

  const usedThisCycle = Math.max(0, credits.allowance - credits.monthly);
  const usedPct = credits.allowance ? Math.round((usedThisCycle / credits.allowance) * 100) : 0;
  const busy = setPlan.isPending || topUp.isPending;

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-ink md:text-[32px]">Plans & Credits</h1>
        <p className="mt-1.5 text-sm text-ink-soft md:text-[15px]">
          Credits are spent when visitors talk to your agents — {rates.voiceCreditsPerMinute} per voice
          minute, {rates.chatCreditsPerMessage} per chat reply.
        </p>
      </div>

      {/* Current balance */}
      <Card className="mb-6 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Zap className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[26px] font-bold leading-none text-ink">{fmt(credits.total)}</p>
                <span className="text-sm text-ink-soft">credits left</span>
              </div>
              <p className="mt-1 text-[13px] text-ink-soft">
                On <b className="text-ink">{plan.name}</b> · renews {when(credits.renewsAt)}
                {credits.bonus > 0 && <> · includes {fmt(credits.bonus)} purchased</>}
              </p>
            </div>
          </div>
          <div className="w-full lg:max-w-sm">
            <div className="mb-1.5 flex justify-between text-[12px]">
              <span className="text-ink-soft">
                {fmt(usedThisCycle)} of {fmt(credits.allowance)} monthly credits used
              </span>
              <span className="font-semibold text-ink">{usedPct}%</span>
            </div>
            <ProgressBar value={usedPct} />
          </div>
        </div>
      </Card>

      {/* Usage this cycle */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={Phone}
          label="Voice minutes left"
          value={fmt(usage.voiceMinutesLeft)}
          sub={`${fmt(usage.calls)} calls this cycle`}
        />
        <StatTile icon={Zap} label="Credits on calls" value={fmt(usage.callCredits)} />
        <StatTile
          icon={MessageSquare}
          label="Credits on chat"
          value={fmt(usage.chatCredits)}
          sub={`${fmt(usage.chats)} replies`}
        />
        <StatTile
          icon={Bot}
          label="Agents"
          value={`${limits.agents.used} / ${limits.agents.max}`}
          sub="included in your plan"
        />
      </div>

      {/* Plans */}
      <h2 className="mb-3 text-section font-bold text-ink">Choose a plan</h2>
      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="show"
        className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} current={plan.id} onChoose={setPlan.mutate} busy={busy} />
        ))}
      </motion.div>

      {/* Top-up packs */}
      <h2 className="mb-1 text-section font-bold text-ink">Need more credits?</h2>
      <p className="mb-3 text-sm text-ink-soft">
        One-off packs never expire and are used after your monthly allowance runs out.
      </p>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {packs.map((pack) => (
          <Card key={pack.id} className="flex items-center justify-between p-5">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-card-title font-semibold text-ink">{fmt(pack.credits)} credits</p>
              </div>
              <p className="mt-0.5 text-[12px] text-ink-soft">
                ≈ {fmt(pack.credits / 10)} voice minutes · ${pack.price}
              </p>
            </div>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => topUp.mutate(pack.id)}>
              <ArrowUpRight className="h-4 w-4" />
              Add
            </Button>
          </Card>
        ))}
      </div>

      {/* Ledger */}
      <h2 className="mb-3 text-section font-bold text-ink">Recent activity</h2>
      {transactions.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ink-soft">No credit activity yet.</Card>
      ) : (
        <Card className="divide-y divide-line/70">
          {transactions.slice(0, 15).map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {t.reason || (t.source === 'call' ? 'Voice call' : t.source === 'chat' ? 'Chat reply' : t.type)}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[12px] text-ink-soft">
                  <Clock className="h-3 w-3" />
                  {new Date(t.createdAt).toLocaleString()}
                </p>
              </div>
              <span
                className={cn(
                  'flex-none text-sm font-semibold tabular-nums',
                  t.amount >= 0 ? 'text-success' : 'text-ink'
                )}
              >
                {t.amount >= 0 ? `+${fmt(t.amount)}` : `−${fmt(-t.amount)}`}
              </span>
            </div>
          ))}
        </Card>
      )}

      <p className="mt-6 text-[12px] leading-relaxed text-ink-faint">
        Note: plan changes and credit packs apply immediately — no payment gateway is connected yet.
      </p>
    </PageContainer>
  );
}
