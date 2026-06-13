import { apiRequest } from './client.js';

export const activityLogsApi = {
  listActivityLogs({ page, pageSize, search, module, actionType, userId, dateFrom, dateTo, tenantId } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (search) params.set("search", search);
    if (module) params.set("module", module);
    if (actionType) params.set("actionType", actionType);
    if (userId) params.set("userId", userId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (tenantId) params.set("tenantId", tenantId);
    const query = params.toString();
    return apiRequest(`/activity-logs${query ? `?${query}` : ""}`);
  },
};
