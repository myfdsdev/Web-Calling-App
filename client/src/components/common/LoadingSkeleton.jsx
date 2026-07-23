import { cn } from '../../lib/cn.js';

export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} />;
}

export function AgentCardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-4 w-1/2" />
      <Skeleton className="mt-2 h-3 w-1/3" />
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-4/5" />
      <div className="mt-5 flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-[10px]" />
        <Skeleton className="h-9 w-9 rounded-[10px]" />
      </div>
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <Skeleton className="mt-4 h-3 w-20" />
      <Skeleton className="mt-2 h-7 w-16" />
    </div>
  );
}

export function GridSkeleton({ count = 6, Item = AgentCardSkeleton }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} />
      ))}
    </div>
  );
}
