import { apiRequest, buildQueryString } from './client.js';

export const departmentsApi = {
  listDepartments({ page, pageSize, search, status } = {}) {
    return apiRequest(`/departments${buildQueryString({ page, pageSize, search, status })}`);
  },

  getActiveDepartments() {
    return apiRequest('/departments/active');
  },

  createDepartment(data) {
    return apiRequest('/departments', { method: 'POST', body: JSON.stringify(data) });
  },

  updateDepartment(data) {
    return apiRequest(`/departments/${data.id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  deleteDepartment(id, reason) {
    return apiRequest(`/departments/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
  },
};
