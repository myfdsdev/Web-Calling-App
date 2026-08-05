import { cn } from '../../lib/cn.js';

export function FullPageLoader({ inline = false, label = 'Loading…' }) {
  return (
    <div
      className={cn(
        'flex w-full items-center justify-center',
        inline ? 'py-24' : 'min-h-screen bg-canvas'
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-end gap-1" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="w-1.5 rounded-full bg-primary"
              style={{
                height: 10 + (i % 3) * 8,
                animation: `ringwebaibar 900ms ${i * 90}ms ease-in-out infinite`,
              }}
            />
          ))}
        </div>
        <p className="text-sm font-medium text-ink-soft">{label}</p>
      </div>
      <style>{`@keyframes ringwebaibar{0%,100%{transform:scaleY(0.5)}50%{transform:scaleY(1.4)}}`}</style>
    </div>
  );
}
