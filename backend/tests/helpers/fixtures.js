import request from "supertest";
import { createId } from "../../lib/ids.js";
import { hashPassword } from "../../lib/passwords.js";
import { TENANT_BUSINESS_PERMISSIONS } from "../../lib/permissions.js";
import { setCachedPermissions } from "../../lib/permissionCache.js";
import { USER_ROLES } from "../../lib/roles.js";
import { replaceRolePermissions } from "../../repositories/rolePermissionRepository.js";
import { insertTenant } from "../../repositories/tenantRepository.js";
import { insertUser } from "../../repositories/userRepository.js";

export const TEST_PASSWORD = "Test@12345";

// Disposable tenant + admin user, created directly against the real dev DB and torn
// down by cleanupTenant(). Safe because every business route is tenant-scoped (see
// requireActiveTenant) — a throwaway tenant can never see or affect real tenant data.
export async function createTenantAndAdmin(databaseManager, app, { name = "Test Tenant", role = USER_ROLES.SUPER_ADMIN } = {}) {
  const tenantId = createId("tenant");
  const suffix = tenantId.slice(-12);
  const slug = `test-${suffix}`;
  const email = `admin-${suffix}@test.local`;

  await databaseManager.withTransaction(async (client) => {
    await insertTenant(client, {
      id: tenantId,
      name,
      slug,
      email,
      plan: "starter",
      status: "active",
    });

    await insertUser(client, {
      id: createId("user"),
      name: "Test Admin",
      email,
      passwordHash: await hashPassword(TEST_PASSWORD),
      role,
      status: "active",
      tenantId,
    });

    // Roles have no hardcoded permission defaults (they're configured per
    // tenant via the Permissions page), so a fresh fixture tenant would 403
    // on everything without seeding its role_permissions rows here.
    await replaceRolePermissions(client, role, tenantId, TENANT_BUSINESS_PERMISSIONS);
  });

  // The app loads its permission cache once at boot; prime the entry for this
  // new tenant the same way permissionService.updateRolePermissions does.
  setCachedPermissions(role, tenantId, TENANT_BUSINESS_PERMISSIONS);

  const agent = request.agent(app);
  const loginResponse = await agent.post("/api/auth/login").send({ email, password: TEST_PASSWORD });
  if (loginResponse.status !== 200) {
    throw new Error(`Fixture login failed (${loginResponse.status}): ${JSON.stringify(loginResponse.body)}`);
  }

  return { tenantId, email, agent };
}

// Deletes every row scoped to tenantId across every table that has a tenant_id
// column, then the tenant row itself. Tables are retried in passes so we never have
// to hand-maintain a foreign-key ordering — a table that's still blocked by another
// tenant-scoped table (e.g. finance_account_transactions before finance_accounts)
// just succeeds on a later pass once its blocker is cleared.
export async function cleanupTenant(databaseManager, tenantId) {
  await databaseManager.withClient(async (client) => {
    const { rows } = await client.query(
      `SELECT table_name FROM information_schema.columns
       WHERE table_schema = 'public' AND column_name = 'tenant_id'`,
    );

    let remaining = rows.map((row) => row.table_name);
    let lastError = null;

    while (remaining.length > 0) {
      const blocked = [];
      for (const table of remaining) {
        try {
          await client.query(`DELETE FROM "${table}" WHERE tenant_id = $1`, [tenantId]);
        } catch (error) {
          if (error.code === "23503") {
            blocked.push(table);
            lastError = error;
            continue;
          }
          throw error;
        }
      }
      if (blocked.length === remaining.length) {
        throw lastError;
      }
      remaining = blocked;
    }

    await client.query("DELETE FROM tenants WHERE id = $1", [tenantId]);
  });
}
