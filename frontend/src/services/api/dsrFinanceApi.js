import { apiRequest, buildQueryString } from './client.js';

export const dsrFinanceApi = {
  getAdvanceReport({ date, month, dsrId } = {}) {
    return apiRequest(`/dsr-advances${buildQueryString({ date, month, dsrId })}`);
  },

  createAdvance(record) {
    return apiRequest("/dsr-advances", { method: "POST", body: JSON.stringify(record) });
  },

  updateAdvance(record) {
    return apiRequest(`/dsr-advances/${record.id}`, { method: "PATCH", body: JSON.stringify(record) });
  },
  deleteAdvance(recordId) {
    return apiRequest(`/dsr-advances/${recordId}`, { method: "DELETE" });
  },

  listDsrDueLedger({ page, pageSize, dsrId, dateFrom, dateTo } = {}) {
    return apiRequest(`/dsr-due-ledger${buildQueryString({ page, pageSize, dsrId, dateFrom, dateTo })}`);
  },

  getDsrDueStatement({ dsrId, dateFrom, dateTo } = {}) {
    return apiRequest(`/dsr-due-ledger/statement${buildQueryString({ dsrId, dateFrom, dateTo })}`);
  },

  getDsrDueBalance(dsrId) {
    return apiRequest(`/dsr-due-ledger/balance${buildQueryString({ dsrId })}`);
  },

  settleDsrDue({ dsrId, amount, note }) {
    return apiRequest("/dsr-due-ledger/settle", {
      method: "POST",
      body: JSON.stringify({ dsrId, amount, note }),
    });
  },
};
