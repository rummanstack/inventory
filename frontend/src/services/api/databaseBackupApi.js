import { apiRequest, downloadRequest } from './client.js';

export const databaseBackupApi = {
  downloadDatabaseBackup(format = "sql") {
    return downloadRequest(`/database-backup?format=${format}`);
  },

  listBackupHistory({ page, pageSize, search } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", page);
    if (pageSize) params.set("pageSize", pageSize);
    if (search) params.set("search", search);
    const query = params.toString();
    return apiRequest(`/database-backup/history${query ? `?${query}` : ""}`);
  },
};
