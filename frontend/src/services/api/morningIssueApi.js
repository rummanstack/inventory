import { apiRequest, buildQueryString } from './client.js';

export const morningIssueApi = {
  listIssues({ page, pageSize, search, dsrId, dateFrom, dateTo } = {}) {
    return apiRequest(`/issues${buildQueryString({ page, pageSize, search, dsrId, dateFrom, dateTo })}`);
  },

  saveIssue(issue) {
    return apiRequest("/issues", { method: "POST", body: JSON.stringify(issue) });
  },
};
