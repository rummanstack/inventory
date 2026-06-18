import { apiRequest, buildQueryString } from './client.js';

export const productsApi = {
  listProducts({ page, pageSize, search, categoryId } = {}) {
    return apiRequest(`/products${buildQueryString({ page, pageSize, search, categoryId })}`);
  },

  getProductsDirectory() {
    return apiRequest("/products/directory");
  },

  getLowStockProducts() {
    return apiRequest("/products/low-stock");
  },

  createProduct(product) {
    return apiRequest("/products", { method: "POST", body: JSON.stringify(product) });
  },

  updateProduct(product) {
    return apiRequest(`/products/${product.id}`, { method: "PUT", body: JSON.stringify(product) });
  },

  deleteProduct(productId, reason) {
    return apiRequest(`/products/${productId}`, { method: "DELETE", body: JSON.stringify({ reason }) });
  },

  listProductsTrash({ page, pageSize } = {}) {
    return apiRequest(`/products/trash${buildQueryString({ page, pageSize })}`);
  },

  restoreProduct(productId) {
    return apiRequest(`/products/${productId}/restore`, { method: "POST" });
  },

  permanentlyDeleteProduct(productId) {
    return apiRequest(`/products/${productId}/permanent`, { method: "DELETE" });
  },

  addProductStock(productId, addPieces, reason) {
    return apiRequest(`/products/${productId}/stock`, { method: "POST", body: JSON.stringify({ addPieces, reason }) });
  },

  setOpeningStock(productId, quantity, note) {
    return apiRequest(`/products/${productId}/opening-stock`, { method: "POST", body: JSON.stringify({ quantity, note }) });
  },

  clearDamagedStock(productId, quantity, note) {
    return apiRequest(`/products/${productId}/clear-damage`, { method: "POST", body: JSON.stringify({ quantity, note }) });
  },

  listStockMovements({ page, pageSize, productId, type, dateFrom, dateTo } = {}) {
    return apiRequest(`/stock-movements${buildQueryString({ page, pageSize, productId, type, dateFrom, dateTo })}`);
  },
};
