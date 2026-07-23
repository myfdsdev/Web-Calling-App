import { formatCallDuration } from '../../utils/formatCallDuration.js';

export function CallTimer({ seconds, className }) {
  return (
    <span className={className} aria-live="polite">
      {formatCallDuration(seconds)}
    </span>
  );
}
