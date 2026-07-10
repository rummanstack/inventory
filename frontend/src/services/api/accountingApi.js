import { apiRequest } from './client.js';

export const accountingApi = {
  getAccountingDashboard() {
    return apiRequest('/accounting/dashboard');
  },

  listChartAccounts() {
    return apiRequest('/accounting/accounts');
  },

  createChartAccount(data) {
    return apiRequest('/accounting/accounts', { method: 'POST', body: JSON.stringify(data) });
  },

  updateChartAccount(code, data) {
    return apiRequest(`/accounting/accounts/${code}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  listFiscalYears() {
    return apiRequest('/accounting/fiscal-years');
  },

  createFiscalYear(data) {
    return apiRequest('/accounting/fiscal-years', { method: 'POST', body: JSON.stringify(data) });
  },

  activateFiscalYear(id) {
    return apiRequest(`/accounting/fiscal-years/${id}/activate`, { method: 'POST' });
  },

  closeFiscalYear(id) {
    return apiRequest(`/accounting/fiscal-years/${id}/close`, { method: 'POST' });
  },

  previewFiscalYearClose(id) {
    return apiRequest(`/accounting/fiscal-years/${id}/close-preview`);
  },

  reopenFiscalYear(id, data = {}) {
    return apiRequest(`/accounting/fiscal-years/${id}/reopen`, { method: 'POST', body: JSON.stringify(data) });
  },

  generateYearOpening(id, data = {}) {
    return apiRequest(`/accounting/fiscal-years/${id}/generate-openings`, { method: 'POST', body: JSON.stringify(data) });
  },

  openAccountingPeriod(id) {
    return apiRequest(`/accounting/periods/${id}/open`, { method: 'POST' });
  },

  closeAccountingPeriod(id) {
    return apiRequest(`/accounting/periods/${id}/close`, { method: 'POST' });
  },

  lockAccountingPeriod(id) {
    return apiRequest(`/accounting/periods/${id}/lock`, { method: 'POST' });
  },

  unlockAccountingPeriod(id) {
    return apiRequest(`/accounting/periods/${id}/unlock`, { method: 'POST' });
  },

  reopenAccountingPeriod(id) {
    return apiRequest(`/accounting/periods/${id}/reopen`, { method: 'POST' });
  },

  listOpeningBalances() {
    return apiRequest('/accounting/opening-balances');
  },

  createOpeningBalance(data) {
    return apiRequest('/accounting/opening-balances', { method: 'POST', body: JSON.stringify(data) });
  },

  updateOpeningBalance(id, data) {
    return apiRequest(`/accounting/opening-balances/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  getAccountingSettings() {
    return apiRequest('/accounting/settings');
  },

  updateAccountingSettings(data) {
    return apiRequest('/accounting/settings', { method: 'PUT', body: JSON.stringify(data) });
  },

  reverseJournalEntry(id, data) {
    return apiRequest(`/accounting/journals/${id}/reverse`, { method: 'POST', body: JSON.stringify(data) });
  },
};
