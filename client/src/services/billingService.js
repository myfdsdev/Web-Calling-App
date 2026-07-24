import { api, unwrap } from './api.js';

export const billingService = {
  plans: () => unwrap(api.get('/billing/plans')),
  me: () => unwrap(api.get('/billing/me')),
  transactions: () => unwrap(api.get('/billing/transactions')),
  setPlan: (planId) => unwrap(api.post('/billing/plan', { planId })),
  topUp: (packId) => unwrap(api.post('/billing/topup', { packId })),
};
