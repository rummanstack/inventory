import { apiRequest } from './client.js';

export const financeDashboardApi = {
  getFinanceDashboard() {
    return apiRequest('/finance-dashboard');
  },
};
