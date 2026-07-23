import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Bot,
  Users,
  Plus,
  Search,
  ChevronsUpDown,
  LogOut,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { useAuthStore } from '../../stores/authStore.js';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/agents', label: 'Agents', icon: Bot, end: false },
  { to: '/leads', label: 'Leads', icon: Users, end: false },
];

function Logo() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5 rounded-lg focus-ring">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-[#0A0A0A]">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <rect x="4" y="9" width="2" height="6" rx="1" />
          <rect x="8" y="6" width="2" height="12" rx="1" />
          <rect x="12" y="3" width="2" height="18" rx="1" />
          <rect x="16" y="7" width="2" height="10" rx="1" />
        </svg>
      </span>
      <span className="text-[15px] font-bold tracking-tight text-ink">Vox</span>
    </Link>
  );
}

function NavItem({ to, label, icon: Icon, end, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] font-medium transition-colors',
          isActive
            ? 'border border-white/10 bg-white/[0.07] text-ink'
            : 'border border-transparent text-ink-soft hover:bg-white/[0.04] hover:text-ink'
        )
      }
    >
      <Icon className="h-[18px] w-[18px]" />
      {label}
    </NavLink>
  );
}

function WorkspacePill() {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const first = user?.name?.split(' ')[0] || 'My';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-lg border border-line px-2.5 py-2 text-left transition-colors hover:bg-white/[0.04] focus-ring"
      >
        <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-white/10 text-[11px] font-bold text-ink">
          {(user?.name || 'U').slice(0, 1).toUpperCase()}
        </span>
        <span className="flex-1 truncate text-[13px] font-semibold text-ink">{first}’s workspace</span>
        <ChevronsUpDown className="h-4 w-4 flex-none text-ink-soft" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-pop"
          >
            <div className="px-2.5 py-2">
              <p className="truncate text-[13px] font-semibold text-ink">{user?.name}</p>
              <p className="truncate text-[12px] text-ink-soft">{user?.email}</p>
            </div>
            <div className="my-1 h-px bg-line" />
            <button
              onClick={() => {
                setOpen(false);
                logout();
                navigate('/login');
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-white/[0.06]"
            >
              <LogOut className="h-4 w-4 text-ink-soft" />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="px-2.5 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
      {children}
    </p>
  );
}

function SidebarContent({ onNavigate }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <Logo />
        <button
          onClick={() => {
            onNavigate?.();
            navigate('/agents');
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-white/[0.06] hover:text-ink focus-ring"
          aria-label="Search agents"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      {/* Workspace */}
      <div className="px-3">
        <WorkspacePill />
      </div>

      {/* Nav */}
      <nav className="mt-3 flex-1 overflow-y-auto px-3 pb-4">
        <div className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <NavItem key={item.to} {...item} onNavigate={onNavigate} />
          ))}
        </div>

        <SectionLabel>Create</SectionLabel>
        <NavItem to="/agents/create" label="New Agent" icon={Plus} onNavigate={onNavigate} />
      </nav>

      {/* Footer */}
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/10 text-[12px] font-bold text-ink">
            {(user?.name || 'U').slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink">{user?.name}</p>
            <p className="truncate text-[11px] text-ink-soft">{user?.email}</p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-white/[0.06] hover:text-ink focus-ring"
            aria-label="Sign out"
            title="Sign out"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-canvas/90 px-4 backdrop-blur lg:hidden">
        <Logo />
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-white/[0.06] hover:text-ink focus-ring"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-line bg-canvas lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute inset-y-0 left-0 w-[280px] border-r border-line bg-canvas"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-white/[0.06] focus-ring"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
