import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button.jsx';

export function ErrorState({ title = 'Something went wrong', message, onRetry, retryLabel = 'Try again' }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-surface px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-bold text-ink">{title}</h3>
      {message && <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-soft">{message}</p>}
      {onRetry && (
        <Button variant="secondary" className="mt-6" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
