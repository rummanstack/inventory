import { apiRequest, buildQueryString } from './client.js';

export const tradePromotionEarningsApi = {
  listTradePromotionEarnings({ page, pageSize, status, supplierId, productId, ruleId, search, dateFrom, dateTo } = {}) {
    return apiRequest(`/trade-promotion-earnings${buildQueryString({ page, pageSize, status, supplierId, productId, ruleId, search, dateFrom, dateTo })}`);
  },

  getTradePromotionEarning(earningId) {
    return apiRequest(`/trade-promotion-earnings/${earningId}`);
  },

  getTradePromotionPendingReport({ page, pageSize, supplierId, productId, dateFrom, dateTo } = {}) {
    return apiRequest(`/trade-promotion-earnings/reports/pending${buildQueryString({ page, pageSize, supplierId, productId, dateFrom, dateTo })}`);
  },

  getTradePromotionSettledReport({ page, pageSize, supplierId, productId, dateFrom, dateTo } = {}) {
    return apiRequest(`/trade-promotion-earnings/reports/settled${buildQueryString({ page, pageSize, supplierId, productId, dateFrom, dateTo })}`);
  },

  getTradePromotionSupplierSummary({ dateFrom, dateTo } = {}) {
    return apiRequest(`/trade-promotion-earnings/reports/supplier-summary${buildQueryString({ dateFrom, dateTo })}`);
  },

  getTradePromotionProductSummary({ dateFrom, dateTo } = {}) {
    return apiRequest(`/trade-promotion-earnings/reports/product-summary${buildQueryString({ dateFrom, dateTo })}`);
  },

  getTradePromotionDateWiseReport({ dateFrom, dateTo } = {}) {
    return apiRequest(`/trade-promotion-earnings/reports/date-wise${buildQueryString({ dateFrom, dateTo })}`);
  },
};
