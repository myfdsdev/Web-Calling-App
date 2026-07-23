import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MoreVertical, Phone, Pencil, Eye, Trash2, Power, Palette } from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { AgentAvatar } from '../ui/Avatar.jsx';
import { AgentStatusBadge } from './AgentStatusBadge.jsx';
import { staggerItem } from '../../lib/motion.js';
import { cn } from '../../lib/cn.js';

function MoreMenu({ agent, onDelete, onToggleStatus }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-white/[0.06] hover:text-ink focus-ring"
        aria-label="More options"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.12 }}
          className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-pop"
        >
          <MenuItem icon={Eye} onClick={() => navigate(`/agents/${agent.id}`)}>
            View details
          </MenuItem>
          <MenuItem icon={Pencil} onClick={() => navigate(`/agents/${agent.id}/edit`)}>
            Edit agent
          </MenuItem>
          <MenuItem icon={Palette} onClick={() => navigate(`/agents/${agent.id}/customize`)}>
            Customize
          </MenuItem>
          <MenuItem icon={Power} onClick={() => { setOpen(false); onToggleStatus(agent); }}>
            {agent.status === 'active' ? 'Disable' : 'Enable'}
          </MenuItem>
          <div className="my-1 h-px bg-line" />
          <MenuItem icon={Trash2} destructive onClick={() => { setOpen(false); onDelete(agent); }}>
            Delete
          </MenuItem>
        </motion.div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, children, destructive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
        destructive ? 'text-danger hover:bg-danger/10' : 'text-ink hover:bg-white/[0.06]'
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

export function AgentCard({ agent, onDelete, onToggleStatus }) {
  const navigate = useNavigate();
  const languages = agent.languages?.length ? agent.languages : [];

  return (
    <motion.div variants={staggerItem}>
      <Card hoverable className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between">
          <AgentAvatar name={agent.name} size="md" />
          <div className="flex items-center gap-1.5">
            <AgentStatusBadge status={agent.status} />
            <MoreMenu agent={agent} onDelete={onDelete} onToggleStatus={onToggleStatus} />
          </div>
        </div>

        <div className="mt-4 min-w-0">
          <h3 className="truncate text-card-title font-semibold text-ink">{agent.name}</h3>
          {agent.businessName && (
            <p className="truncate text-[13px] text-ink-soft">{agent.businessName}</p>
          )}
        </div>

        <p className="mt-3 line-clamp-2 min-h-[40px] text-sm leading-relaxed text-ink-soft">
          {agent.purpose ? `Handles ${agent.purpose.toLowerCase()}.` : 'Voice agent.'}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {languages.slice(0, 3).map((lang) => (
            <span
              key={lang}
              className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-ink-soft"
            >
              {lang}
            </span>
          ))}
          {agent.voiceName && (
            <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-medium text-primary">
              {agent.voiceName} voice
            </span>
          )}
        </div>

        <div className="mt-5 flex items-center gap-2 border-t border-line/70 pt-4">
          <Button
            size="sm"
            variant="primary"
            className="flex-1"
            onClick={() => navigate(`/agents/${agent.id}/test`)}
          >
            <Phone className="h-3.5 w-3.5" />
            Test
          </Button>
          <Button size="sm" variant="secondary" onClick={() => navigate(`/agents/${agent.id}/edit`)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => navigate(`/agents/${agent.id}`)}>
            Details
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
