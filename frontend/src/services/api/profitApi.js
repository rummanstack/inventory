import { apiRequest } from './client.js';

export const profitApi = {
  getProfitReport({ dateFrom, dateTo } = {}) {
    const params = new URLSearchParams();
    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }
    if (dateTo) {
      params.set("dateTo", dateTo);
    }
    const query = params.toString();
    return apiRequest(`/profit-report${query ? `?${query}` : ""}`);
  },
};
