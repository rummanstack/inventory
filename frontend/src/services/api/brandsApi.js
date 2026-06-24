import { apiRequest } from './client.js';

export const brandsApi = {
  listBrands() {
    return apiRequest("/brands");
  },

  createBrand(brand) {
    return apiRequest("/brands", { method: "POST", body: JSON.stringify(brand) });
  },

  updateBrand(brandId, brand) {
    return apiRequest(`/brands/${brandId}`, { method: "PATCH", body: JSON.stringify(brand) });
  },

  deleteBrand(brandId) {
    return apiRequest(`/brands/${brandId}`, { method: "DELETE" });
  },
};
