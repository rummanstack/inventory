import { apiRequest, buildQueryString } from './client.js';

export const payrollApi = {
  listSalaryStructures() {
    return apiRequest('/payroll/salary-structures');
  },
  saveSalaryStructure(data) {
    return apiRequest('/payroll/salary-structures', { method: 'POST', body: JSON.stringify(data) });
  },
  listPayrollRuns() {
    return apiRequest('/payroll/runs');
  },
  getPayrollRun(id) {
    return apiRequest(`/payroll/runs/${id}`);
  },
  generatePayroll(data) {
    return apiRequest('/payroll/runs/generate', { method: 'POST', body: JSON.stringify(data) });
  },
  approvePayrollRun(id, note = '') {
    return apiRequest(`/payroll/runs/${id}/approve`, { method: 'POST', body: JSON.stringify({ note }) });
  },
  payPayrollRun(id, data = {}) {
    return apiRequest(`/payroll/runs/${id}/pay`, { method: 'POST', body: JSON.stringify(data) });
  },
  getPayrollRegister(params = {}) {
    return apiRequest(`/payroll/register${buildQueryString(params)}`);
  },
};
