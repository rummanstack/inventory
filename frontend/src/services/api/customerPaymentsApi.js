import { apiRequest, buildQueryString } from './client.js';

export const customerPaymentsApi = {
  listCustomerPayments({ page, pageSize, customerId, dateFrom, dateTo } = {}) {
    return apiRequest(`/customer-payments${buildQueryString({ page, pageSize, customerId, dateFrom, dateTo })}`);
  },

  getCustomerPayment(paymentId) {
    return apiRequest(`/customer-payments/${paymentId}`);
  },

  createCustomerPayment(payment) {
    return apiRequest("/customer-payments", { method: "POST", body: JSON.stringify(payment) });
  },

  updateCustomerPayment(payment) {
    return apiRequest(`/customer-payments/${payment.id}`, { method: "PUT", body: JSON.stringify(payment) });
  },

  deleteCustomerPayment(paymentId, reason) {
    return apiRequest(`/customer-payments/${paymentId}`, { method: "DELETE", body: JSON.stringify({ reason }) });
  },

  listCustomerPaymentsTrash({ page, pageSize } = {}) {
    return apiRequest(`/customer-payments/trash${buildQueryString({ page, pageSize })}`);
  },

  restoreCustomerPayment(paymentId) {
    return apiRequest(`/customer-payments/${paymentId}/restore`, { method: "POST" });
  },
};
