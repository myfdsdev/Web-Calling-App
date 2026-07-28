/**
 * Workspace roles and exactly what each one may do.
 *
 *   owner  — the billing account behind the workspace. Exactly one; can do anything.
 *   admin  — runs the team day to day: people, agents, leads. No billing changes.
 *   member — builds agents and works the leads. Cannot manage people.
 *   viewer — read-only.
 *
 * Every permission check in the API goes through `can()` so the matrix below is
 * the single source of truth (the client fetches the same list to gate its UI).
 */

export const ROLES = ['owner', 'admin', 'member', 'viewer'];

/** Roles that can be handed out through an invite — `owner` is never one of them. */
export const ASSIGNABLE_ROLES = ['admin', 'member', 'viewer'];

export const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

export const ROLE_DESCRIPTIONS = {
  owner: 'Full access, including billing and deleting the workspace.',
  admin: 'Invite teammates and manage agents & leads. No billing access.',
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
  'billing:read',
  'billing:manage',
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
    'billing:read',
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
    'billing:read',
  ],
  viewer: ['workspace:read', 'members:read', 'agents:read', 'leads:read', 'billing:read'],
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
