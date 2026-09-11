/**
 * Workspace roles and exactly what each one may do.
 *
 *   owner  — the account behind the workspace. Exactly one; can do anything.
 *   admin  — runs the team day to day: people, agents, leads.
 *   member — builds agents and works the leads. Cannot manage people.
 *   viewer — read-only.
 *
 * Every permission check in the API goes through `can()` so the matrix below is
 * the single source of truth (the client fetches the same list to gate its UI).
 */

export const ROLES = ['owner', 'admin', 'member', 'viewer'];

/**
 * Roles that can be handed out through an invite or a role change. `owner` is
 * never one of them, and neither is `admin`: the owner runs the account, and
 * people who join by invite are here to build agents and work leads, not to
 * manage the team or reach the workspace's API keys.
 */
export const ASSIGNABLE_ROLES = ['member', 'viewer'];

/**
 * Every non-owner role a stored membership or invite may legitimately hold.
 * Wider than ASSIGNABLE_ROLES on purpose — `admin` is no longer offered anywhere
 * in the UI, but rows written before that must still load and save.
 */
export const STORABLE_ROLES = ['admin', 'member', 'viewer'];

export const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

export const ROLE_DESCRIPTIONS = {
  owner: 'Full access, including deleting the workspace.',
  admin: 'Invite teammates and manage agents & leads.',
  member: 'Build and edit agents, and work the leads.',
  viewer: 'Read-only access to agents and leads.',
};

/** Higher rank = more authority. Stops admins from demoting each other. */
export const ROLE_RANK = { owner: 3, admin: 2, member: 1, viewer: 0 };

export const ALL_PERMISSIONS = [
  'workspace:read',
  'workspace:update',
  'workspace:delete',
  'members:read',
  'members:invite',
  'members:manage',
  'agents:read',
  'agents:write',
  'leads:read',
  'leads:write',
  'apikeys:read',
  'apikeys:manage',
];

const PERMISSIONS = {
  owner: ALL_PERMISSIONS,
  admin: [
    'workspace:read',
    'workspace:update',
    'members:read',
    'members:invite',
    'members:manage',
    'agents:read',
    'agents:write',
    'leads:read',
    'leads:write',
    'apikeys:read',
    'apikeys:manage',
  ],
  member: [
    'workspace:read',
    'members:read',
    'agents:read',
    'agents:write',
    'leads:read',
    'leads:write',
  ],
  viewer: ['workspace:read', 'members:read', 'agents:read', 'leads:read'],
};

/** True when `role` holds `permission`. */
export function can(role, permission) {
  return (PERMISSIONS[role] || []).includes(permission);
}

/** The full permission list for a role — sent to the client for UI gating. */
export function permissionsFor(role) {
  return [...(PERMISSIONS[role] || [])];
}

/** The role catalogue shown in the invite / change-role pickers. */
export const ROLE_CATALOGUE = ASSIGNABLE_ROLES.map((id) => ({
  id,
  label: ROLE_LABELS[id],
  description: ROLE_DESCRIPTIONS[id],
}));
