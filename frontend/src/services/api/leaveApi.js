import { apiRequest, buildQueryString } from './client.js';

export const leaveApi = {
  listLeaveTypes(params = {}) {
    return apiRequest(`/leave/types${buildQueryString(params)}`);
  },
  getActiveLeaveTypes() {
    return apiRequest('/leave/types/active');
  },
  createLeaveType(data) {
    return apiRequest('/leave/types', { method: 'POST', body: JSON.stringify(data) });
  },
  updateLeaveType(data) {
    return apiRequest(`/leave/types/${data.id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteLeaveType(id, reason) {
    return apiRequest(`/leave/types/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
  },
  listLeaveRequests(params = {}) {
    return apiRequest(`/leave/requests${buildQueryString(params)}`);
  },
  applyLeave(data) {
    return apiRequest('/leave/requests', { method: 'POST', body: JSON.stringify(data) });
  },
  approveLeave(id, note = '') {
    return apiRequest(`/leave/requests/${id}/approve`, { method: 'POST', body: JSON.stringify({ note }) });
  },
  rejectLeave(id, note = '') {
    return apiRequest(`/leave/requests/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) });
  },
  getLeaveReport(params = {}) {
    return apiRequest(`/leave/report${buildQueryString(params)}`);
  },
};
