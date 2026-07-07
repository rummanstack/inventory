import { apiRequest, buildQueryString } from './client.js';

export const purchaseReturnsApi = {
  listPurchaseReturns({ page, pageSize, supplierId, dateFrom, dateTo } = {}) {
    return apiRequest(`/purchase-returns${buildQueryString({ page, pageSize, supplierId, dateFrom, dateTo })}`);
  },

  getPurchaseReturn(returnId) {
    return apiRequest(`/purchase-returns/${returnId}`);
  },

  createPurchaseReturn(purchaseReturn) {
    return apiRequest("/purchase-returns", { method: "POST", body: JSON.stringify(purchaseReturn) });
  },

  deletePurchaseReturn(returnId, reason) {
    return apiRequest(`/purchase-returns/${returnId}`, { method: "DELETE", body: JSON.stringify({ reason }) });
  },
};
