import { apiRequest } from './client.js';

export const salaryStructureApi = {
  listSalaryStructures() {
    return apiRequest('/salary-structure');
  },

  getSalaryStructure(employeeId) {
    return apiRequest(`/salary-structure/${employeeId}`);
  },

  saveSalaryStructure(employeeId, data) {
    return apiRequest(`/salary-structure/${employeeId}`, { method: 'POST', body: JSON.stringify(data) });
  },
};
