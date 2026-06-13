import { apiRequest } from './client.js';

export const productsApi = {
  listProducts({ page, pageSize, search } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (search) params.set("search", search);
    const query = params.toString();
    return apiRequest(`/products${query ? `?${query}` : ""}`);
  },

  getProductsDirectory() {
    return apiRequest("/products/directory");
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
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiRequest(`/products/trash${query ? `?${query}` : ""}`);
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

  clearDamagedStock(productId, quantity, note) {
    return apiRequest(`/products/${productId}/clear-damage`, { method: "POST", body: JSON.stringify({ quantity, note }) });
  },

  listStockMovements({ page, pageSize, productId, type, dateFrom, dateTo } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (productId) params.set("productId", productId);
    if (type) params.set("type", type);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const query = params.toString();
    return apiRequest(`/stock-movements${query ? `?${query}` : ""}`);
  },
};
