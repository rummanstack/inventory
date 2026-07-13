import { apiRequest, buildQueryString } from './client.js';

export const dsrFinanceApi = {
  listDsrDueLedger({ page, pageSize, dsrId, dateFrom, dateTo } = {}) {
    return apiRequest(`/dsr-due-ledger${buildQueryString({ page, pageSize, dsrId, dateFrom, dateTo })}`);
  },

  getDsrDueStatement({ dsrId, dateFrom, dateTo } = {}) {
    return apiRequest(`/dsr-due-ledger/statement${buildQueryString({ dsrId, dateFrom, dateTo })}`);
  },

  getDsrDueBalance(dsrId) {
    return apiRequest(`/dsr-due-ledger/balance${buildQueryString({ dsrId })}`);
  },

  listDsrDueBalances() {
    return apiRequest('/dsr-due-ledger/balances');
  },

  settleDsrDue({ dsrId, amount, note }) {
    return apiRequest('/dsr-due-ledger/settle', {
      method: 'POST',
      body: JSON.stringify({ dsrId, amount, note }),
    });
  },
};
