import { createSchema } from "../db/schema.js";
import { createId } from "../lib/ids.js";
import { hashPassword } from "../lib/passwords.js";
import { loadPermissionCache } from "../lib/permissionCache.js";
import { USER_ROLES } from "../lib/roles.js";
import { countUsers, findUserByRole, insertUser } from "../repositories/userRepository.js";
import { countTenants, insertTenant, listTenants } from "../repositories/tenantRepository.js";

const FIRST_TENANT_TABLES = [
  "products",
  "dsrs",
  "issues",
  "settlements",
  "expenses",
  "dsr_cash_receipts",
  "dsr_advances",
  "activity_logs",
];

async function ensureFirstTenant(pool, env) {
  const tenantCount = await countTenants(pool);
  if (tenantCount > 0) {
    const tenants = await listTenants(pool);
    return { tenant: tenants[0], isNew: false };
  }

  const tenantName = env.DEFAULT_TENANT_NAME || "Arinda Enterprise";
  const tenantSlug = env.DEFAULT_TENANT_SLUG || "arinda";

  const tenant = await insertTenant(pool, {
    id: createId("tenant"),
    name: tenantName,
    slug: tenantSlug,
    email: env.DEFAULT_SUPER_ADMIN_EMAIL,
    plan: "starter",
    status: "active",
  });

  return { tenant, isNew: true };
}

async function backfillTenantId(pool, tenantId) {
  for (const table of FIRST_TENANT_TABLES) {
    await pool.query(`UPDATE ${table} SET tenant_id = $1 WHERE tenant_id IS NULL`, [tenantId]);
  }

  await pool.query(
    `UPDATE users SET tenant_id = $1 WHERE tenant_id IS NULL AND role != 'system_developer'`,
    [tenantId],
  );
}

async function seedSuperAdminIfEmpty(pool, env, tenantId) {
  const userCount = await countUsers(pool);
  if (userCount > 0) {
    return;
  }

  await insertUser(pool, {
    id: createId("user"),
    name: env.DEFAULT_SUPER_ADMIN_NAME,
    email: env.DEFAULT_SUPER_ADMIN_EMAIL,
    passwordHash: await hashPassword(env.DEFAULT_SUPER_ADMIN_PASSWORD),
    role: USER_ROLES.SUPER_ADMIN,
    status: "active",
    tenantId,
  });
}

async function seedSystemDeveloperIfEmpty(pool, env) {
  const existing = await findUserByRole(pool, USER_ROLES.SYSTEM_DEVELOPER);
  if (existing) {
    return;
  }

  await insertUser(pool, {
    id: createId("user"),
    name: env.DEFAULT_SYSTEM_DEVELOPER_NAME,
    email: env.DEFAULT_SYSTEM_DEVELOPER_EMAIL,
    passwordHash: await hashPassword(env.DEFAULT_SYSTEM_DEVELOPER_PASSWORD),
    role: USER_ROLES.SYSTEM_DEVELOPER,
    status: "active",
    tenantId: null,
  });
}

export async function initializeDatabase(databaseManager, env) {
  while (true) {
    const pool = databaseManager.getPool();
    const client = await pool.connect();
    let shouldRelease = true;

    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_lock($1)", [824928173]);

      await createSchema(client);

      const { tenant: firstTenant, isNew: isFirstRun } = await ensureFirstTenant(client, env);
      if (isFirstRun) {
        await backfillTenantId(client, firstTenant.id);
      }
      await seedSuperAdminIfEmpty(client, env, firstTenant.id);
      await seedSystemDeveloperIfEmpty(client, env);

      await client.query("SELECT pg_advisory_unlock($1)", [824928173]);
      await client.query("COMMIT");
      break;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {}

      if (error.code === "3D000" && pool === databaseManager.getPool()) {
        shouldRelease = false;
        client.release();
        await databaseManager.switchToFallbackDatabase();
        continue;
      }

      throw error;
    } finally {
      if (shouldRelease) {
        client.release();
      }
    }
  }

  await loadPermissionCache(databaseManager.getPool());
}
