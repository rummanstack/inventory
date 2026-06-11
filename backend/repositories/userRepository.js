function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    tenantId: row.tenant_id || null,
    failedLoginCount: row.failed_login_count ?? 0,
    lockedUntil: row.locked_until || null,
    mustChangePassword: Boolean(row.must_change_password),
  };
}

export async function countUsers(client) {
  const result = await client.query("SELECT COUNT(*)::INTEGER AS count FROM users");
  return result.rows[0].count;
}

export async function findUserByRole(client, role) {
  const result = await client.query("SELECT * FROM users WHERE role = $1 LIMIT 1", [role]);
  return result.rows[0] || null;
}

export function insertUser(client, user) {
  return client.query(
    `INSERT INTO users (id, name, email, password_hash, role, status, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [user.id, user.name, user.email.toLowerCase(), user.passwordHash, user.role, user.status, user.tenantId || null],
  );
}

export async function findUserByEmail(client, email, tenantId) {
  if (tenantId === null) {
    const result = await client.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND tenant_id IS NULL", [
      email,
    ]);
    return result.rows[0] || null;
  }

  if (tenantId) {
    const result = await client.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND tenant_id = $2", [
      email,
      tenantId,
    ]);
    return result.rows[0] || null;
  }

  const result = await client.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
  return result.rows[0] || null;
}

export async function findUserById(client, id) {
  const result = await client.query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0] || null;
}

export async function listUsers(client, tenantId) {
  if (tenantId) {
    const result = await client.query(
      `SELECT id, name, email, role, status, tenant_id, created_at, updated_at, locked_until, must_change_password
       FROM users
       WHERE tenant_id = $1 AND role != 'system_developer'
       ORDER BY created_at DESC, name ASC`,
      [tenantId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      tenantId: row.tenant_id || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lockedUntil: row.locked_until || null,
      mustChangePassword: Boolean(row.must_change_password),
    }));
  }

  const result = await client.query(
    `SELECT id, name, email, role, status, tenant_id, created_at, updated_at, locked_until, must_change_password
     FROM users
     ORDER BY created_at DESC, name ASC`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    tenantId: row.tenant_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lockedUntil: row.locked_until || null,
    mustChangePassword: Boolean(row.must_change_password),
  }));
}

export function insertUserSession(client, session) {
  return client.query(
    `INSERT INTO user_sessions (id, user_id, token_hash, expires_at, ip_address, user_agent, last_seen_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [session.id, session.userId, session.tokenHash, session.expiresAt, session.ipAddress || "", session.userAgent || ""],
  );
}

export function deleteUserSessionByTokenHash(client, tokenHash) {
  return client.query("DELETE FROM user_sessions WHERE token_hash = $1", [tokenHash]);
}

export function deleteExpiredUserSessions(client) {
  return client.query("DELETE FROM user_sessions WHERE expires_at <= NOW()");
}

export async function findActiveUserBySessionTokenHash(client, tokenHash) {
  const result = await client.query(
    `SELECT users.id, users.name, users.email, users.role, users.status, users.tenant_id,
            users.failed_login_count, users.locked_until, users.must_change_password
     FROM user_sessions
     INNER JOIN users ON users.id = user_sessions.user_id
     WHERE user_sessions.token_hash = $1
       AND user_sessions.expires_at > NOW()
       AND users.status = 'active'
     LIMIT 1`,
    [tokenHash],
  );

  return mapUser(result.rows[0]);
}

export function setLoginLockState(client, userId, { failedLoginCount, lockedUntil }) {
  return client.query("UPDATE users SET failed_login_count = $2, locked_until = $3 WHERE id = $1", [
    userId,
    failedLoginCount,
    lockedUntil,
  ]);
}

export function resetLoginLockState(client, userId) {
  return client.query("UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = $1", [userId]);
}

export function setMustChangePassword(client, userId, value) {
  return client.query("UPDATE users SET must_change_password = $2 WHERE id = $1", [userId, Boolean(value)]);
}

export function updatePasswordHashAndClearFlags(client, userId, passwordHash) {
  return client.query(
    `UPDATE users
     SET password_hash = $2,
         must_change_password = false,
         failed_login_count = 0,
         locked_until = NULL,
         updated_at = NOW()
     WHERE id = $1`,
    [userId, passwordHash],
  );
}

export async function listSessionsForUser(client, userId) {
  const result = await client.query(
    `SELECT id, token_hash, ip_address, user_agent, created_at, last_seen_at, expires_at
     FROM user_sessions
     WHERE user_id = $1
     ORDER BY last_seen_at DESC`,
    [userId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    tokenHash: row.token_hash,
    ipAddress: row.ip_address || "",
    userAgent: row.user_agent || "",
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    expiresAt: row.expires_at,
  }));
}

export function deleteSessionByIdForUser(client, sessionId, userId) {
  return client.query("DELETE FROM user_sessions WHERE id = $1 AND user_id = $2", [sessionId, userId]);
}

export function deleteOtherSessionsForUser(client, userId, currentTokenHash) {
  return client.query("DELETE FROM user_sessions WHERE user_id = $1 AND token_hash != $2", [
    userId,
    currentTokenHash,
  ]);
}

export function deleteAllSessionsForUser(client, userId) {
  return client.query("DELETE FROM user_sessions WHERE user_id = $1", [userId]);
}

export function touchSession(client, tokenHash, { ipAddress, userAgent }) {
  return client.query(
    "UPDATE user_sessions SET last_seen_at = NOW(), ip_address = $2, user_agent = $3 WHERE token_hash = $1",
    [tokenHash, ipAddress || "", userAgent || ""],
  );
}

export function deleteUser(client, id, tenantId) {
  return client.query("DELETE FROM users WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $2", [id, tenantId]);
}

export function updateUser(client, user) {
  if (user.passwordHash) {
    return client.query(
      `UPDATE users
       SET name = $3,
           email = LOWER($4),
           password_hash = $5,
           role = $6,
           status = $7,
           updated_at = NOW()
       WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $2`,
      [user.id, user.tenantId, user.name, user.email, user.passwordHash, user.role, user.status],
    );
  }

  return client.query(
    `UPDATE users
     SET name = $3,
         email = LOWER($4),
         role = $5,
         status = $6,
         updated_at = NOW()
     WHERE id = $1 AND tenant_id IS NOT DISTINCT FROM $2`,
    [user.id, user.tenantId, user.name, user.email, user.role, user.status],
  );
}
