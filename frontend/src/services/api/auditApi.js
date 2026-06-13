import { apiRequest } from './client.js';

export const auditApi = {
  getEntityAuditHistory(entityType, entityId) {
    return apiRequest(`/audit/entity/${entityType}/${entityId}`);
  },

  recordPrint({ entityType, entityId, label } = {}) {
    return apiRequest("/audit/print", { method: "POST", body: JSON.stringify({ entityType, entityId, label }) });
  },
};
