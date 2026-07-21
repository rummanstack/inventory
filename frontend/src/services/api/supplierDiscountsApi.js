import { apiRequest, buildQueryString } from './client.js';

export const supplierDiscountsApi = {
  listSupplierDiscounts({ page, pageSize, supplierId, dateFrom, dateTo } = {}) {
    return apiRequest(`/supplier-discounts${buildQueryString({ page, pageSize, supplierId, dateFrom, dateTo })}`);
  },

  deleteSupplierDiscount(discountId) {
    return apiRequest(`/supplier-discounts/${discountId}`, { method: 'DELETE' });
  },
};
