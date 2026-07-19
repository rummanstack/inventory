import { apiRequest } from './client.js';

// specFilters is a flat object like { screen_size_inch: 55, cooling_capacity_ton_min: 1 }
// — keys already carry the _min/_max suffix the backend expects, so it's
// forwarded as-is into `spec_<key>` query params.
function buildBrowseQuery({ page, pageSize, search, categoryId, specFilters } = {}) {
  const params = new URLSearchParams();
  if (page) params.set('page', page);
  if (pageSize) params.set('pageSize', pageSize);
  if (search) params.set('search', search);
  if (categoryId) params.set('categoryId', categoryId);
  for (const [key, value] of Object.entries(specFilters || {})) {
    if (value === '' || value === null || value === undefined) continue;
    params.set(`spec_${key}`, value);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const productBrowserApi = {
  browseProducts(filters = {}) {
    return apiRequest(`/product-browser/products${buildBrowseQuery(filters)}`);
  },

  getBrowseProduct(productId) {
    return apiRequest(`/product-browser/products/${productId}`);
  },

  listBrowseCategories() {
    return apiRequest('/product-browser/categories');
  },

  listBrowseCategoryAttributes(categoryId) {
    return apiRequest(`/product-browser/categories/${categoryId}/attributes`);
  },
};
