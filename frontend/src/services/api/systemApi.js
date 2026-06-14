import { apiRequest, buildQueryString } from './client.js';

export const systemApi = {
  getSystemHealth() {
    return apiRequest("/system/health");
  },

  listErrorLogs({ page, pageSize } = {}) {
    return apiRequest(`/system/error-logs${buildQueryString({ page, pageSize })}`);
  },
};
