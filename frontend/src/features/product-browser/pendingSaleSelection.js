// Hand-off slot between the Product Browser and Quick Sale. The Browser
// only ever writes a product id here and navigates — it never calls any
// inventory/invoice endpoint itself. QuickSalePage reads and clears this
// once on mount to add the product to the in-progress sale.
const STORAGE_PREFIX = 'productBrowser.pendingSaleProductId.';

export function setPendingSaleProduct(tenantId, productId) {
  sessionStorage.setItem(`${STORAGE_PREFIX}${tenantId}`, productId);
}

export function peekPendingSaleProduct(tenantId) {
  return sessionStorage.getItem(`${STORAGE_PREFIX}${tenantId}`) || null;
}

export function clearPendingSaleProduct(tenantId) {
  sessionStorage.removeItem(`${STORAGE_PREFIX}${tenantId}`);
}
