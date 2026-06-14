import { apiRequest, buildQueryString } from './client.js';

export const usersApi = {
  listUsers() {
    return apiRequest("/users");
  },

  createUser(user) {
    return apiRequest("/users", { method: "POST", body: JSON.stringify(user) });
  },

  updateUser(userId, user) {
    return apiRequest(`/users/${userId}`, { method: "PATCH", body: JSON.stringify(user) });
  },

  deleteUser(userId, reason) {
    return apiRequest(`/users/${userId}`, { method: "DELETE", body: JSON.stringify({ reason }) });
  },

  listUsersTrash({ page, pageSize } = {}) {
    return apiRequest(`/users/trash${buildQueryString({ page, pageSize })}`);
  },

  restoreUser(userId) {
    return apiRequest(`/users/${userId}/restore`, { method: "POST" });
  },

  permanentlyDeleteUser(userId) {
    return apiRequest(`/users/${userId}/permanent`, { method: "DELETE" });
  },

  adminResetUserPassword(userId) {
    return apiRequest(`/users/${userId}/reset-password`, { method: "POST" });
  },

  unlockUser(userId) {
    return apiRequest(`/users/${userId}/unlock`, { method: "POST" });
  },

  listPasswordResetRequests() {
    return apiRequest("/users/password-reset-requests");
  },
};
