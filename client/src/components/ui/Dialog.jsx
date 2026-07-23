import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { modalVariants } from '../../lib/motion.js';

export function Dialog({ open, onClose, children, className, closeOnBackdrop = true, labelledBy }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeOnBackdrop ? onClose : undefined}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            variants={modalVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className={cn(
              'relative w-full max-w-lg rounded-2xl border border-line bg-surface shadow-pop',
              className
            )}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function DialogClose({ onClose }) {
  return (
    <button
      onClick={onClose}
      className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-[10px] text-ink-soft transition-colors hover:bg-white/[0.06] hover:text-ink focus-ring"
      aria-label="Close dialog"
    >
      <X className="h-4.5 w-4.5" />
    </button>
  );
}
