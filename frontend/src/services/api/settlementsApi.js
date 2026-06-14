import { apiRequest, buildQueryString } from './client.js';

export const settlementsApi = {
  listSettlements({ page, pageSize, search, dsrId, dateFrom, dateTo } = {}) {
    return apiRequest(`/settlements${buildQueryString({ page, pageSize, search, dsrId, dateFrom, dateTo })}`);
  },

  saveSettlement(settlement) {
    return apiRequest("/settlements", { method: "POST", body: JSON.stringify(settlement) });
  },
};
