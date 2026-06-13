import { apiRequest } from './client.js';

export const suppliersApi = {
  listSuppliers({ page, pageSize, search, status } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const query = params.toString();
    return apiRequest(`/suppliers${query ? `?${query}` : ""}`);
  },

  getActiveSuppliers() {
    return apiRequest("/suppliers/active");
  },

  getSupplier(supplierId) {
    return apiRequest(`/suppliers/${supplierId}`);
  },

  createSupplier(supplier) {
    return apiRequest("/suppliers", { method: "POST", body: JSON.stringify(supplier) });
  },

  updateSupplier(supplier) {
    return apiRequest(`/suppliers/${supplier.id}`, { method: "PUT", body: JSON.stringify(supplier) });
  },

  deleteSupplier(supplierId, reason) {
    return apiRequest(`/suppliers/${supplierId}`, { method: "DELETE", body: JSON.stringify({ reason }) });
  },

  listSuppliersTrash({ page, pageSize } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiRequest(`/suppliers/trash${query ? `?${query}` : ""}`);
  },

  restoreSupplier(supplierId) {
    return apiRequest(`/suppliers/${supplierId}/restore`, { method: "POST" });
  },

  permanentlyDeleteSupplier(supplierId) {
    return apiRequest(`/suppliers/${supplierId}/permanent`, { method: "DELETE" });
  },
};
