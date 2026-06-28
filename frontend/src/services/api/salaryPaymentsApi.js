import { apiRequest, buildQueryString } from './client.js';

export const salaryPaymentsApi = {
  getSalaryOverview(month) {
    return apiRequest(`/salary-payments/overview${buildQueryString({ month })}`);
  },

  recordSalaryPayment(payload) {
    return apiRequest('/salary-payments', { method: 'POST', body: JSON.stringify(payload) });
  },

  deleteSalaryPayment(id) {
    return apiRequest(`/salary-payments/${id}`, { method: 'DELETE' });
  },
};
