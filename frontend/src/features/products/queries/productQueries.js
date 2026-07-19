import { inventoryApi } from '../../../services/inventoryApi.js';

export const productKeys = {
  all: ['products'],
  directory: (tenantId) => ['products', 'directory', tenantId],
  lists: (tenantId) => ['products', 'list', tenantId],
  list: (tenantId, filters) => ['products', 'list', tenantId, filters],
  references: ['products', 'references'],
  categories: (tenantId) => ['products', 'references', tenantId, 'categories'],
  categoryAttributes: (tenantId, categoryId) => ['products', 'references', tenantId, 'category-attributes', categoryId],
  brands: (tenantId) => ['products', 'references', tenantId, 'brands'],
  suppliers: (tenantId) => ['products', 'references', tenantId, 'suppliers'],
  manufacturers: (tenantId) => ['products', 'references', tenantId, 'manufacturers'],
  activeManufacturers: (tenantId) => ['products', 'references', tenantId, 'manufacturers', 'active'],
  genericMedicines: (tenantId) => ['products', 'references', tenantId, 'generic-medicines'],
  activeGenericMedicines: (tenantId) => ['products', 'references', tenantId, 'generic-medicines', 'active'],
  stockMovementLists: (tenantId) => ['products', 'stock-movements', tenantId],
  stockMovements: (tenantId, filters) => ['products', 'stock-movements', tenantId, filters],
  availableSerials: (tenantId, productId) => ['products', 'available-serials', tenantId, productId],
  batches: (tenantId, productId) => ['products', 'batches', tenantId, productId],
};

export async function fetchProductDirectory() {
  const result = await inventoryApi.getProductsDirectory();
  return result.products || [];
}

export async function fetchProductList(filters) {
  return inventoryApi.listProducts(filters);
}

export async function fetchCategories() {
  const result = await inventoryApi.listCategories();
  return result.categories || [];
}

export async function fetchCategoryAttributes(categoryId) {
  if (!categoryId) return [];
  const result = await inventoryApi.listCategoryAttributes(categoryId);
  return result.attributes || [];
}

export async function fetchBrands() {
  const result = await inventoryApi.listBrands();
  return result.brands || [];
}

export async function fetchActiveSuppliers() {
  const result = await inventoryApi.getActiveSuppliers();
  return result.items || [];
}

export async function fetchManufacturers({ active = false } = {}) {
  const result = active
    ? await inventoryApi.listActiveManufacturers()
    : await inventoryApi.listManufacturers();
  return result.manufacturers || [];
}

export async function fetchGenericMedicines({ active = false } = {}) {
  const result = active
    ? await inventoryApi.listActiveGenericMedicines()
    : await inventoryApi.listGenericMedicines();
  return result.genericMedicines || [];
}

export function fetchStockMovements(filters) {
  return inventoryApi.listStockMovements(filters);
}
