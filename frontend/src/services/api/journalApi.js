import { apiRequest, buildQueryString } from './client.js';

export const journalApi = {
  getChartOfAccounts() {
    return apiRequest('/journal/accounts');
  },
  getGeneralLedger({ accountCode, dateFrom, dateTo } = {}) {
    return apiRequest(`/journal/general-ledger${buildQueryString({ accountCode, dateFrom, dateTo })}`);
  },
  getTrialBalance({ dateTo } = {}) {
    return apiRequest(`/journal/trial-balance${buildQueryString({ dateTo })}`);
  },
};
