import { apiRequest, buildQueryString } from './client.js';

export const retailCashSessionsApi = {
  getCurrentRetailCashSession() {
    return apiRequest('/retail-cash-sessions/current');
  },

  listRetailCashSessions({ page, pageSize, dateFrom, dateTo } = {}) {
    return apiRequest(`/retail-cash-sessions${buildQueryString({ page, pageSize, dateFrom, dateTo })}`);
  },

  startRetailCashSession(payload) {
    return apiRequest('/retail-cash-sessions', { method: 'POST', body: JSON.stringify(payload) });
  },

  stopRetailCashSession(sessionId, payload) {
    return apiRequest(`/retail-cash-sessions/${sessionId}/stop`, { method: 'POST', body: JSON.stringify(payload) });
  },
};
