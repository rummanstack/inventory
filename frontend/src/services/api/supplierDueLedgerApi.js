import { apiRequest, buildQueryString } from './client.js';

export const supplierDueLedgerApi = {
  listSupplierDueLedger({ page, pageSize, supplierId, dateFrom, dateTo } = {}) {
    return apiRequest(`/supplier-due-ledger${buildQueryString({ page, pageSize, supplierId, dateFrom, dateTo })}`);
  },

  getSupplierDueStatement({ supplierId, dateFrom, dateTo } = {}) {
    return apiRequest(`/supplier-due-ledger/statement${buildQueryString({ supplierId, dateFrom, dateTo })}`);
  },

  getSupplierDueBalance(supplierId) {
    return apiRequest(`/supplier-due-ledger/balance${buildQueryString({ supplierId })}`);
  },
};
