/** Two-letter initials from an agent/business name. */
export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'VA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// A small, deterministic palette so each agent avatar has a stable color.
const AVATAR_GRADIENTS = [
  'from-[#6C5CE7] to-[#8B7CF0]',
  'from-[#16A36A] to-[#3CC98C]',
  'from-[#F59E0B] to-[#FBBF24]',
  'from-[#0EA5E9] to-[#38BDF8]',
  'from-[#E5484D] to-[#F06A6E]',
  'from-[#7C3AED] to-[#A78BFA]',
];

export function avatarGradient(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

/** Append an alpha channel (0..1) to a #RRGGBB hex → #RRGGBBAA. */
export function hexAlpha(hex, alpha = 1) {
  if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) return hex || '#6C5CE7';
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

export const STATUS_LABELS = {
  active: 'Active',
  draft: 'Draft',
  disabled: 'Disabled',
  failed: 'Failed',
  creating: 'Creating',
  'ready-for-review': 'Ready',
  created: 'Created',
};
