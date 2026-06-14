import { apiRequest, buildQueryString } from './client.js';

export const activityLogsApi = {
  listActivityLogs({ page, pageSize, search, module, actionType, userId, dateFrom, dateTo, tenantId } = {}) {
    return apiRequest(`/activity-logs${buildQueryString({ page, pageSize, search, module, actionType, userId, dateFrom, dateTo, tenantId })}`);
  },
};
