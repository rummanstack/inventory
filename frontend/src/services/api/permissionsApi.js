import { apiRequest } from './client.js';

export const permissionsApi = {
  getRolePermissions(tenantId) {
    const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
    return apiRequest(`/permissions${query}`);
  },

  updateRolePermissions(role, permissions, tenantId) {
    return apiRequest(`/permissions/${role}`, { method: "PUT", body: JSON.stringify({ permissions, tenantId }) });
  },
};
