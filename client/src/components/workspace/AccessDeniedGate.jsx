import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore.js';

/**
 * Shown to a signed-in account that isn't allowed into the app: a plain
 * (non-Admin) user who also hasn't been invited into any workspace. The app is
 * paid — access comes from registering as an admin, or being invited by one.
 */
export function AccessDeniedGate() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-3xl border border-line bg-surface p-8 text-center shadow-pop"
      >
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <Lock className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">Access denied</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          This is a paid app. To use it, register as an admin to get your own workspace — or ask an
          admin to invite you into theirs.
          {user?.email ? (
            <>
              {' '}
              You’re signed in as <span className="font-semibold text-ink">{user.email}</span>.
            </>
          ) : null}
        </p>
      </motion.div>
    </div>
  );
}
