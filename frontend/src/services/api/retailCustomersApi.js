import { apiRequest, buildQueryString } from './client.js';

export const retailCustomersApi = {
  listRetailCustomers({ page, pageSize, search, status } = {}) {
    return apiRequest(`/retail-customers${buildQueryString({ page, pageSize, search, status })}`);
  },

  getActiveRetailCustomers() {
    return apiRequest("/retail-customers/active");
  },

  getRetailCustomer(id) {
    return apiRequest(`/retail-customers/${id}`);
  },

  createRetailCustomer(customer) {
    return apiRequest("/retail-customers", { method: "POST", body: JSON.stringify(customer) });
  },

  updateRetailCustomer(customer) {
    return apiRequest(`/retail-customers/${customer.id}`, { method: "PUT", body: JSON.stringify(customer) });
  },

  deleteRetailCustomer(id, reason) {
    return apiRequest(`/retail-customers/${id}`, { method: "DELETE", body: JSON.stringify({ reason }) });
  },

  listRetailCustomersTrash({ page, pageSize } = {}) {
    return apiRequest(`/retail-customers/trash${buildQueryString({ page, pageSize })}`);
  },

  restoreRetailCustomer(id) {
    return apiRequest(`/retail-customers/${id}/restore`, { method: "POST" });
  },

  permanentlyDeleteRetailCustomer(id) {
    return apiRequest(`/retail-customers/${id}/permanent`, { method: "DELETE" });
  },
};
