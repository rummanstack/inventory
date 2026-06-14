import { apiRequest, buildQueryString } from './client.js';

export const monthEndSummaryApi = {
  getMonthEndSummary({ month } = {}) {
    return apiRequest(`/month-end-summary${buildQueryString({ month })}`);
  },
};
