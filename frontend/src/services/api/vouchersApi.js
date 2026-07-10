import { apiRequest, buildQueryString, uploadRequest, downloadRequest } from './client.js';

export const vouchersApi = {
  listVouchers(filters = {}) {
    return apiRequest(`/vouchers${buildQueryString(filters)}`);
  },

  getVoucher(id) {
    return apiRequest(`/vouchers/${id}`);
  },

  createVoucher(data) {
    return apiRequest('/vouchers', { method: 'POST', body: JSON.stringify(data) });
  },

  updateVoucher(id, data) {
    return apiRequest(`/vouchers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  deleteVoucher(id, reason) {
    return apiRequest(`/vouchers/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
  },

  submitVoucher(id) {
    return apiRequest(`/vouchers/${id}/submit`, { method: 'POST' });
  },

  approveVoucher(id) {
    return apiRequest(`/vouchers/${id}/approve`, { method: 'POST' });
  },

  postVoucher(id) {
    return apiRequest(`/vouchers/${id}/post`, { method: 'POST' });
  },

  reverseVoucher(id, reason) {
    return apiRequest(`/vouchers/${id}/reverse`, { method: 'POST', body: JSON.stringify({ reason }) });
  },

  getJournalRegister(filters = {}) {
    return apiRequest(`/vouchers/journal-register${buildQueryString(filters)}`);
  },

  listVoucherAttachments(id) {
    return apiRequest(`/vouchers/${id}/attachments`);
  },

  uploadVoucherAttachment(id, { file, title }) {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('title', title || '');
    return uploadRequest(`/vouchers/${id}/attachments`, formData);
  },

  downloadVoucherAttachment(id, attachmentId) {
    return downloadRequest(`/vouchers/${id}/attachments/${attachmentId}/download`);
  },

  deleteVoucherAttachment(id, attachmentId, reason) {
    return apiRequest(`/vouchers/${id}/attachments/${attachmentId}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
  },
};
