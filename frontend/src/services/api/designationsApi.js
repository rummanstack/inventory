import { apiRequest, buildQueryString } from './client.js';

export const designationsApi = {
  listDesignations({ page, pageSize, search, status } = {}) {
    return apiRequest(`/designations${buildQueryString({ page, pageSize, search, status })}`);
  },

  getActiveDesignations() {
    return apiRequest('/designations/active');
  },

  createDesignation(data) {
    return apiRequest('/designations', { method: 'POST', body: JSON.stringify(data) });
  },

  updateDesignation(data) {
    return apiRequest(`/designations/${data.id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  deleteDesignation(id, reason) {
    return apiRequest(`/designations/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
  },
};
