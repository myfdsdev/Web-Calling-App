import { motion } from 'framer-motion';

/** Split-screen auth layout: brand panel + form. */
export function AuthShell({ children }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Brand panel */}
      <div className="relative hidden w-[46%] overflow-hidden border-r border-line lg:block">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(700px 340px at 25% 20%, rgba(255,255,255,0.07), transparent), #050506' }}
        />
        <div className="absolute -left-16 top-24 h-72 w-72 rounded-full bg-white/[0.04] blur-3xl" />
        <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-white/[0.03] blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12 text-ink">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.06]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <rect x="4" y="9" width="2" height="6" rx="1" />
                <rect x="8" y="6" width="2" height="12" rx="1" />
                <rect x="12" y="3" width="2" height="18" rx="1" />
                <rect x="16" y="7" width="2" height="10" rx="1" />
              </svg>
            </span>
            <span className="text-lg font-extrabold tracking-tight">Vox</span>
          </div>
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-md text-3xl font-bold leading-tight"
            >
              Build voice agents through conversation.
            </motion.h2>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/80">
              Answer a few simple questions and let AI craft your agent’s instructions, greeting,
              voice and business setup — no forms, no prompt engineering.
            </p>
            <div className="mt-8 flex items-center gap-6 text-sm text-white/75">
              <div>
                <p className="text-2xl font-bold text-white">10</p>
                <p>guided steps</p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div>
                <p className="text-2xl font-bold text-white">1</p>
                <p>real Vapi agent</p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div>
                <p className="text-2xl font-bold text-white">∞</p>
                <p>test calls</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-white/60">Powered by Vapi voice AI &amp; Gemini.</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-[400px]"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
