import { createId } from "../lib/ids.js";
import { buildPageResult, parsePagination } from "../lib/pagination.js";
import { moduleForEntityType } from "../lib/auditModules.js";
import {
  countActivityLogs,
  insertActivityLog,
  listActivityLogsForEntity,
  listActivityLogsPage,
} from "../repositories/activityLogRepository.js";

const PLATFORM_ROLES = new Set(["platform_admin", "system_developer"]);

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
      module: entry.module || moduleForEntityType(entry.entityType),
      description: entry.description,
      metadata: entry.metadata || {},
      beforeData: entry.before || {},
      afterData: entry.after || {},
      reason: entry.reason || "",
    });
  }

  async recordPrint({ tenantId, userId, entityType, entityId, label, actorName, actorRole }) {
    const client = await this.databaseManager.getPool().connect();
    try {
      const module = moduleForEntityType(entityType);
      return await insertActivityLog(client, {
        id: createId("log"),
        tenantId: tenantId || null,
        userId,
        actionType: `${module}.print`,
        entityType,
        entityId: entityId || null,
        module,
        description: `${actorName || "User"} printed/exported ${label || entityType}`,
        metadata: { actorName, actorRole, label },
        beforeData: {},
        afterData: {},
        reason: "",
      });
    } finally {
      client.release();
    }
  }

  async list(query = {}, tenantId = null, actor = null) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const search = String(query.search || "").trim();
    const entityType = String(query.entityType || "").trim();
    const module = String(query.module || "").trim();
    const actionType = String(query.actionType || "").trim();
    const userId = String(query.userId || "").trim();
    const dateFrom = String(query.dateFrom || "").trim();
    const dateTo = String(query.dateTo || "").trim();

    let resolvedTenantId = tenantId;
    if (actor && PLATFORM_ROLES.has(actor.role)) {
      const requestedTenantId = String(query.tenantId || "").trim();
      resolvedTenantId = requestedTenantId || null;
    }

    const filters = {
      search,
      tenantId: resolvedTenantId,
      entityType,
      module,
      actionType,
      userId,
      dateFrom,
      dateTo,
    };

    const client = await this.databaseManager.getPool().connect();
    try {
      const [items, total] = await Promise.all([
        listActivityLogsPage(client, { ...filters, limit, offset }),
        countActivityLogs(client, filters),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }

  async listForEntity(entityType, entityId, tenantId) {
    const client = await this.databaseManager.getPool().connect();
    try {
      return { items: await listActivityLogsForEntity(client, { entityType, entityId, tenantId }) };
    } finally {
      client.release();
    }
  }
}
