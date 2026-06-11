function mapActivityLog(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    userRole: row.user_role,
    actionType: row.action_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    module: row.module,
    description: row.description,
    metadata: row.metadata || {},
    beforeData: row.before_data || {},
    afterData: row.after_data || {},
    reason: row.reason || "",
    createdAt: row.created_at,
  };
}

export function insertActivityLog(client, log) {
  return client.query(
    `INSERT INTO activity_logs (
      id, tenant_id, user_id, action_type, entity_type, entity_id, module, description, metadata, before_data, after_data, reason
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      log.id,
      log.tenantId || null,
      log.userId,
      log.actionType,
      log.entityType,
      log.entityId,
      log.module,
      log.description,
      log.metadata || {},
      log.beforeData || {},
      log.afterData || {},
      log.reason || "",
    ],
  );
}

function buildFilterConditions(params, { tenantId, entityType, module, actionType, userId, dateFrom, dateTo, search }) {
  const conditions = [];

  if (tenantId) {
    params.push(tenantId);
    conditions.push(`activity_logs.tenant_id = $${params.length}`);
  }

  if (entityType) {
    params.push(entityType);
    conditions.push(`activity_logs.entity_type = $${params.length}`);
  }

  if (module) {
    params.push(module);
    conditions.push(`activity_logs.module = $${params.length}`);
  }

  if (actionType) {
    params.push(`${actionType}%`);
    conditions.push(`activity_logs.action_type ILIKE $${params.length}`);
  }

  if (userId) {
    params.push(userId);
    conditions.push(`activity_logs.user_id = $${params.length}`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`activity_logs.created_at::date >= $${params.length}`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`activity_logs.created_at::date <= $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    const index = params.length;
    conditions.push(`(
      users.name ILIKE $${index}
      OR users.email ILIKE $${index}
      OR activity_logs.action_type ILIKE $${index}
      OR activity_logs.entity_type ILIKE $${index}
      OR activity_logs.entity_id ILIKE $${index}
      OR activity_logs.description ILIKE $${index}
    )`);
  }

  return conditions;
}

export async function countActivityLogs(client, filters = {}) {
  const params = [];
  const conditions = buildFilterConditions(params, filters);
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count
     FROM activity_logs
     LEFT JOIN users ON users.id = activity_logs.user_id
     ${where}`,
    params,
  );
  return result.rows[0].count;
}

export async function listActivityLogsPage(client, filters = {}) {
  const { limit, offset } = filters;
  const params = [];
  const conditions = buildFilterConditions(params, filters);

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(limit, offset);

  const result = await client.query(
    `SELECT
      activity_logs.id,
      activity_logs.user_id,
      activity_logs.action_type,
      activity_logs.entity_type,
      activity_logs.entity_id,
      activity_logs.module,
      activity_logs.description,
      activity_logs.metadata,
      activity_logs.before_data,
      activity_logs.after_data,
      activity_logs.reason,
      activity_logs.created_at,
      users.name AS user_name,
      users.email AS user_email,
      users.role AS user_role
    FROM activity_logs
    LEFT JOIN users ON users.id = activity_logs.user_id
    ${where}
    ORDER BY activity_logs.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return result.rows.map(mapActivityLog);
}

export async function listActivityLogsForEntity(client, { entityType, entityId, tenantId, limit = 20 }) {
  const result = await client.query(
    `SELECT
      activity_logs.id,
      activity_logs.user_id,
      activity_logs.action_type,
      activity_logs.entity_type,
      activity_logs.entity_id,
      activity_logs.module,
      activity_logs.description,
      activity_logs.metadata,
      activity_logs.before_data,
      activity_logs.after_data,
      activity_logs.reason,
      activity_logs.created_at,
      users.name AS user_name,
      users.email AS user_email,
      users.role AS user_role
    FROM activity_logs
    LEFT JOIN users ON users.id = activity_logs.user_id
    WHERE activity_logs.entity_type = $1
      AND activity_logs.entity_id = $2
      AND activity_logs.tenant_id = $3
    ORDER BY activity_logs.created_at DESC
    LIMIT $4`,
    [entityType, entityId, tenantId, limit],
  );

  return result.rows.map(mapActivityLog);
}
