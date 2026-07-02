import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { generateTempPassword, hashPassword, validatePasswordStrength, verifyPassword } from "../lib/passwords.js";
import { USER_ROLES, TENANT_ROLE_VALUES } from "../lib/roles.js";
import {
  countTrashedUsers,
  deleteAllSessionsForUser,
  findTrashedUserById,
  findUserByEmail,
  findUserById,
  insertUser,
  listTrashedUsers,
  listUsers as listUsersRepo,
  permanentlyDeleteUser as permanentlyDeleteUserRepo,
  resetLoginLockState,
  restoreUser as restoreUserRepo,
  setMustChangePassword,
  softDeleteUser,
  updatePasswordHashAndClearFlags,
  updateUser as updateUserRepo,
} from "../repositories/userRepository.js";
import { listPendingResetRequests } from "../repositories/passwordResetRepository.js";
import { findTenantById, listTenants as listTenantsRepo } from "../repositories/tenantRepository.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function normalizeName(name) {
  return String(name || "").trim();
}

function allowedRolesForActor(actorRole) {
  if (actorRole === USER_ROLES.SYSTEM_DEVELOPER) {
    return TENANT_ROLE_VALUES;
  }

  if (actorRole === USER_ROLES.SUPER_ADMIN) {
    return TENANT_ROLE_VALUES;
  }

  return TENANT_ROLE_VALUES.filter((role) => role !== USER_ROLES.SUPER_ADMIN);
}

function normalizeRole(role, actor) {
  const value = String(role || "").trim();
  assert(allowedRolesForActor(actor.role).includes(value), "Invalid role.");
  return value;
}

function normalizeStatus(status) {
  const value = String(status || "")
    .trim()
    .toLowerCase();
  assert(["active", "inactive"].includes(value), "Invalid status.");
  return value;
}

