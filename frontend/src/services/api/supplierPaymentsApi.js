import { apiRequest, buildQueryString } from './client.js';

export const supplierPaymentsApi = {
  listSupplierPayments({ page, pageSize, supplierId, dateFrom, dateTo } = {}) {
    return apiRequest(`/supplier-payments${buildQueryString({ page, pageSize, supplierId, dateFrom, dateTo })}`);
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
    return apiRequest(`/supplier-payments/trash${buildQueryString({ page, pageSize })}`);
  },

  restoreSupplierPayment(paymentId) {
    return apiRequest(`/supplier-payments/${paymentId}/restore`, { method: "POST" });
  },

  getSupplierPaymentReport({ dateFrom, dateTo, supplierId } = {}) {
    return apiRequest(`/supplier-payments/reports${buildQueryString({ dateFrom, dateTo, supplierId })}`);
  },
};
