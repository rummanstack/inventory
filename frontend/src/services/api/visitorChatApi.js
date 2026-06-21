import { apiRequest, buildQueryString } from './client.js';

export const visitorChatApi = {
  sendVisitorMessage({ visitorToken, body }) {
    return apiRequest('/visitor-chat/messages', { method: 'POST', body: JSON.stringify({ visitorToken, body }) });
  },

  listVisitorMessages({ visitorToken, afterId }) {
    return apiRequest(`/visitor-chat/messages${buildQueryString({ visitorToken, afterId })}`);
  },
};
