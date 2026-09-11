import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Bot,
  Users,
  UsersRound,
  Plus,
  PlayCircle,
  Search,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { useIsWorkspaceOwner } from '../../hooks/useWorkspaces.js';
import { WorkspaceSwitcher } from './WorkspaceSwitcher.jsx';
import { DEMO_VIDEO_ID } from '../../config/demoVideo.js';
import { OPEN_DEMO_EVENT } from '../onboarding/DemoVideoPopup.jsx';


const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/agents', label: 'Agents', icon: Bot, end: false },
  { to: '/leads', label: 'Leads', icon: Users, end: false },
  // Owner-only — someone who joined through an invite never sees it. The /team
  // route is guarded too, so the link isn't the only thing standing in the way.
  { to: '/team', label: 'Admin', icon: UsersRound, end: false, ownerOnly: true },
];

function Logo({ className }) {
  return (
    <Link to="/dashboard" className="flex items-center rounded-lg focus-ring">
      {/* Height-driven with w-auto (aspect preserved) + shrink-0 so flexbox never
          squishes it. Pass a height via className to size it per placement. */}
      <img
        src="/ringweb.png"
        alt="ringwebai"
        className={cn('h-11 w-auto shrink-0 object-contain', className)}
      />
    </Link>
  );
}

// Shared so the non-route "Watch demo" button sits flush with the real nav links.
const ITEM_BASE =
  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] font-medium transition-colors';
const ITEM_ACTIVE = 'border border-white/10 bg-white/[0.07] text-ink';
const ITEM_IDLE = 'border border-transparent text-ink-soft hover:bg-white/[0.04] hover:text-ink';

function NavItem({ to, label, icon: Icon, end, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) => cn(ITEM_BASE, isActive ? ITEM_ACTIVE : ITEM_IDLE)}
    >
      <Icon className="h-[18px] w-[18px]" />
      {label}
    </NavLink>
  );
}

/** Re-opens the demo popup mounted in the protected layout. Hidden when unset. */
function WatchDemoItem({ onNavigate }) {
  if (!DEMO_VIDEO_ID) return null;
  return (
    <button
      type="button"
      onClick={() => {
        onNavigate?.();
        window.dispatchEvent(new Event(OPEN_DEMO_EVENT));
      }}
      className={cn(ITEM_BASE, ITEM_IDLE, 'w-full text-left focus-ring')}
    >
      <PlayCircle className="h-[18px] w-[18px]" />
      Training video
    </button>
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
  const isOwner = useIsWorkspaceOwner();

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <Logo className="h-14" />
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
        <WorkspaceSwitcher />
      </div>

      {/* Nav */}
      <nav className="mt-3 flex-1 overflow-y-auto px-3 pb-4">
        <div className="flex flex-col gap-0.5">
          {NAV.filter((item) => isOwner || !item.ownerOnly).map((item) => (
            <NavItem key={item.to} {...item} onNavigate={onNavigate} />
          ))}
        </div>

        <SectionLabel>Create</SectionLabel>
        <NavItem to="/agents/create" label="New Agent" icon={Plus} onNavigate={onNavigate} />

        {DEMO_VIDEO_ID && (
          <>
            <SectionLabel>Learn</SectionLabel>
            <WatchDemoItem onNavigate={onNavigate} />
          </>
        )}
      </nav>
    </div>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-canvas/90 px-4 backdrop-blur lg:hidden">
        <Logo className="h-10" />
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
