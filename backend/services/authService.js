import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { hashPassword, validatePasswordStrength, verifyPassword } from "../lib/passwords.js";
import { createSessionToken, hashSessionToken } from "../lib/sessionTokens.js";
import {
  LOCKOUT_DURATION_MINUTES,
  LOGIN_HISTORY_LIMIT,
  MAX_FAILED_LOGIN_ATTEMPTS,
  PASSWORD_RESET_TOKEN_TTL_MINUTES,
} from "../lib/security.js";
import {
  deleteAllSessionsForUser,
  deleteExpiredUserSessions,
  deleteOtherSessionsForUser,
  deleteSessionByIdForUser,
  deleteUserSessionByTokenHash,
  findActiveUserBySessionTokenHash,
  findUserByEmail,
  findUserById,
  insertUserSession,
  listSessionsForUser,
  resetLoginLockState,
  setLoginLockState,
  touchSession,
  updatePasswordHashAndClearFlags,
} from "../repositories/userRepository.js";
import { insertLoginHistory, listLoginHistoryForUser } from "../repositories/loginHistoryRepository.js";
import {
  createPasswordResetToken,
  deleteResetTokensForUser,
  findValidResetToken,
  markResetTokenUsed,
} from "../repositories/passwordResetRepository.js";
import { findTenantById, findTenantBySlug } from "../repositories/tenantRepository.js";

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    tenantId: row.tenant_id || null,
    mustChangePassword: Boolean(row.must_change_password),
  };
}

export class AuthService {
  constructor(databaseManager, { sessionDays, auditService }) {
    this.databaseManager = databaseManager;
    this.sessionDays = sessionDays;
    this.auditService = auditService;
  }

  getSessionMaxAgeMs() {
    return this.sessionDays * 24 * 60 * 60 * 1000;
  }

