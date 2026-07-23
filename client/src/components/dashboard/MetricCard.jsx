import { motion } from 'framer-motion';
import { Card } from '../ui/Card.jsx';
import { staggerItem } from '../../lib/motion.js';
import { cn } from '../../lib/cn.js';

export function MetricCard({ icon: Icon, label, value, tone = 'primary', hint }) {
  const tones = {
    primary: 'bg-white/[0.06] text-ink',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    sky: 'bg-white/[0.06] text-ink',
  };
  return (
    <motion.div variants={staggerItem}>
      <Card className="p-5">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="mt-4 text-[13px] font-medium text-ink-soft">{label}</p>
        <p className="mt-0.5 text-[28px] font-bold leading-none text-ink">{value}</p>
        {hint && <p className="mt-1.5 text-xs text-ink-soft">{hint}</p>}
      </Card>
    </motion.div>
  );
}
