import { apiRequest } from './client.js';

export const contactApi = {
  submitContact({ name, phone, message }) {
    return apiRequest('/contact', { method: 'POST', body: JSON.stringify({ name, phone, message }) });
  },
  getContactMessages() {
    return apiRequest('/platform/contact-messages');
  },
};
