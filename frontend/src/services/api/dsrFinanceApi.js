import { apiRequest } from './client.js';

export const dsrFinanceApi = {
  getCashReceiptReport({ date, month, dsrId } = {}) {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (month) params.set("month", month);
    if (dsrId) params.set("dsrId", dsrId);
    const query = params.toString();
    return apiRequest(`/dsr-cash-receipts${query ? `?${query}` : ""}`);
  },

  createCashReceipt(record) {
    return apiRequest("/dsr-cash-receipts", { method: "POST", body: JSON.stringify(record) });
  },
  updateCashReceipt(record) {
    return apiRequest(`/dsr-cash-receipts/${record.id}`, { method: "PATCH", body: JSON.stringify(record) });
  },

  deleteCashReceipt(recordId) {
    return apiRequest(`/dsr-cash-receipts/${recordId}`, { method: "DELETE" });
  },

  getAdvanceReport({ date, month, dsrId } = {}) {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (month) params.set("month", month);
    if (dsrId) params.set("dsrId", dsrId);
    const query = params.toString();
    return apiRequest(`/dsr-advances${query ? `?${query}` : ""}`);
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
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (dsrId) params.set("dsrId", dsrId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const query = params.toString();
    return apiRequest(`/dsr-due-ledger${query ? `?${query}` : ""}`);
  },

  getDsrDueStatement({ dsrId, dateFrom, dateTo } = {}) {
    const params = new URLSearchParams();
    if (dsrId) params.set("dsrId", dsrId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const query = params.toString();
    return apiRequest(`/dsr-due-ledger/statement${query ? `?${query}` : ""}`);
  },

  getDsrDueBalance(dsrId) {
    const params = new URLSearchParams();
    if (dsrId) params.set("dsrId", dsrId);
    const query = params.toString();
    return apiRequest(`/dsr-due-ledger/balance${query ? `?${query}` : ""}`);
  },

  settleDsrDue({ dsrId, amount, note }) {
    return apiRequest("/dsr-due-ledger/settle", {
      method: "POST",
      body: JSON.stringify({ dsrId, amount, note }),
    });
  },
};
