import { apiRequest, buildQueryString } from './client.js';

export const employeeFinanceApi = {
  listEmployeeAdvances(params = {}) {
    return apiRequest(`/employee-finance/advances${buildQueryString(params)}`);
  },
  requestEmployeeAdvance(data) {
    return apiRequest('/employee-finance/advances', { method: 'POST', body: JSON.stringify(data) });
  },
  approveEmployeeAdvance(id, note = '') {
    return apiRequest(`/employee-finance/advances/${id}/approve`, { method: 'POST', body: JSON.stringify({ note }) });
  },
  rejectEmployeeAdvance(id, note = '') {
    return apiRequest(`/employee-finance/advances/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) });
  },
  listEmployeeLoans(params = {}) {
    return apiRequest(`/employee-finance/loans${buildQueryString(params)}`);
  },
  requestEmployeeLoan(data) {
    return apiRequest('/employee-finance/loans', { method: 'POST', body: JSON.stringify(data) });
  },
  approveEmployeeLoan(id, note = '') {
    return apiRequest(`/employee-finance/loans/${id}/approve`, { method: 'POST', body: JSON.stringify({ note }) });
  },
  rejectEmployeeLoan(id, note = '') {
    return apiRequest(`/employee-finance/loans/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) });
  },
};
