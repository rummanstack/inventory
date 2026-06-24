import { apiRequest, buildQueryString } from './client.js';

export const repairJobsApi = {
  listRepairJobs({ page, pageSize, status, technicianId, search, dateFrom, dateTo } = {}) {
    return apiRequest(`/repair-jobs${buildQueryString({ page, pageSize, status, technicianId, search, dateFrom, dateTo })}`);
  },

  getRepairJob(jobId) {
    return apiRequest(`/repair-jobs/${jobId}`);
  },

  createRepairJob(job) {
    return apiRequest('/repair-jobs', { method: 'POST', body: JSON.stringify(job) });
  },

  updateRepairJob(job) {
    return apiRequest(`/repair-jobs/${job.id}`, { method: 'PATCH', body: JSON.stringify(job) });
  },

  deleteRepairJob(jobId, reason) {
    return apiRequest(`/repair-jobs/${jobId}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
  },

  listRepairJobsTrash({ page, pageSize } = {}) {
    return apiRequest(`/repair-jobs/trash${buildQueryString({ page, pageSize })}`);
  },
};
