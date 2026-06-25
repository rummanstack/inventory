import { apiRequest, buildQueryString } from './client.js';

export const supplierDiscountsApi = {
  listSupplierDiscounts({ page, pageSize, dateFrom, dateTo } = {}) {
    return apiRequest(`/supplier-discounts${buildQueryString({ page, pageSize, dateFrom, dateTo })}`);
  },

  deleteSupplierDiscount(discountId) {
    return apiRequest(`/supplier-discounts/${discountId}`, { method: 'DELETE' });
  },
};
