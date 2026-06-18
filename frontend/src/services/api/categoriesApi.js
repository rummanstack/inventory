import { apiRequest } from './client.js';

export const categoriesApi = {
  listCategories() {
    return apiRequest("/categories");
  },

  createCategory(category) {
    return apiRequest("/categories", { method: "POST", body: JSON.stringify(category) });
  },

  updateCategory(categoryId, category) {
    return apiRequest(`/categories/${categoryId}`, { method: "PATCH", body: JSON.stringify(category) });
  },

  deleteCategory(categoryId) {
    return apiRequest(`/categories/${categoryId}`, { method: "DELETE" });
  },
};
