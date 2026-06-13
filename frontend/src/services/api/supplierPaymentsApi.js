import { apiRequest } from './client.js';

export const supplierPaymentsApi = {
  listSupplierPayments({ page, pageSize, supplierId, dateFrom, dateTo } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (supplierId) params.set("supplierId", supplierId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const query = params.toString();
    return apiRequest(`/supplier-payments${query ? `?${query}` : ""}`);
  },

  getSupplierPayment(paymentId) {
    return apiRequest(`/supplier-payments/${paymentId}`);
  },

  createSupplierPayment(payment) {
    return apiRequest("/supplier-payments", { method: "POST", body: JSON.stringify(payment) });
  },

  updateSupplierPayment(payment) {
    return apiRequest(`/supplier-payments/${payment.id}`, { method: "PUT", body: JSON.stringify(payment) });
  },

  deleteSupplierPayment(paymentId, reason) {
    return apiRequest(`/supplier-payments/${paymentId}`, { method: "DELETE", body: JSON.stringify({ reason }) });
  },

  listSupplierPaymentsTrash({ page, pageSize } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiRequest(`/supplier-payments/trash${query ? `?${query}` : ""}`);
  },

  restoreSupplierPayment(paymentId) {
    return apiRequest(`/supplier-payments/${paymentId}/restore`, { method: "POST" });
  },
};
