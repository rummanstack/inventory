import { apiRequest, buildQueryString } from './client.js';

export const shopDueLedgerApi = {
  listShopDueLedger({ page, pageSize, shopId, dateFrom, dateTo } = {}) {
    return apiRequest(`/shop-due-ledger${buildQueryString({ page, pageSize, shopId, dateFrom, dateTo })}`);
  },

  getShopDueStatement({ shopId, dateFrom, dateTo } = {}) {
    return apiRequest(`/shop-due-ledger/statement${buildQueryString({ shopId, dateFrom, dateTo })}`);
  },

  getShopDueBalance(shopId) {
    return apiRequest(`/shop-due-ledger/balance${buildQueryString({ shopId })}`);
  },

  recordShopDue({ shopId, amount, note, businessDate }) {
    return apiRequest('/shop-due-ledger/record-due', { method: 'POST', body: JSON.stringify({ shopId, amount, note, businessDate }) });
  },

  collectShopDue({ shopId, amount, note, businessDate }) {
    return apiRequest('/shop-due-ledger/collect', { method: 'POST', body: JSON.stringify({ shopId, amount, note, businessDate }) });
  },
};
