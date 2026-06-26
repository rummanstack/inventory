import { apiRequest, buildQueryString } from './client.js';

export const payrollApi = {
  listPayrolls({ page, pageSize } = {}) {
    return apiRequest(`/payroll${buildQueryString({ page, pageSize })}`);
  },

  getPayroll(id) {
    return apiRequest(`/payroll/${id}`);
  },

  generatePayroll(data) {
    return apiRequest('/payroll', { method: 'POST', body: JSON.stringify(data) });
  },

  updatePayrollItem(payrollId, itemId, data) {
    return apiRequest(`/payroll/${payrollId}/items/${itemId}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  approvePayroll(id) {
    return apiRequest(`/payroll/${id}/approve`, { method: 'POST' });
  },

  payPayroll(id, data) {
    return apiRequest(`/payroll/${id}/pay`, { method: 'POST', body: JSON.stringify(data) });
  },

  deletePayroll(id) {
    return apiRequest(`/payroll/${id}`, { method: 'DELETE' });
  },

  getPayslip(payrollId, employeeId) {
    return apiRequest(`/payroll/${payrollId}/payslip/${employeeId}`);
  },
};
