import { apiRequest, buildQueryString } from './client.js';

export const attendanceApi = {
  listDailyAttendance(params = {}) {
    return apiRequest(`/attendance/daily${buildQueryString(params)}`);
  },
  getMonthlyAttendanceReport(params = {}) {
    return apiRequest(`/attendance/monthly${buildQueryString(params)}`);
  },
  createAttendance(data) {
    return apiRequest('/attendance', { method: 'POST', body: JSON.stringify(data) });
  },
  updateAttendance(data) {
    return apiRequest(`/attendance/${data.id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
};
