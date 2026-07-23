import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { leadService } from '../services/leadService.js';

export function useLeads(params = {}) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: () => leadService.list(params),
  });
}

export function useLeadsSummary() {
  return useQuery({
    queryKey: ['leads', 'summary'],
    queryFn: () => leadService.summary(),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }) => leadService.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err) => toast.error(err.normalizedMessage || 'Could not update the lead.'),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => leadService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead deleted.');
    },
    onError: (err) => toast.error(err.normalizedMessage || 'Could not delete the lead.'),
  });
}
