import { apiRequest } from './client.js';

export const dsrTargetsApi = {
  getDsrTargetSummary: (month) => apiRequest(`/dsr-targets/summary?month=${month}`),
  getDsrTargets: (month) => apiRequest(`/dsr-targets?month=${month}`),
  setDsrTargets: (targets) => apiRequest('/dsr-targets', { method: 'POST', body: JSON.stringify({ targets }) }),
};
