import { apiRequest, buildQueryString } from './client.js';

export const financeAccountsApi = {
  listFinanceAccounts() {
    return apiRequest('/finance-accounts');
  },

  listFinanceAccountTransactions({ accountType, dateFrom, dateTo, page, pageSize } = {}) {
    return apiRequest(`/finance-accounts/transactions${buildQueryString({ accountType, dateFrom, dateTo, page, pageSize })}`);
  },

  createFinanceAccountTransaction(payload) {
    return apiRequest('/finance-accounts/transactions', { method: 'POST', body: JSON.stringify(payload) });
  },

  createFinanceAccountTransfer(payload) {
    return apiRequest('/finance-accounts/transfers', { method: 'POST', body: JSON.stringify(payload) });
  },

  deleteFinanceAccountTransaction(transactionId, reason) {
    return apiRequest(`/finance-accounts/transactions/${transactionId}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
  },
};
