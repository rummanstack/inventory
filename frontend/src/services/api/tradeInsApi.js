import { apiRequest, buildQueryString } from './client.js';

export const tradeInsApi = {
  listTradeIns({ page, pageSize, search, dateFrom, dateTo } = {}) {
    return apiRequest(`/trade-ins${buildQueryString({ page, pageSize, search, dateFrom, dateTo })}`);
  },

  getTradeIn(id) {
    return apiRequest(`/trade-ins/${id}`);
  },

  createTradeIn(tradeIn) {
    return apiRequest('/trade-ins', { method: 'POST', body: JSON.stringify(tradeIn) });
  },

  deleteTradeIn(id, reason) {
    return apiRequest(`/trade-ins/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
  },

  listTradeInsTrash({ page, pageSize } = {}) {
    return apiRequest(`/trade-ins/trash${buildQueryString({ page, pageSize })}`);
  },
};
