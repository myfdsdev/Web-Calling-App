import { useEffect, useState } from 'react';
import { useActiveWorkspace } from '../../hooks/useWorkspaces.js';
import { ApiKeysDialog } from './ApiKeysDialog.jsx';

/**
 * Opens the API-keys popup once, right after sign-up (flag set on the signup
 * page). Mounted inside the authenticated layout so it can appear over the first
 * screen the new user lands on.
 */
export function OnboardingApiKeys() {
  const active = useActiveWorkspace();
  const [open, setOpen] = useState(false);

  const canManage = Boolean(active?.permissions?.includes('apikeys:manage'));

  useEffect(() => {
    if (localStorage.getItem('vox.justSignedUp') !== '1') return;
    // Wait until the active workspace is known. Only prompt when the user can
    // actually manage its keys (a normal signup lands on their own workspace; a
    // signup that came through an invite lands on a team they can't configure).
    if (!active) return;
    localStorage.removeItem('vox.justSignedUp');
    if (canManage) setOpen(true);
  }, [active, canManage]);

  if (!active) return null;
  return (
    <ApiKeysDialog
      open={open}
      onClose={() => setOpen(false)}
      workspaceId={active.id}
      canManage={canManage}
      onboarding
    />
  );
}
