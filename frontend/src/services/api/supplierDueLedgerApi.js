import { apiRequest } from './client.js';

export const supplierDueLedgerApi = {
  listSupplierDueLedger({ page, pageSize, supplierId, dateFrom, dateTo } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (supplierId) params.set("supplierId", supplierId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const query = params.toString();
    return apiRequest(`/supplier-due-ledger${query ? `?${query}` : ""}`);
  },

  getSupplierDueStatement({ supplierId, dateFrom, dateTo } = {}) {
    const params = new URLSearchParams();
    if (supplierId) params.set("supplierId", supplierId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const query = params.toString();
    return apiRequest(`/supplier-due-ledger/statement${query ? `?${query}` : ""}`);
  },

  getSupplierDueBalance(supplierId) {
    const params = new URLSearchParams();
    if (supplierId) params.set("supplierId", supplierId);
    const query = params.toString();
    return apiRequest(`/supplier-due-ledger/balance${query ? `?${query}` : ""}`);
  },
};
