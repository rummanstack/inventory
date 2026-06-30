import { apiRequest, buildQueryString } from './client.js';

export const salaryPaymentsApi = {
  getSalaryOverview(month) {
    return apiRequest(`/salary-payments/overview${buildQueryString({ month })}`);
  },

  getSalaryPaymentsRange({ dateFrom, dateTo } = {}) {
    return apiRequest(`/salary-payments/range${buildQueryString({ dateFrom, dateTo })}`);
  },

  recordSalaryPayment(payload) {
    return apiRequest('/salary-payments', { method: 'POST', body: JSON.stringify(payload) });
  },

  deleteSalaryPayment(id) {
    return apiRequest(`/salary-payments/${id}`, { method: 'DELETE' });
  },

  setSalaryActiveDays(employeeId, month, activeDays) {
    return apiRequest('/salary-payments/active-days', {
      method: 'POST',
      body: JSON.stringify({ employeeId, month, activeDays }),
    });
  },
};
