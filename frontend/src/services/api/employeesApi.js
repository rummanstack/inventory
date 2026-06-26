import { apiRequest, buildQueryString } from './client.js';

export const employeesApi = {
  listEmployees({ page, pageSize, search, status, department } = {}) {
    return apiRequest(`/employees${buildQueryString({ page, pageSize, search, status, department })}`);
  },

  getActiveEmployees() {
    return apiRequest('/employees/active');
  },

  getEmployee(id) {
    return apiRequest(`/employees/${id}`);
  },

  createEmployee(data) {
    return apiRequest('/employees', { method: 'POST', body: JSON.stringify(data) });
  },

  updateEmployee(data) {
    return apiRequest(`/employees/${data.id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  deleteEmployee(id, reason) {
    return apiRequest(`/employees/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
  },

  restoreEmployee(id) {
    return apiRequest(`/employees/${id}/restore`, { method: 'POST' });
  },
};
