import { apiRequest } from './client.js';

export const platformApi = {
  listTenants() {
    return apiRequest("/platform/tenants");
  },

  createTenant(tenant) {
    return apiRequest("/platform/tenants", { method: "POST", body: JSON.stringify(tenant) });
  },

  updateTenant(tenantId, fields) {
    return apiRequest(`/platform/tenants/${tenantId}`, { method: "PATCH", body: JSON.stringify(fields) });
  },

  setTenantStatus(tenantId, status) {
    return apiRequest(`/platform/tenants/${tenantId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
  },

  getTenantFeatures(tenantId) {
    return apiRequest(`/platform/tenants/${tenantId}/features`);
  },

  updateTenantFeatures(tenantId, features) {
    return apiRequest(`/platform/tenants/${tenantId}/features`, { method: "PATCH", body: JSON.stringify({ features }) });
  },
};
