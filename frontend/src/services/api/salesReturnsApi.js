import { apiRequest, buildQueryString } from './client.js';

export const salesReturnsApi = {
  listSalesReturns({ page, pageSize, customerId, salesInvoiceId, dateFrom, dateTo } = {}) {
    return apiRequest(`/sales-returns${buildQueryString({ page, pageSize, customerId, salesInvoiceId, dateFrom, dateTo })}`);
  },

  getSalesReturn(returnId) {
    return apiRequest(`/sales-returns/${returnId}`);
  },

  createSalesReturn(salesReturn) {
    return apiRequest("/sales-returns", { method: "POST", body: JSON.stringify(salesReturn) });
  },

  getSalesReturnReport({ dateFrom, dateTo } = {}) {
    return apiRequest(`/sales-returns/reports${buildQueryString({ dateFrom, dateTo })}`);
  },
};
