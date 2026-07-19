import { inventoryApi } from '../../../services/inventoryApi.js';

export const productBrowserKeys = {
  categories: (tenantId) => ['product-browser', tenantId, 'categories'],
  categoryAttributes: (tenantId, categoryId) => ['product-browser', tenantId, 'category-attributes', categoryId],
  product: (tenantId, productId) => ['product-browser', tenantId, 'product', productId],
};

export async function fetchBrowseCategories() {
  const result = await inventoryApi.listBrowseCategories();
  return result.categories || [];
}

export async function fetchBrowseCategoryAttributes(categoryId) {
  if (!categoryId) return [];
  const result = await inventoryApi.listBrowseCategoryAttributes(categoryId);
  return result.attributes || [];
}

export async function fetchBrowseProduct(productId) {
  const result = await inventoryApi.getBrowseProduct(productId);
  return result.product;
}

export function fetchBrowseProducts(filters) {
  return inventoryApi.browseProducts(filters);
}
