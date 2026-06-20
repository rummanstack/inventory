import { apiRequest, buildQueryString } from './client.js';

export const helpDeskApi = {
  listHelpDeskTickets({ search, status, priority, category, tab } = {}) {
    return apiRequest(`/help-desk${buildQueryString({ search, status, priority, category, tab })}`);
  },

  getHelpDeskTicket(id) {
    return apiRequest(`/help-desk/${id}`);
  },

  createHelpDeskTicket(ticket) {
    return apiRequest("/help-desk", { method: "POST", body: JSON.stringify(ticket) });
  },

  updateHelpDeskTicket(ticket) {
    return apiRequest(`/help-desk/${ticket.id}`, { method: "PUT", body: JSON.stringify(ticket) });
  },

  addHelpDeskTicketNote(id, body) {
    return apiRequest(`/help-desk/${id}/notes`, { method: "POST", body: JSON.stringify({ body }) });
  },

  transitionHelpDeskTicket(id, payload) {
    return apiRequest(`/help-desk/${id}/transition`, { method: "POST", body: JSON.stringify(payload) });
  },
};
