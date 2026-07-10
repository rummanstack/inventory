import { apiRequest, buildQueryString } from './client.js';

export const tradePromotionRulesApi = {
  listTradePromotionRules({ page, pageSize, search, supplierId, targetType, active } = {}) {
    return apiRequest(`/trade-promotion-rules${buildQueryString({ page, pageSize, search, supplierId, targetType, active })}`);
  },

  getTradePromotionRule(ruleId) {
    return apiRequest(`/trade-promotion-rules/${ruleId}`);
  },

  createTradePromotionRule(rule) {
    return apiRequest('/trade-promotion-rules', { method: 'POST', body: JSON.stringify(rule) });
  },

  updateTradePromotionRule(rule) {
    return apiRequest(`/trade-promotion-rules/${rule.id}`, { method: 'PATCH', body: JSON.stringify(rule) });
  },

  deleteTradePromotionRule(ruleId, reason) {
    return apiRequest(`/trade-promotion-rules/${ruleId}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
  },

  restoreTradePromotionRule(ruleId) {
    return apiRequest(`/trade-promotion-rules/${ruleId}/restore`, { method: 'POST' });
  },

  permanentlyDeleteTradePromotionRule(ruleId) {
    return apiRequest(`/trade-promotion-rules/${ruleId}/permanent`, { method: 'DELETE' });
  },

  listTradePromotionRulesTrash({ page, pageSize } = {}) {
    return apiRequest(`/trade-promotion-rules/trash${buildQueryString({ page, pageSize })}`);
  },
};
