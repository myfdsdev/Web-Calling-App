import { motion } from 'framer-motion';
import { cn } from '../../lib/cn.js';

export function Card({ className, hoverable = false, as: Comp = 'div', ...props }) {
  return (
    <Comp
      className={cn(
        'bg-surface border border-line rounded-2xl shadow-card',
        hoverable &&
          'transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:shadow-card-hover',
        className
      )}
      {...props}
    />
  );
}

export function MotionCard({ className, hoverable = false, ...props }) {
  return (
    <motion.div
      className={cn(
        'bg-surface border border-line rounded-2xl shadow-card',
        hoverable && 'transition-shadow duration-200 hover:shadow-card-hover',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('px-6 py-5 border-b border-line/80', className)} {...props} />;
}

export function CardBody({ className, ...props }) {
  return <div className={cn('p-6', className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return <div className={cn('px-6 py-4 border-t border-line/80', className)} {...props} />;
}
