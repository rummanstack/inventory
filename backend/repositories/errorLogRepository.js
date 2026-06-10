function mapErrorLog(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    method: row.method,
    path: row.path,
    statusCode: row.status_code,
    message: row.message,
    stack: row.stack,
    createdAt: row.created_at,
  };
}

export function insertErrorLog(client, log) {
  return client.query(
    `INSERT INTO error_logs (
      id, tenant_id, user_id, method, path, status_code, message, stack
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      log.id,
      log.tenantId || null,
      log.userId || null,
      log.method || null,
      log.path || null,
      log.statusCode || null,
      log.message || null,
      log.stack || null,
    ],
  );
}

export async function countErrorLogs(client) {
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM error_logs`);
  return result.rows[0].count;
}

export async function listErrorLogsPage(client, { limit, offset }) {
  const result = await client.query(
    `SELECT
      error_logs.id,
      error_logs.tenant_id,
      error_logs.user_id,
      error_logs.method,
      error_logs.path,
      error_logs.status_code,
      error_logs.message,
      error_logs.stack,
      error_logs.created_at,
      users.name AS user_name,
      users.email AS user_email
    FROM error_logs
    LEFT JOIN users ON users.id = error_logs.user_id
    ORDER BY error_logs.created_at DESC
    LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  return result.rows.map(mapErrorLog);
}
