import { apiRequest } from './client.js';

export const systemApi = {
  getSystemHealth() {
    return apiRequest("/system/health");
  },

  listErrorLogs({ page, pageSize } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiRequest(`/system/error-logs${query ? `?${query}` : ""}`);
  },
};
