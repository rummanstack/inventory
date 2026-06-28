import { apiRequest, buildQueryString } from './client.js';

export const dsrsApi = {
  listDsrs({ page, pageSize, search } = {}) {
    return apiRequest(`/dsrs${buildQueryString({ page, pageSize, search })}`);
  },

  getDsrsDirectory() {
    return apiRequest("/dsrs/directory");
  },

  createDsr(dsr) {
    return apiRequest("/dsrs", { method: "POST", body: JSON.stringify(dsr) });
  },

  updateDsr(dsr) {
    return apiRequest(`/dsrs/${dsr.id}`, { method: "PUT", body: JSON.stringify(dsr) });
  },

  deleteDsr(dsrId, reason) {
    return apiRequest(`/dsrs/${dsrId}`, { method: "DELETE", body: JSON.stringify({ reason }) });
  },

  listDsrsTrash({ page, pageSize } = {}) {
    return apiRequest(`/dsrs/trash${buildQueryString({ page, pageSize })}`);
  },

  restoreDsr(dsrId) {
    return apiRequest(`/dsrs/${dsrId}/restore`, { method: "POST" });
  },

  permanentlyDeleteDsr(dsrId) {
    return apiRequest(`/dsrs/${dsrId}/permanent`, { method: "DELETE" });
  },

};
