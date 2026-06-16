import { apiRequest, buildQueryString } from './client.js';

export const financeDashboardApi = {
  getFinanceDashboard() {
    return apiRequest('/finance-dashboard');
  },
  getFinanceDashboardRange({ dateFrom, dateTo } = {}) {
    return apiRequest(`/finance-dashboard/range-report${buildQueryString({ dateFrom, dateTo })}`);
  },
};
