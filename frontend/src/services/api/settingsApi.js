import { apiRequest } from './client.js';

export const settingsApi = {
  updateOrgSettings(fields) {
    return apiRequest("/org", { method: "PATCH", body: JSON.stringify(fields) });
  },
};
