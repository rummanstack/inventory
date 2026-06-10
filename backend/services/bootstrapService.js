import { createSchema } from "../db/schema.js";
import { createId } from "../lib/ids.js";
import { hashPassword } from "../lib/passwords.js";
import { loadPermissionCache } from "../lib/permissionCache.js";
import { USER_ROLES } from "../lib/roles.js";
import { countUsers, findUserByRole, insertUser } from "../repositories/userRepository.js";
import { countTenants, insertTenant, listTenants } from "../repositories/tenantRepository.js";

const FIRST_TENANT_TABLES = [
  "users",
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
    return tenants[0];
  }

  const tenantName = env.DEFAULT_TENANT_NAME || "Arinda Enterprise";
  const tenantSlug = env.DEFAULT_TENANT_SLUG || "arinda";

  return await insertTenant(pool, {
    id: createId("tenant"),
    name: tenantName,
    slug: tenantSlug,
    email: env.DEFAULT_SUPER_ADMIN_EMAIL,
    plan: "starter",
    status: "active",
  });
}

async function backfillTenantId(pool, tenantId) {
  for (const table of FIRST_TENANT_TABLES) {
    await pool.query(`UPDATE ${table} SET tenant_id = $1 WHERE tenant_id IS NULL`, [tenantId]);
  }
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
  try {
    await createSchema(databaseManager.getPool());
  } catch (error) {
    if (error.code !== "3D000") {
      throw error;
    }

    await databaseManager.switchToFallbackDatabase();
    await createSchema(databaseManager.getPool());
  }

  const pool = databaseManager.getPool();

  const firstTenant = await ensureFirstTenant(pool, env);
  await backfillTenantId(pool, firstTenant.id);
  await seedSuperAdminIfEmpty(pool, env, firstTenant.id);
  await seedSystemDeveloperIfEmpty(pool, env);
  await loadPermissionCache(pool);
}