export class UserService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async listUsers(actor) {
    const client = await this.databaseManager.getPool().connect();
    try {
      if (actor.role === USER_ROLES.SYSTEM_DEVELOPER) {
        const [users, tenants] = await Promise.all([listUsersRepo(client, null), listTenantsRepo(client)]);
        const tenantNames = new Map(tenants.map((tenant) => [tenant.id, tenant.name]));
        return users.map((user) => ({ ...user, tenantName: tenantNames.get(user.tenantId) || (user.tenantId ? user.tenantId : 'Platform') }));
      }

      return await listUsersRepo(client, actor.tenantId);
    } finally {
      client.release();
    }
  }

  async createUser(input, actor) {
    const name = normalizeName(input.name);
    const email = normalizeEmail(input.email);
    const password = String(input.password || "");
    const role = normalizeRole(input.role || allowedRolesForActor(actor.role)[0], actor);
    const status = normalizeStatus(input.status || "active");

    assert(name && email && password, "Name, email, and password are required.");
    const passwordStrengthError = validatePasswordStrength(password);
    assert(!passwordStrengthError, passwordStrengthError);

    await this.databaseManager.withTransaction(async (client) => {
      let tenantId = actor.tenantId;

      if (actor.role === USER_ROLES.SYSTEM_DEVELOPER) {
        assert(input.tenantId, "An organization is required.");
        const tenant = await findTenantById(client, input.tenantId);
        assert(tenant, "Organization not found.");
        tenantId = tenant.id;
      }

      // email is globally unique (schema.js), not per-tenant, so this must
      // check across all tenants or a cross-tenant collision slips past
      // this assert and crashes into a raw Postgres 23505 on insert.
      const existingUser = await findUserByEmail(client, email);
      assert(!existingUser, "A user with this email already exists.");

      const user = {
        id: createId("user"),
        name,
        email,
        passwordHash: await hashPassword(password),
        role,
        status,
        tenantId,
        avatarUrl: input.avatarUrl || null,
      };

      await insertUser(client, user);
      await this.auditService.record(client, {
        tenantId,
        userId: actor.id,
        actionType: "user.create",
        entityType: "user",
        entityId: user.id,
        description: `${actor.name} created user ${user.email}`,
        metadata: { role, status },
      });
    });

    return this.listUsers(actor);
  }

  async updateUser(userId, input, actor) {
    let nextEmail = "";

    await this.databaseManager.withTransaction(async (client) => {
      const existingUser = await findUserById(client, userId);
      assert(existingUser, "User not found.", 404);

      if (actor.role !== USER_ROLES.SYSTEM_DEVELOPER) {
        assert(existingUser.tenant_id === actor.tenantId, "User not found.", 404);
      }

      assert(allowedRolesForActor(actor.role).includes(existingUser.role), "Forbidden.", 403);

      const nextName = input.name === undefined ? existingUser.name : normalizeName(input.name);
      nextEmail = input.email === undefined ? existingUser.email : normalizeEmail(input.email);
      const nextRole = input.role === undefined ? existingUser.role : normalizeRole(input.role, actor);
      const nextStatus = input.status === undefined ? existingUser.status : normalizeStatus(input.status);
      const nextAvatarUrl = input.avatarUrl === undefined ? existingUser.avatar_url : input.avatarUrl || null;

      if (input.password) {
        const passwordStrengthError = validatePasswordStrength(input.password);
        assert(!passwordStrengthError, passwordStrengthError);
      }
      const nextPasswordHash = input.password ? await hashPassword(String(input.password)) : null;

      if (nextEmail !== existingUser.email) {
        const duplicateUser = await findUserByEmail(client, nextEmail);
        assert(!duplicateUser || duplicateUser.id === userId, "A user with this email already exists.");
      }

      await updateUserRepo(client, {
        id: userId,
        tenantId: existingUser.tenant_id,
        name: nextName,
        email: nextEmail,
        passwordHash: nextPasswordHash,
        role: nextRole,
        status: nextStatus,
        avatarUrl: nextAvatarUrl,
      });

      await this.auditService.record(client, {
        tenantId: existingUser.tenant_id,
        userId: actor.id,
        actionType: "user.update",
        entityType: "user",
        entityId: userId,
        description: `${actor.name} updated user ${nextEmail}`,
        metadata: {
          role: nextRole,
          status: nextStatus,
          passwordChanged: Boolean(nextPasswordHash),
        },
      });
    });

    return this.listUsers(actor);
  }

  async updateProfile(actor, input) {
    let updatedUser = null;

    await this.databaseManager.withTransaction(async (client) => {
      const existingUser = await findUserById(client, actor.id);
      assert(existingUser, "User not found.", 404);

      const nextName = input.name === undefined ? existingUser.name : normalizeName(input.name);
      const nextEmail = input.email === undefined ? existingUser.email : normalizeEmail(input.email);
      const nextAvatarUrl = input.avatarUrl === undefined ? existingUser.avatar_url : input.avatarUrl || null;
      assert(nextName, "Name is required.");
      assert(nextEmail, "Email is required.");

      let nextPasswordHash = null;
      if (input.password) {
        const newPassword = String(input.password);
        const passwordStrengthError = validatePasswordStrength(newPassword);
        assert(!passwordStrengthError, passwordStrengthError);
        const currentPassword = String(input.currentPassword || "");
        assert(currentPassword, "Current password is required to set a new password.");
        const valid = await verifyPassword(currentPassword, existingUser.password_hash);
        assert(valid, "Current password is incorrect.");
        nextPasswordHash = await hashPassword(newPassword);
      }

      if (nextEmail !== existingUser.email) {
        const duplicateUser = await findUserByEmail(client, nextEmail);
        assert(!duplicateUser || duplicateUser.id === actor.id, "A user with this email already exists.");
      }

      await updateUserRepo(client, {
        id: actor.id,
        tenantId: existingUser.tenant_id,
        name: nextName,
        email: nextEmail,
        passwordHash: nextPasswordHash,
        role: existingUser.role,
        status: existingUser.status,
        avatarUrl: nextAvatarUrl,
      });

      if (nextPasswordHash) {
        await setMustChangePassword(client, actor.id, false);
      }

      await this.auditService.record(client, {
        tenantId: existingUser.tenant_id,
        userId: actor.id,
        actionType: "user.profile_update",
        entityType: "user",
        entityId: actor.id,
        description: `${actor.name} updated their profile`,
        metadata: { passwordChanged: Boolean(nextPasswordHash) },
      });

      updatedUser = {
        id: actor.id,
        name: nextName,
        email: nextEmail,
        role: existingUser.role,
        status: existingUser.status,
        tenantId: existingUser.tenant_id || null,
        mustChangePassword: nextPasswordHash ? false : Boolean(existingUser.must_change_password),
        avatarUrl: nextAvatarUrl,
      };
    });

    return updatedUser;
  }

  async deleteUser(userId, actor, reason) {
    await this.databaseManager.withTransaction(async (client) => {
      const existingUser = await findUserById(client, userId);
      assert(existingUser, "User not found.", 404);

      if (actor.role !== USER_ROLES.SYSTEM_DEVELOPER) {
        assert(existingUser.tenant_id === actor.tenantId, "User not found.", 404);
      }

      assert(existingUser.id !== actor.id, "You cannot delete your own account.");
      assert(allowedRolesForActor(actor.role).includes(existingUser.role), "Forbidden.", 403);

      const result = await softDeleteUser(client, userId, existingUser.tenant_id, {
        deletedById: actor.id,
        deleteReason: reason,
      });
      assert(result.rowCount > 0, "User not found.", 404);
      await deleteAllSessionsForUser(client, userId);

      await this.auditService.record(client, {
        tenantId: existingUser.tenant_id,
        userId: actor.id,
        actionType: "user.delete",
        entityType: "user",
        entityId: userId,
        description: `${actor.name} moved user ${existingUser.email} to trash${reason ? ` (${reason})` : ""}`,
        metadata: { role: existingUser.role },
      });
    });

    return this.listUsers(actor);
  }

  async restoreUser(userId, actor) {
    await this.databaseManager.withTransaction(async (client) => {
      const existingUser = await findTrashedUserById(client, userId);
      assert(existingUser, "User not found in trash.", 404);

      if (actor.role !== USER_ROLES.SYSTEM_DEVELOPER) {
        assert(existingUser.tenant_id === actor.tenantId, "User not found in trash.", 404);
      }

      assert(allowedRolesForActor(actor.role).includes(existingUser.role), "Forbidden.", 403);

      const result = await restoreUserRepo(client, userId, existingUser.tenant_id);
      assert(result.rowCount > 0, "User not found in trash.", 404);

      await this.auditService.record(client, {
        tenantId: existingUser.tenant_id,
        userId: actor.id,
        actionType: "user.restore",
        entityType: "user",
        entityId: userId,
        description: `${actor.name} restored user ${existingUser.email} from trash`,
      });
    });

    return { ok: true };
  }

  async permanentlyDeleteUser(userId, actor) {
    await this.databaseManager.withTransaction(async (client) => {
      const existingUser = await findTrashedUserById(client, userId);
      assert(existingUser, "User not found in trash.", 404);

      if (actor.role !== USER_ROLES.SYSTEM_DEVELOPER) {
        assert(existingUser.tenant_id === actor.tenantId, "User not found in trash.", 404);
      }

      assert(allowedRolesForActor(actor.role).includes(existingUser.role), "Forbidden.", 403);

      const result = await permanentlyDeleteUserRepo(client, userId, existingUser.tenant_id);
      assert(result.rowCount > 0, "User not found in trash.", 404);

      await this.auditService.record(client, {
        tenantId: existingUser.tenant_id,
        userId: actor.id,
        actionType: "user.permanent_delete",
        entityType: "user",
        entityId: userId,
        description: `${actor.name} permanently deleted user ${existingUser.email}`,
      });
    });

    return { ok: true };
  }

  async listTrashedUsers(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const tenantId = actor.role === USER_ROLES.SYSTEM_DEVELOPER ? null : actor.tenantId;

    const client = await this.databaseManager.getPool().connect();
    try {
      const [items, total] = await Promise.all([
        listTrashedUsers(client, { tenantId, limit, offset }),
        countTrashedUsers(client, tenantId),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }

  async resetUserPassword(userId, actor) {
    let tempPassword = "";
    await this.databaseManager.withTransaction(async (client) => {
      const existingUser = await findUserById(client, userId);
      assert(existingUser, "User not found.", 404);

      if (actor.role !== USER_ROLES.SYSTEM_DEVELOPER) {
        assert(existingUser.tenant_id === actor.tenantId, "User not found.", 404);
      }

      assert(allowedRolesForActor(actor.role).includes(existingUser.role), "Forbidden.", 403);

      tempPassword = generateTempPassword();
      const passwordHash = await hashPassword(tempPassword);
      await updatePasswordHashAndClearFlags(client, userId, passwordHash);
      await setMustChangePassword(client, userId, true);
      await deleteAllSessionsForUser(client, userId);

      await this.auditService.record(client, {
        tenantId: existingUser.tenant_id,
        userId: actor.id,
        actionType: "user.password_reset_by_admin",
        entityType: "user",
        entityId: userId,
        description: `${actor.name} reset the password for ${existingUser.email}`,
        metadata: { email: existingUser.email },
      });
    });

    const users = await this.listUsers(actor);
    return { tempPassword, users };
  }

  async unlockUser(userId, actor) {
    await this.databaseManager.withTransaction(async (client) => {
      const existingUser = await findUserById(client, userId);
      assert(existingUser, "User not found.", 404);

      if (actor.role !== USER_ROLES.SYSTEM_DEVELOPER) {
        assert(existingUser.tenant_id === actor.tenantId, "User not found.", 404);
      }

      assert(allowedRolesForActor(actor.role).includes(existingUser.role), "Forbidden.", 403);

      await resetLoginLockState(client, userId);

      await this.auditService.record(client, {
        tenantId: existingUser.tenant_id,
        userId: actor.id,
        actionType: "user.unlock",
        entityType: "user",
        entityId: userId,
        description: `${actor.name} unlocked ${existingUser.email}`,
        metadata: { email: existingUser.email },
      });
    });

    return this.listUsers(actor);
  }

  async listPasswordResetRequests(actor) {
    const client = await this.databaseManager.getPool().connect();
    try {
      if (actor.role === USER_ROLES.SYSTEM_DEVELOPER) {
        return listPendingResetRequests(client, null);
      }
      return listPendingResetRequests(client, actor.tenantId);
    } finally {
      client.release();
    }
  }
}
