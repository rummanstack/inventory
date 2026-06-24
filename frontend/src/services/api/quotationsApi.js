import { apiRequest, buildQueryString } from './client.js';

export const quotationsApi = {
  listQuotations({ page, pageSize, status, customerId, search, dateFrom, dateTo } = {}) {
    return apiRequest(`/quotations${buildQueryString({ page, pageSize, status, customerId, search, dateFrom, dateTo })}`);
  },

  getQuotation(id) {
    return apiRequest(`/quotations/${id}`);
  },

  createQuotation(quotation) {
    return apiRequest('/quotations', { method: 'POST', body: JSON.stringify(quotation) });
  },

  updateQuotation(quotation) {
    return apiRequest(`/quotations/${quotation.id}`, { method: 'PATCH', body: JSON.stringify(quotation) });
  },

  convertQuotation(id, payload) {
    return apiRequest(`/quotations/${id}/convert`, { method: 'POST', body: JSON.stringify(payload) });
  },

  deleteQuotation(id, reason) {
    return apiRequest(`/quotations/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
  },

  listQuotationsTrash({ page, pageSize } = {}) {
    return apiRequest(`/quotations/trash${buildQueryString({ page, pageSize })}`);
  },
};
