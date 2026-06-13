import { apiRequest } from './client.js';

export const customersApi = {
  listCustomers({ page, pageSize, search, status, assignedDsrId } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (assignedDsrId) params.set("assignedDsrId", assignedDsrId);
    const query = params.toString();
    return apiRequest(`/customers${query ? `?${query}` : ""}`);
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
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiRequest(`/customers/trash${query ? `?${query}` : ""}`);
  },

  restoreCustomer(customerId) {
    return apiRequest(`/customers/${customerId}/restore`, { method: "POST" });
  },

  permanentlyDeleteCustomer(customerId) {
    return apiRequest(`/customers/${customerId}/permanent`, { method: "DELETE" });
  },
};
