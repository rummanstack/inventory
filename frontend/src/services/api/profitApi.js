import { apiRequest, buildQueryString } from './client.js';

export const profitApi = {
  getProfitReport({ dateFrom, dateTo } = {}) {
    return apiRequest(`/profit-report${buildQueryString({ dateFrom, dateTo })}`);
  },
  getDsrProfitReport({ dateFrom, dateTo } = {}) {
    return apiRequest(`/profit-report/by-dsr${buildQueryString({ dateFrom, dateTo })}`);
  },
  getProductProfitReport({ dateFrom, dateTo } = {}) {
    return apiRequest(`/profit-report/by-product${buildQueryString({ dateFrom, dateTo })}`);
  },
  getCategoryProfitReport({ dateFrom, dateTo } = {}) {
    return apiRequest(`/profit-report/by-category${buildQueryString({ dateFrom, dateTo })}`);
  },
  getCustomerProfitReport({ dateFrom, dateTo } = {}) {
    return apiRequest(`/profit-report/by-customer${buildQueryString({ dateFrom, dateTo })}`);
  },
};
