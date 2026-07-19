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

  listCategoryAttributes(categoryId) {
    return apiRequest(`/categories/${categoryId}/attributes`);
  },

  createCategoryAttribute(categoryId, attribute) {
    return apiRequest(`/categories/${categoryId}/attributes`, { method: "POST", body: JSON.stringify(attribute) });
  },

  updateCategoryAttribute(categoryId, attributeId, attribute) {
    return apiRequest(`/categories/${categoryId}/attributes/${attributeId}`, {
      method: "PATCH",
      body: JSON.stringify(attribute),
    });
  },

  deleteCategoryAttribute(categoryId, attributeId) {
    return apiRequest(`/categories/${categoryId}/attributes/${attributeId}`, { method: "DELETE" });
  },
};
