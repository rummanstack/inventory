import { apiRequest, buildQueryString } from './client.js';

export const tradePromotionSettlementsApi = {
  listTradePromotionSettlements({ page, pageSize, earningId, method, dateFrom, dateTo } = {}) {
    return apiRequest(`/trade-promotion-settlements${buildQueryString({ page, pageSize, earningId, method, dateFrom, dateTo })}`);
  },

  getTradePromotionSettlement(settlementId) {
    return apiRequest(`/trade-promotion-settlements/${settlementId}`);
  },

  createTradePromotionSettlement(settlement) {
    return apiRequest('/trade-promotion-settlements', { method: 'POST', body: JSON.stringify(settlement) });
  },

  deleteTradePromotionSettlement(settlementId, reason) {
    return apiRequest(`/trade-promotion-settlements/${settlementId}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
  },

  restoreTradePromotionSettlement(settlementId) {
    return apiRequest(`/trade-promotion-settlements/${settlementId}/restore`, { method: 'POST' });
  },
};
