import { apiRequest, buildQueryString } from './client.js';

export const dashboardApi = {
  getDashboard({ date } = {}) {
    return apiRequest(`/dashboard${buildQueryString({ date })}`);
  },
};
