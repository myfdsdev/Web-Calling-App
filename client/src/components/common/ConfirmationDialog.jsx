import { AlertTriangle } from 'lucide-react';
import { Dialog } from '../ui/Dialog.jsx';
import { Button } from '../ui/Button.jsx';

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
}) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} labelledBy="confirm-title">
      <div className="p-6">
        <div className="flex items-start gap-4">
          {destructive && (
            <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-danger/10 text-danger">
              <AlertTriangle className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-card-title font-semibold text-ink">
              {title}
            </h2>
            {description && <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{description}</p>}
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
