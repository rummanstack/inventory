import { apiRequest, buildQueryString } from './client.js';

export const warrantyClaimsApi = {
  listWarrantyClaims({ page, pageSize, status, supplierId, productId, search, dateFrom, dateTo } = {}) {
    return apiRequest(`/warranty-claims${buildQueryString({ page, pageSize, status, supplierId, productId, search, dateFrom, dateTo })}`);
  },

  getWarrantyClaim(claimId) {
    return apiRequest(`/warranty-claims/${claimId}`);
  },

  searchWarrantyClaimSerial(q) {
    return apiRequest(`/warranty-claims/search-serial${buildQueryString({ q })}`);
  },

  createWarrantyClaim(claim) {
    return apiRequest('/warranty-claims', { method: 'POST', body: JSON.stringify(claim) });
  },

  updateWarrantyClaim(claim) {
    return apiRequest(`/warranty-claims/${claim.id}`, { method: 'PATCH', body: JSON.stringify(claim) });
  },

  deleteWarrantyClaim(claimId, reason) {
    return apiRequest(`/warranty-claims/${claimId}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
  },

  listWarrantyClaimsTrash({ page, pageSize } = {}) {
    return apiRequest(`/warranty-claims/trash${buildQueryString({ page, pageSize })}`);
  },
};
