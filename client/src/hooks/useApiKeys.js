import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiKeysService } from '../services/apiKeysService.js';

export function useApiKeys(workspaceId, enabled = true) {
  return useQuery({
    queryKey: ['workspace', workspaceId, 'api-keys'],
    queryFn: () => apiKeysService.get(workspaceId),
    enabled: Boolean(workspaceId) && enabled,
  });
}

export function useSaveApiKeys(workspaceId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => apiKeysService.save(workspaceId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace', workspaceId, 'api-keys'] });
      // A newly-added Vapi key changes what the browser can do (web calling).
      qc.invalidateQueries({ queryKey: ['vapi-config'] });
      toast.success('API keys saved.');
    },
    onError: (err) => toast.error(err.normalizedMessage || 'Could not save your keys.'),
  });
}

export function useClearApiKey(workspaceId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider) => apiKeysService.clear(workspaceId, provider),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace', workspaceId, 'api-keys'] });
      toast.success('Key removed.');
    },
    onError: (err) => toast.error(err.normalizedMessage || 'Could not remove the key.'),
  });
}
