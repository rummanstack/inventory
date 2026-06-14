import { apiRequest, buildQueryString } from './client.js';

export const profitApi = {
  getProfitReport({ dateFrom, dateTo } = {}) {
    return apiRequest(`/profit-report${buildQueryString({ dateFrom, dateTo })}`);
  },
};
