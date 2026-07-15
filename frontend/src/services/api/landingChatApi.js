import { apiRequest } from './client.js';

export const landingChatApi = {
  getLandingChatStatus() {
    return apiRequest('/landing-chat/status');
  },

  sendLandingChatMessage({ message, history }) {
    return apiRequest('/landing-chat/chat', { method: 'POST', body: JSON.stringify({ message, history }) });
  },
};
