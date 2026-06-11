export function createPasswordResetToken(client, entry) {
  return client.query(
    `INSERT INTO password_reset_tokens (id, user_id, tenant_id, token, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [entry.id, entry.userId, entry.tenantId || null, entry.token, entry.expiresAt],
  );
}

export async function findValidResetToken(client, token) {
  const result = await client.query(
    `SELECT id, user_id, tenant_id, token, expires_at, used_at
     FROM password_reset_tokens
     WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [token],
  );

  if (!result.rows[0]) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    tenantId: row.tenant_id || null,
    token: row.token,
    expiresAt: row.expires_at,
  };
}

export function markResetTokenUsed(client, id) {
  return client.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1", [id]);
}

export function deleteResetTokensForUser(client, userId) {
  return client.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [userId]);
}

export async function listPendingResetRequests(client, tenantId) {
  if (tenantId) {
    const result = await client.query(
      `SELECT password_reset_tokens.id, password_reset_tokens.token, password_reset_tokens.expires_at,
              password_reset_tokens.created_at, users.id AS user_id, users.name, users.email
       FROM password_reset_tokens
       INNER JOIN users ON users.id = password_reset_tokens.user_id
       WHERE password_reset_tokens.used_at IS NULL
         AND password_reset_tokens.expires_at > NOW()
         AND users.tenant_id = $1
       ORDER BY password_reset_tokens.created_at DESC`,
      [tenantId],
    );
    return mapPendingRequests(result.rows);
  }

  const result = await client.query(
    `SELECT password_reset_tokens.id, password_reset_tokens.token, password_reset_tokens.expires_at,
            password_reset_tokens.created_at, users.id AS user_id, users.name, users.email
     FROM password_reset_tokens
     INNER JOIN users ON users.id = password_reset_tokens.user_id
     WHERE password_reset_tokens.used_at IS NULL
       AND password_reset_tokens.expires_at > NOW()
     ORDER BY password_reset_tokens.created_at DESC`,
  );
  return mapPendingRequests(result.rows);
}

function mapPendingRequests(rows) {
  return rows.map((row) => ({
    id: row.id,
    token: row.token,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    userId: row.user_id,
    userName: row.name,
    userEmail: row.email,
  }));
}
