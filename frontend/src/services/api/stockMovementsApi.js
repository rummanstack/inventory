import { apiRequest, buildQueryString } from './client.js';

export const stockMovementsApi = {
  getStockMovementReport({ dateFrom, dateTo, type } = {}) {
    return apiRequest(`/stock-movements/reports${buildQueryString({ dateFrom, dateTo, type })}`);
  },

  getDamagedStockReport({ dateFrom, dateTo } = {}) {
    return apiRequest(`/stock-movements/damaged-report${buildQueryString({ dateFrom, dateTo })}`);
  },
};
