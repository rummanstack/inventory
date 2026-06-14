import { apiRequest, buildQueryString } from './client.js';

export const customersApi = {
  listCustomers({ page, pageSize, search, status, assignedDsrId } = {}) {
    return apiRequest(`/customers${buildQueryString({ page, pageSize, search, status, assignedDsrId })}`);
  },

  getCustomer(customerId) {
    return apiRequest(`/customers/${customerId}`);
  },

  createCustomer(customer) {
    return apiRequest("/customers", { method: "POST", body: JSON.stringify(customer) });
  },

  updateCustomer(customer) {
    return apiRequest(`/customers/${customer.id}`, { method: "PUT", body: JSON.stringify(customer) });
  },

  deleteCustomer(customerId, reason) {
    return apiRequest(`/customers/${customerId}`, { method: "DELETE", body: JSON.stringify({ reason }) });
  },

  listCustomersTrash({ page, pageSize } = {}) {
    return apiRequest(`/customers/trash${buildQueryString({ page, pageSize })}`);
  },

  restoreCustomer(customerId) {
    return apiRequest(`/customers/${customerId}/restore`, { method: "POST" });
  },

  permanentlyDeleteCustomer(customerId) {
    return apiRequest(`/customers/${customerId}/permanent`, { method: "DELETE" });
  },
};
