import { createId } from "../lib/ids.js";
import { buildPageResult, parsePagination } from "../lib/pagination.js";
import { countActivityLogs, insertActivityLog, listActivityLogsPage } from "../repositories/activityLogRepository.js";

export class AuditService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async record(client, entry) {
    return insertActivityLog(client, {
      id: createId("log"),
      tenantId: entry.tenantId || null,
      userId: entry.userId,
      actionType: entry.actionType,
      entityType: entry.entityType,
      entityId: entry.entityId || null,
      description: entry.description,
      metadata: entry.metadata || {},
    });
  }

  async list(query = {}, tenantId = null) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const search = String(query.search || "").trim();
    const entityType = String(query.entityType || "").trim();

    const client = await this.databaseManager.getPool().connect();
    try {
      const [items, total] = await Promise.all([
        listActivityLogsPage(client, { search, tenantId, entityType, limit, offset }),
        countActivityLogs(client, { search, tenantId, entityType }),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }
}
