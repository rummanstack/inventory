import { apiRequest, buildQueryString } from './client.js';

export const visitorChatAdminApi = {
  listVisitorChats({ status } = {}) {
    return apiRequest(`/platform/visitor-chats${buildQueryString({ status })}`);
  },

  getVisitorChat(id) {
    return apiRequest(`/platform/visitor-chats/${id}`);
  },

  listVisitorChatMessages(id, afterId) {
    return apiRequest(`/platform/visitor-chats/${id}/messages${buildQueryString({ afterId })}`);
  },

  postVisitorChatReply(id, body) {
    return apiRequest(`/platform/visitor-chats/${id}/messages`, { method: 'POST', body: JSON.stringify({ body }) });
  },

  markVisitorChatRead(id) {
    return apiRequest(`/platform/visitor-chats/${id}/read`, { method: 'POST' });
  },

  closeVisitorChat(id) {
    return apiRequest(`/platform/visitor-chats/${id}/close`, { method: 'POST' });
  },

  countUnreadVisitorChats() {
    return apiRequest('/platform/visitor-chats/unread-count');
  },
};
