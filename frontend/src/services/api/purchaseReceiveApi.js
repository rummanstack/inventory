import { apiRequest, buildQueryString } from './client.js';

export const purchaseReceiveApi = {
  listPurchaseReceipts({ page, pageSize, search, supplierId, purchaseNumber, supplierInvoiceNo, dateFrom, dateTo, paymentStatus } = {}) {
    return apiRequest(`/purchase-receive${buildQueryString({ page, pageSize, search, supplierId, purchaseNumber, supplierInvoiceNo, dateFrom, dateTo, paymentStatus })}`);
  },

  getPurchaseReceipt(purchaseReceiptId) {
    return apiRequest(`/purchase-receive/${purchaseReceiptId}`);
  },

  createPurchaseReceipt(purchaseReceipt) {
    return apiRequest("/purchase-receive", { method: "POST", body: JSON.stringify(purchaseReceipt) });
  },

  updatePurchaseReceipt(purchaseReceipt) {
    return apiRequest(`/purchase-receive/${purchaseReceipt.id}`, { method: "PUT", body: JSON.stringify(purchaseReceipt) });
  },

  deletePurchaseReceipt(purchaseReceiptId, reason) {
    return apiRequest(`/purchase-receive/${purchaseReceiptId}`, { method: "DELETE", body: JSON.stringify({ reason }) });
  },

  listPurchaseReceiptsTrash({ page, pageSize } = {}) {
    return apiRequest(`/purchase-receive/trash${buildQueryString({ page, pageSize })}`);
  },

  restorePurchaseReceipt(purchaseReceiptId) {
    return apiRequest(`/purchase-receive/${purchaseReceiptId}/restore`, { method: "POST" });
  },

  getPurchaseReport({ dateFrom, dateTo, supplierId } = {}) {
    return apiRequest(`/purchase-receive/reports${buildQueryString({ dateFrom, dateTo, supplierId })}`);
  },
};
