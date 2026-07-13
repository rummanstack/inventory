import { apiRequest, buildQueryString, downloadRequest } from './client.js';

export const installmentsApi = {
  listInstallmentPlans({ page, pageSize, customerId, status } = {}) {
    return apiRequest(`/installments${buildQueryString({ page, pageSize, customerId, status })}`);
  },

  getInstallmentPlan(planId) {
    return apiRequest(`/installments/${planId}`);
  },

  createInstallmentPlan(payload) {
    return apiRequest('/installments', { method: 'POST', body: JSON.stringify(payload) });
  },

  reschedulePlan(planId, payload) {
    return apiRequest(`/installments/${planId}/reschedule`, { method: 'POST', body: JSON.stringify(payload) });
  },

  settlePlan(planId, payload) {
    return apiRequest(`/installments/${planId}/settle`, { method: 'POST', body: JSON.stringify(payload) });
  },

  writeOffPlan(planId, payload) {
    return apiRequest(`/installments/${planId}/write-off`, { method: 'POST', body: JSON.stringify(payload) });
  },

  cancelPlan(planId, payload) {
    return apiRequest(`/installments/${planId}/cancel`, { method: 'POST', body: JSON.stringify(payload) });
  },

  collectInstallmentPayment(payload) {
    return apiRequest('/installments/payments', { method: 'POST', body: JSON.stringify(payload) });
  },

  addInstallmentGuarantor(planId, payload) {
    return apiRequest(`/installments/${planId}/guarantors`, { method: 'POST', body: JSON.stringify(payload) });
  },

  removeInstallmentGuarantor(planId, guarantorId) {
    return apiRequest(`/installments/${planId}/guarantors/${guarantorId}`, { method: 'DELETE' });
  },

  addInstallmentDocument(planId, payload) {
    return apiRequest(`/installments/${planId}/documents`, { method: 'POST', body: JSON.stringify(payload) });
  },

  removeInstallmentDocument(planId, documentId) {
    return apiRequest(`/installments/${planId}/documents/${documentId}`, { method: 'DELETE' });
  },

  downloadInstallmentAgreementPdf(planId) {
    return downloadRequest(`/installments/${planId}/agreement-pdf`);
  },

  getInstallmentDueScheduleReport({ dateFrom, dateTo } = {}) {
    return apiRequest(`/installments/reports/due-schedule${buildQueryString({ dateFrom, dateTo })}`);
  },

  getInstallmentOverdueReport() {
    return apiRequest('/installments/reports/overdue');
  },

  getInstallmentCollectionReport({ dateFrom, dateTo } = {}) {
    return apiRequest(`/installments/reports/collections${buildQueryString({ dateFrom, dateTo })}`);
  },

  getInstallmentCustomerStatement({ customerId } = {}) {
    return apiRequest(`/installments/customer-statement${buildQueryString({ customerId })}`);
  },

  getInstallmentCreditCheck({ customerId } = {}) {
    return apiRequest(`/installments/credit-check${buildQueryString({ customerId })}`);
  },

  updateInstallmentCreditSettings(customerId, payload) {
    return apiRequest(`/installments/customers/${customerId}/credit-settings`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  getInstallmentDashboard() {
    return apiRequest('/installments/dashboard');
  },

  listInstallmentLateFeeRules() {
    return apiRequest('/installments/late-fee-rules');
  },

  saveInstallmentLateFeeRule(rule) {
    return apiRequest('/installments/late-fee-rules', { method: 'POST', body: JSON.stringify(rule) });
  },

  applyInstallmentLateFee(scheduleId) {
    return apiRequest(`/installments/schedule/${scheduleId}/apply-late-fee`, { method: 'POST' });
  },
};
