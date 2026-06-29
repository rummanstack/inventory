import { apiRequest, buildQueryString } from './client.js';

export const drugBatchApi = {
  listByProduct(productId) {
    return apiRequest(`/drug-batches/product/${productId}`);
  },

  listExpiring({ daysAhead = 90 } = {}) {
    return apiRequest(`/drug-batches/expiring${buildQueryString({ daysAhead })}`);
  },
};
