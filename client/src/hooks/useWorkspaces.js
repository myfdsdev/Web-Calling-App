import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { workspaceService } from '../services/workspaceService.js';
import { useWorkspaceStore } from '../stores/workspaceStore.js';

/** The active workspace object + the caller's permissions in it. */
export function useActiveWorkspace() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeId = useWorkspaceStore((s) => s.activeId);
  const active = workspaces.find((w) => w.id === activeId) || workspaces[0] || null;
  return active;
}

/** True when the caller's role in the active workspace holds `permission`. */
export function useCan(permission) {
  const active = useActiveWorkspace();
  return Boolean(active?.permissions?.includes(permission));
}

export function useWorkspaceDetails(workspaceId) {
  return useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => workspaceService.get(workspaceId),
    enabled: Boolean(workspaceId),
  });
}

export function useMembers(workspaceId) {
  return useQuery({
    queryKey: ['workspace', workspaceId, 'members'],
    queryFn: () => workspaceService.members(workspaceId),
    enabled: Boolean(workspaceId),
  });
}

export function useInvites(workspaceId, enabled = true) {
  return useQuery({
    queryKey: ['workspace', workspaceId, 'invites'],
    queryFn: () => workspaceService.invites(workspaceId),
    enabled: Boolean(workspaceId) && enabled,
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  const upsert = useWorkspaceStore((s) => s.upsert);
  const setActive = useWorkspaceStore((s) => s.setActive);
  return useMutation({
    mutationFn: (payload) => workspaceService.create(payload),
    onSuccess: ({ workspace }) => {
      upsert(workspace);
      setActive(workspace.id);
      qc.invalidateQueries();
      toast.success('Workspace created.');
    },
    onError: (err) => toast.error(err.normalizedMessage || 'Could not create the workspace.'),
  });
}

export function useInviteMember(workspaceId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => workspaceService.invite(workspaceId, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      toast.success(data.emailSent ? 'Invitation sent.' : 'Invite link ready.');
    },
    onError: (err) => toast.error(err.normalizedMessage || 'Could not create the invite.'),
  });
}

export function useRevokeInvite(workspaceId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId) => workspaceService.revokeInvite(workspaceId, inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace', workspaceId, 'invites'] });
      toast.success('Invitation revoked.');
    },
    onError: (err) => toast.error(err.normalizedMessage || 'Could not revoke the invite.'),
  });
}

export function useUpdateMemberRole(workspaceId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }) => workspaceService.updateMember(workspaceId, memberId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace', workspaceId, 'members'] });
      toast.success('Role updated.');
    },
    onError: (err) => toast.error(err.normalizedMessage || 'Could not update the role.'),
  });
}

export function useRemoveMember(workspaceId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId) => workspaceService.removeMember(workspaceId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace', workspaceId, 'members'] });
      toast.success('Member removed.');
    },
    onError: (err) => toast.error(err.normalizedMessage || 'Could not remove the member.'),
  });
}
