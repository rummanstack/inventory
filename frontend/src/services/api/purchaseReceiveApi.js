import { apiRequest } from './client.js';

export const purchaseReceiveApi = {
  listPurchaseReceipts({ page, pageSize, search, supplierId, purchaseNumber, supplierInvoiceNo, dateFrom, dateTo, paymentStatus } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (search) params.set("search", search);
    if (supplierId) params.set("supplierId", supplierId);
    if (purchaseNumber) params.set("purchaseNumber", purchaseNumber);
    if (supplierInvoiceNo) params.set("supplierInvoiceNo", supplierInvoiceNo);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    const query = params.toString();
    return apiRequest(`/purchase-receive${query ? `?${query}` : ""}`);
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
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiRequest(`/purchase-receive/trash${query ? `?${query}` : ""}`);
  },

  restorePurchaseReceipt(purchaseReceiptId) {
    return apiRequest(`/purchase-receive/${purchaseReceiptId}/restore`, { method: "POST" });
  },
};