  async login(input, requestMeta = {}) {
    const email = String(input.email || "")
      .trim()
      .toLowerCase();
    const password = String(input.password || "");
    const orgSlug = String(input.orgSlug || "")
      .trim()
      .toLowerCase();
    const ipAddress = requestMeta.ip || "";
    const userAgent = requestMeta.userAgent || "";

    assert(email && password, "Email and password are required.");

    return this.databaseManager.withTransaction(async (client) => {
      await deleteExpiredUserSessions(client);

      let tenant = null;

      if (orgSlug) {
        tenant = await findTenantBySlug(client, orgSlug);
        assert(tenant, "Organization not found. Check your organization code.", 401);
        assert(tenant.status === "active", "This organization subscription is inactive. Contact support.", 403);
      }

      const tenantIdFilter = orgSlug ? tenant.id : undefined;
      const userRow = await findUserByEmail(client, email, tenantIdFilter);

      if (userRow?.locked_until && new Date(userRow.locked_until) > new Date()) {
        await insertLoginHistory(client, {
          id: createId("login"),
          userId: userRow.id,
          tenantId: userRow.tenant_id || null,
          email,
          success: false,
          failureReason: "locked",
          ipAddress,
          userAgent,
        });
        assert(false, "This account is temporarily locked due to repeated failed sign-in attempts. Please try again later.", 423);
      }

      const validPassword = userRow ? await verifyPassword(password, userRow.password_hash) : false;

      if (!userRow || userRow.status !== "active" || !validPassword) {
        if (userRow) {
          const nextCount = (userRow.failed_login_count || 0) + 1;
          if (nextCount >= MAX_FAILED_LOGIN_ATTEMPTS) {
            await setLoginLockState(client, userRow.id, {
              failedLoginCount: 0,
              lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000),
            });
          } else {
            await setLoginLockState(client, userRow.id, { failedLoginCount: nextCount, lockedUntil: null });
          }
        }

        await insertLoginHistory(client, {
          id: createId("login"),
          userId: userRow?.id || null,
          tenantId: userRow?.tenant_id || tenant?.id || null,
          email,
          success: false,
          failureReason: "invalid_credentials",
          ipAddress,
          userAgent,
        });

        assert(false, "Invalid email or password.", 401);
      }

      if (!tenant && userRow.tenant_id) {
        tenant = await findTenantById(client, userRow.tenant_id);
        assert(tenant?.status === "active", "This organization subscription is inactive. Contact support.", 403);
      }

      await resetLoginLockState(client, userRow.id);

      const token = createSessionToken();
      const tokenHash = hashSessionToken(token);
      const expiresAt = new Date(Date.now() + this.getSessionMaxAgeMs());

      await insertUserSession(client, {
        id: createId("session"),
        userId: userRow.id,
        tokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      });

      await insertLoginHistory(client, {
        id: createId("login"),
        userId: userRow.id,
        tenantId: userRow.tenant_id || null,
        email: userRow.email,
        success: true,
        ipAddress,
        userAgent,
      });

      await this.auditService.record(client, {
        tenantId: userRow.tenant_id || null,
        userId: userRow.id,
        actionType: "auth.login",
        entityType: "session",
        entityId: tokenHash.slice(0, 12),
        description: `${userRow.name} logged in`,
        metadata: { email: userRow.email, role: userRow.role },
      });

      return {
        token,
        user: mapUser(userRow),
        tenant,
      };
    });
  }

  async getUserFromSessionToken(token, requestMeta = {}) {
    if (!token) {
      return null;
    }

    const client = await this.databaseManager.getPool().connect();
    try {
      const tokenHash = hashSessionToken(token);
      const user = await findActiveUserBySessionTokenHash(client, tokenHash);
      if (!user) {
        return null;
      }

      let tenant = null;
      if (user.tenantId) {
        tenant = await findTenantById(client, user.tenantId);
      }

      await touchSession(client, tokenHash, { ipAddress: requestMeta.ip, userAgent: requestMeta.userAgent });

      return { user, tenant };
    } finally {
      client.release();
    }
  }

  async logout(token) {
    if (!token) {
      return;
    }

    await this.databaseManager.withTransaction(async (client) => {
      await deleteExpiredUserSessions(client);
      const tokenHash = hashSessionToken(token);
      const result = await findActiveUserBySessionTokenHash(client, tokenHash);
      const user = result?.user || result;
      await deleteUserSessionByTokenHash(client, tokenHash);

      if (user) {
        await this.auditService.record(client, {
          tenantId: user.tenantId || null,
          userId: user.id,
          actionType: "auth.logout",
          entityType: "session",
          entityId: tokenHash.slice(0, 12),
          description: `${user.name} logged out`,
          metadata: { email: user.email, role: user.role },
        });
      }
    });
  }

  async forgotPassword({ email, orgSlug }) {
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();
    const normalizedSlug = String(orgSlug || "")
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      return { ok: true };
    }

    await this.databaseManager.withTransaction(async (client) => {
      let tenant = null;
      if (normalizedSlug) {
        tenant = await findTenantBySlug(client, normalizedSlug);
      }

      const tenantIdFilter = normalizedSlug ? tenant?.id : undefined;
      const userRow = await findUserByEmail(client, normalizedEmail, tenantIdFilter);

      if (!userRow || userRow.status !== "active") {
        return;
      }

      await deleteResetTokensForUser(client, userRow.id);
      await createPasswordResetToken(client, {
        id: createId("reset"),
        userId: userRow.id,
        tenantId: userRow.tenant_id || null,
        token: createSessionToken(),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000),
      });
    });

    return { ok: true };
  }

  async resetPassword({ token, newPassword }) {
    const tokenValue = String(token || "").trim();
    assert(tokenValue, "Reset token is required.");

    const strengthError = validatePasswordStrength(newPassword);
    assert(!strengthError, strengthError);

    await this.databaseManager.withTransaction(async (client) => {
      const resetToken = await findValidResetToken(client, tokenValue);
      assert(resetToken, "This reset link is invalid or has expired.", 400);

      const userRow = await findUserById(client, resetToken.userId);
      assert(userRow, "User not found.", 404);

      const passwordHash = await hashPassword(newPassword);
      await updatePasswordHashAndClearFlags(client, userRow.id, passwordHash);
      await markResetTokenUsed(client, resetToken.id);
      await deleteAllSessionsForUser(client, userRow.id);

      await this.auditService.record(client, {
        tenantId: userRow.tenant_id || null,
        userId: userRow.id,
        actionType: "auth.password_reset",
        entityType: "user",
        entityId: userRow.id,
        description: `${userRow.name} reset their password`,
        metadata: { email: userRow.email },
      });
    });

    return { ok: true };
  }

  async listSessions(userId, currentTokenHash) {
    const client = await this.databaseManager.getPool().connect();
    try {
      const sessions = await listSessionsForUser(client, userId);
      return sessions.map(({ tokenHash, ...session }) => ({
        ...session,
        current: tokenHash === currentTokenHash,
      }));
    } finally {
      client.release();
    }
  }

  async revokeSession(userId, sessionId) {
    const client = await this.databaseManager.getPool().connect();
    try {
      await deleteSessionByIdForUser(client, sessionId, userId);
    } finally {
      client.release();
    }
  }

  async revokeOtherSessions(userId, currentTokenHash) {
    const client = await this.databaseManager.getPool().connect();
    try {
      await deleteOtherSessionsForUser(client, userId, currentTokenHash);
    } finally {
      client.release();
    }
  }

  async getLoginHistory(userId) {
    const client = await this.databaseManager.getPool().connect();
    try {
      return listLoginHistoryForUser(client, userId, LOGIN_HISTORY_LIMIT);
    } finally {
      client.release();
    }
  }
}
