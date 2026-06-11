export function insertLoginHistory(client, entry) {
  return client.query(
    `INSERT INTO login_history (id, user_id, tenant_id, email, success, failure_reason, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      entry.id,
      entry.userId || null,
      entry.tenantId || null,
      entry.email,
      entry.success,
      entry.failureReason || "",
      entry.ipAddress || "",
      entry.userAgent || "",
    ],
  );
}

export async function listLoginHistoryForUser(client, userId, limit) {
  const result = await client.query(
    `SELECT id, success, failure_reason, ip_address, user_agent, created_at
     FROM login_history
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit],
  );

  return result.rows.map((row) => ({
    id: row.id,
    success: row.success,
    failureReason: row.failure_reason || "",
    ipAddress: row.ip_address || "",
    userAgent: row.user_agent || "",
    createdAt: row.created_at,
  }));
}
