import { apiRequest } from './client.js';

export const genericMedicinesApi = {
  listGenericMedicines() {
    return apiRequest('/generic-medicines');
  },

  listActiveGenericMedicines() {
    return apiRequest('/generic-medicines/active');
  },

  createGenericMedicine(data) {
    return apiRequest('/generic-medicines', { method: 'POST', body: JSON.stringify(data) });
  },

  updateGenericMedicine(id, data) {
    return apiRequest(`/generic-medicines/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  deleteGenericMedicine(id) {
    return apiRequest(`/generic-medicines/${id}`, { method: 'DELETE' });
  },
};
