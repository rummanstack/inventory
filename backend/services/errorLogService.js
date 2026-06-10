import { createId } from "../lib/ids.js";
import { buildPageResult, parsePagination } from "../lib/pagination.js";
import { countErrorLogs, insertErrorLog, listErrorLogsPage } from "../repositories/errorLogRepository.js";

export class ErrorLogService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async record(entry) {
    const client = await this.databaseManager.getPool().connect();
    try {
      await insertErrorLog(client, {
        id: createId("errlog"),
        tenantId: entry.tenantId || null,
        userId: entry.userId || null,
        method: entry.method,
        path: entry.path,
        statusCode: entry.statusCode,
        message: entry.message,
        stack: entry.stack,
      });
    } finally {
      client.release();
    }
  }

  async list(query = {}) {
    const { page, pageSize, limit, offset } = parsePagination(query);

    const client = await this.databaseManager.getPool().connect();
    try {
      const [items, total] = await Promise.all([
        listErrorLogsPage(client, { limit, offset }),
        countErrorLogs(client),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }
}
