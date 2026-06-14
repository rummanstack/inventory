import { apiRequest, buildQueryString } from './client.js';

export const suppliersApi = {
  listSuppliers({ page, pageSize, search, status } = {}) {
    return apiRequest(`/suppliers${buildQueryString({ page, pageSize, search, status })}`);
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
    return apiRequest(`/suppliers/trash${buildQueryString({ page, pageSize })}`);
  },

  restoreSupplier(supplierId) {
    return apiRequest(`/suppliers/${supplierId}/restore`, { method: "POST" });
  },

  permanentlyDeleteSupplier(supplierId) {
    return apiRequest(`/suppliers/${supplierId}/permanent`, { method: "DELETE" });
  },
};
