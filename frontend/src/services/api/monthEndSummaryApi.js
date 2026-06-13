import { apiRequest } from './client.js';

export const monthEndSummaryApi = {
  getMonthEndSummary({ month } = {}) {
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    const query = params.toString();
    return apiRequest(`/month-end-summary${query ? `?${query}` : ""}`);
  },
};
