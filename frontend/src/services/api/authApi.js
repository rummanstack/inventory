import { apiRequest } from './client.js';

export const authApi = {
  getCurrentUser() {
    return apiRequest("/auth/me");
  },

  login({ email, password, orgSlug }) {
    return apiRequest("/auth/login", { method: "POST", body: JSON.stringify({ email, password, orgSlug }) });
  },

  logout() {
    return apiRequest("/auth/logout", { method: "POST" });
  },

  updateProfile(fields) {
    return apiRequest("/profile", { method: "PATCH", body: JSON.stringify(fields) });
  },

  forgotPassword({ email, orgSlug }) {
    return apiRequest("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email, orgSlug }) });
  },

  resetPassword({ token, password }) {
    return apiRequest("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
  },

  listSessions() {
    return apiRequest("/auth/sessions");
  },

  revokeSession(sessionId) {
    return apiRequest(`/auth/sessions/${sessionId}`, { method: "DELETE" });
  },

  revokeOtherSessions() {
    return apiRequest("/auth/sessions/revoke-others", { method: "POST" });
  },

  getLoginHistory() {
    return apiRequest("/auth/login-history");
  },
};
