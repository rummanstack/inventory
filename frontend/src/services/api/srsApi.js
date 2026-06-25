import { apiRequest, buildQueryString } from './client.js';

export const srsApi = {
  listSrs({ page, pageSize, search } = {}) {
    return apiRequest(`/srs${buildQueryString({ page, pageSize, search })}`);
  },

  getSrsDirectory() {
    return apiRequest("/srs/directory");
  },

  createSr(sr) {
    return apiRequest("/srs", { method: "POST", body: JSON.stringify(sr) });
  },

  updateSr(sr) {
    return apiRequest(`/srs/${sr.id}`, { method: "PUT", body: JSON.stringify(sr) });
  },

  deleteSr(srId, reason) {
    return apiRequest(`/srs/${srId}`, { method: "DELETE", body: JSON.stringify({ reason }) });
  },

  listSrsTrash({ page, pageSize } = {}) {
    return apiRequest(`/srs/trash${buildQueryString({ page, pageSize })}`);
  },

  restoreSr(srId) {
    return apiRequest(`/srs/${srId}/restore`, { method: "POST" });
  },

  permanentlyDeleteSr(srId) {
    return apiRequest(`/srs/${srId}/permanent`, { method: "DELETE" });
  },

  listSrDueLedger({ srId, dateFrom, dateTo, page, pageSize } = {}) {
    return apiRequest(`/sr-due-ledger${buildQueryString({ srId, dateFrom, dateTo, page, pageSize })}`);
  },

  getSrDueLedgerStatement({ srId, dateFrom, dateTo } = {}) {
    return apiRequest(`/sr-due-ledger/statement${buildQueryString({ srId, dateFrom, dateTo })}`);
  },

  getSrDueBalance(srId) {
    return apiRequest(`/sr-due-ledger/balance${buildQueryString({ srId })}`);
  },

  collectSrDue(data) {
    return apiRequest("/sr-due-ledger/collect", { method: "POST", body: JSON.stringify(data) });
  },
};
