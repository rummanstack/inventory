import { apiRequest, buildQueryString } from './client.js';

export const productSerialsApi = {
  listProductSerials({ page, pageSize, productId, status, search } = {}) {
    return apiRequest(`/product-serials${buildQueryString({ page, pageSize, productId, status, search })}`);
  },

  getProductSerial(serialId) {
    return apiRequest(`/product-serials/${serialId}`);
  },

  // listAvailableProductSerials already lives in productsApi.js.

  createProductSerial(serial) {
    return apiRequest('/product-serials', { method: 'POST', body: JSON.stringify(serial) });
  },

  updateProductSerial(serial) {
    return apiRequest(`/product-serials/${serial.id}`, { method: 'PATCH', body: JSON.stringify(serial) });
  },

  deleteProductSerial(serialId, reason) {
    return apiRequest(`/product-serials/${serialId}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
  },

  listProductSerialsTrash({ page, pageSize } = {}) {
    return apiRequest(`/product-serials/trash${buildQueryString({ page, pageSize })}`);
  },
};
