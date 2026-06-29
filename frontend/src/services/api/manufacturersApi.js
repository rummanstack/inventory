import { apiRequest } from './client.js';

export const manufacturersApi = {
  listManufacturers() {
    return apiRequest('/manufacturers');
  },

  listActiveManufacturers() {
    return apiRequest('/manufacturers/active');
  },

  createManufacturer(data) {
    return apiRequest('/manufacturers', { method: 'POST', body: JSON.stringify(data) });
  },

  updateManufacturer(id, data) {
    return apiRequest(`/manufacturers/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  deleteManufacturer(id) {
    return apiRequest(`/manufacturers/${id}`, { method: 'DELETE' });
  },
};
