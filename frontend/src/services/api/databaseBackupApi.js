import { apiRequest, downloadRequest, buildQueryString } from './client.js';

export const databaseBackupApi = {
  downloadDatabaseBackup(format = "sql") {
    return downloadRequest(`/database-backup?format=${format}`);
  },

  listBackupHistory({ page, pageSize, search } = {}) {
    return apiRequest(`/database-backup/history${buildQueryString({ page, pageSize, search })}`);
  },
};
