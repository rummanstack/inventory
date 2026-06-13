import { apiRequest } from './client.js';

export const settlementsApi = {
  listSettlements({ page, pageSize, search, dsrId, dateFrom, dateTo } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (search) params.set("search", search);
    if (dsrId) params.set("dsrId", dsrId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const query = params.toString();
    return apiRequest(`/settlements${query ? `?${query}` : ""}`);
  },

  saveSettlement(settlement) {
    return apiRequest("/settlements", { method: "POST", body: JSON.stringify(settlement) });
  },
};
