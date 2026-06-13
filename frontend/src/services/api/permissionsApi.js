import { apiRequest } from './client.js';

export const permissionsApi = {
  getRolePermissions() {
    return apiRequest("/permissions");
  },

  updateRolePermissions(role, permissions) {
    return apiRequest(`/permissions/${role}`, { method: "PUT", body: JSON.stringify({ permissions }) });
  },
};
