import { apiRequest, buildQueryString, uploadRequest, downloadRequest } from './client.js';

export const employeesApi = {
  listEmployees({ page, pageSize, search, status, department, departmentId, designationId } = {}) {
    return apiRequest(`/employees${buildQueryString({ page, pageSize, search, status, department, departmentId, designationId })}`);
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

  listEmployeeDocuments(employeeId) {
    return apiRequest(`/employees/${employeeId}/documents`);
  },

  uploadEmployeeDocument(employeeId, { file, documentType, title }) {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType || 'OTHER');
    formData.append('title', title || '');
    return uploadRequest(`/employees/${employeeId}/documents`, formData);
  },

  downloadEmployeeDocument(employeeId, documentId) {
    return downloadRequest(`/employees/${employeeId}/documents/${documentId}/download`);
  },

  deleteEmployeeDocument(employeeId, documentId, reason) {
    return apiRequest(`/employees/${employeeId}/documents/${documentId}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
  },
};
