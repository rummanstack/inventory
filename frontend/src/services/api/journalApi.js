import { apiRequest, buildQueryString } from './client.js';

export const journalApi = {
  getReportReferenceData() {
    return apiRequest('/financial-reports/reference-data');
  },
  getChartOfAccounts() {
    return apiRequest('/journal/accounts');
  },
  getGeneralLedger(filters = {}) {
    return apiRequest(`/financial-reports/general-ledger${buildQueryString(filters)}`);
  },
  getAccountLedger(filters = {}) {
    return apiRequest(`/financial-reports/account-ledger${buildQueryString(filters)}`);
  },
  getTrialBalance(filters = {}) {
    return apiRequest(`/financial-reports/trial-balance${buildQueryString(filters)}`);
  },
  getCustomerLedger(filters = {}) {
    return apiRequest(`/financial-reports/customer-ledger${buildQueryString(filters)}`);
  },
  getSupplierLedger(filters = {}) {
    return apiRequest(`/financial-reports/supplier-ledger${buildQueryString(filters)}`);
  },
  getCashBook(filters = {}) {
    return apiRequest(`/financial-reports/cash-book${buildQueryString(filters)}`);
  },
  getBankBook(filters = {}) {
    return apiRequest(`/financial-reports/bank-book${buildQueryString(filters)}`);
  },
  getBalanceSheet(filters = {}) {
    return apiRequest(`/financial-reports/balance-sheet${buildQueryString(filters)}`);
  },
  getProfitAndLoss(filters = {}) {
    return apiRequest(`/financial-reports/profit-and-loss${buildQueryString(filters)}`);
  },
  getCashFlow(filters = {}) {
    return apiRequest(`/financial-reports/cash-flow${buildQueryString(filters)}`);
  },
};
