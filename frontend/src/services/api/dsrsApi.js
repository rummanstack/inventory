import { apiRequest } from './client.js';

export const dsrsApi = {
  listDsrs({ page, pageSize, search } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (search) params.set("search", search);
    const query = params.toString();
    return apiRequest(`/dsrs${query ? `?${query}` : ""}`);
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
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    const query = params.toString();
    return apiRequest(`/dsrs/trash${query ? `?${query}` : ""}`);
  },

  restoreDsr(dsrId) {
    return apiRequest(`/dsrs/${dsrId}/restore`, { method: "POST" });
  },

  permanentlyDeleteDsr(dsrId) {
    return apiRequest(`/dsrs/${dsrId}/permanent`, { method: "DELETE" });
  },
};
