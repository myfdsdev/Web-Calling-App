import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { billingService } from '../services/billingService.js';

export function usePlans() {
  return useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: () => billingService.plans(),
    staleTime: Infinity,
  });
}

export function useMyBilling() {
  return useQuery({
    queryKey: ['billing', 'me'],
    queryFn: () => billingService.me(),
  });
}

export function useCreditTransactions() {
  return useQuery({
    queryKey: ['billing', 'transactions'],
    queryFn: () => billingService.transactions(),
  });
}

export function useSetPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planId) => billingService.setPlan(planId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['billing'] });
      toast.success(`You're on the ${data.plan.name} plan.`);
    },
    onError: (err) => toast.error(err.normalizedMessage || 'Could not change the plan.'),
  });
}

export function useTopUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (packId) => billingService.topUp(packId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing'] });
      toast.success('Credits added.');
    },
    onError: (err) => toast.error(err.normalizedMessage || 'Could not add credits.'),
  });
}
