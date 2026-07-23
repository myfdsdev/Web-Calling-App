import { motion } from 'framer-motion';
import { cn } from '../../lib/cn.js';
import { pageVariants } from '../../lib/motion.js';

/** Centered page container with the standard responsive padding + max width. */
export function PageContainer({ className, children, animate = true, ...props }) {
  const Comp = animate ? motion.div : 'div';
  const motionProps = animate ? { variants: pageVariants, initial: 'hidden', animate: 'show' } : {};
  return (
    <Comp
      {...motionProps}
      className={cn(
        'mx-auto w-full max-w-content px-4 pb-10 pt-5 sm:px-6 md:pb-16 md:pt-8 lg:px-8',
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}

/** Standard page header: title + subtitle on the left, actions on the right. */
export function PageHeader({ title, subtitle, actions, className }) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink md:text-[32px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-ink-soft md:text-[15px]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-none items-center gap-2.5">{actions}</div>}
    </div>
  );
}
