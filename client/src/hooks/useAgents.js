import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { agentService } from '../services/agentService.js';

export function useAgentsList(params = {}) {
  return useQuery({
    queryKey: ['agents', params],
    queryFn: () => agentService.list(params),
  });
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['agents', 'summary'],
    queryFn: () => agentService.summary(),
  });
}

export function useAgent(agentId) {
  return useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => agentService.get(agentId),
    enabled: Boolean(agentId),
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (agentId) => agentService.remove(agentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Agent deleted.');
    },
    onError: (err) => toast.error(err.normalizedMessage || 'Could not delete the agent.'),
  });
}

export function useToggleAgentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => agentService.update(id, { status }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['agents'] });
      qc.invalidateQueries({ queryKey: ['agent'] });
      toast.success(`Agent ${data.agent.status === 'active' ? 'enabled' : 'disabled'}.`);
    },
    onError: (err) => toast.error(err.normalizedMessage || 'Could not update the agent.'),
  });
}

export function useUpdateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }) => agentService.update(id, updates),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['agents'] });
      qc.setQueryData(['agent', data.agent.id], data);
    },
  });
}
