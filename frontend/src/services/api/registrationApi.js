import { apiRequest } from './client.js';

export const registrationApi = {
  registerBusiness({ businessName, businessType, ownerName, email, phone, password }) {
    return apiRequest('/register', {
      method: 'POST',
      body: JSON.stringify({ businessName, businessType, ownerName, email, phone, password }),
    });
  },
  getRegistrationRequests() {
    return apiRequest('/platform/registrations');
  },
  approveRegistration(tenantId) {
    return apiRequest(`/platform/registrations/${tenantId}/approve`, { method: 'POST' });
  },
  rejectRegistration(tenantId) {
    return apiRequest(`/platform/registrations/${tenantId}/reject`, { method: 'POST' });
  },
};
