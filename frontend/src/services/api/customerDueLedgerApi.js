import { apiRequest, buildQueryString } from './client.js';

export const customerDueLedgerApi = {
  listCustomerDueLedger({ page, pageSize, customerId, dateFrom, dateTo } = {}) {
    return apiRequest(`/customer-due-ledger${buildQueryString({ page, pageSize, customerId, dateFrom, dateTo })}`);
  },

  getCustomerDueStatement({ customerId, dateFrom, dateTo } = {}) {
    return apiRequest(`/customer-due-ledger/statement${buildQueryString({ customerId, dateFrom, dateTo })}`);
  },

  getCustomerDueBalance(customerId) {
    return apiRequest(`/customer-due-ledger/balance${buildQueryString({ customerId })}`);
  },

  getCustomerDueReport() {
    return apiRequest(`/customer-due-ledger/due-report`);
  },
};
