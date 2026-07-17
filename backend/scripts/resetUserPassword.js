// Break-glass password reset: bypasses the token/email flow entirely and
// writes a new password hash directly. This is the only recovery path for
// the system_developer account (or a tenant's last remaining admin) — the
// normal forgot-password flow requires an already-logged-in manage_users
// admin to retrieve the token from the Security page, which doesn't help
// if that admin is the one locked out. Requires direct database/server
// access, same as the rest of the scripts in this directory.
//
//   node scripts/resetUserPassword.js <email> <newPassword>
//
// Hashes with the app's real bcrypt path, clears any must-change-password
// flag, and revokes all existing sessions for that user (same security
// behavior as a normal reset).
import dotenv from "dotenv";
import { envPath } from "../config/paths.js";
import { DatabaseManager } from "../db/pool.js";
import { hashPassword, validatePasswordStrength } from "../lib/passwords.js";
import { findUserByEmail, updatePasswordHashAndClearFlags, deleteAllSessionsForUser } from "../repositories/userRepository.js";

dotenv.config({ path: envPath });

async function main() {
  const [, , emailArg, passwordArg] = process.argv;
  if (!emailArg || !passwordArg) {
    console.error("Usage: node scripts/resetUserPassword.js <email> <newPassword>");
    process.exit(1);
  }

  const strengthError = validatePasswordStrength(passwordArg);
  if (strengthError) {
    console.error(strengthError);
    process.exit(1);
  }

  const { env } = await import("../config/env.js");
  const databaseManager = new DatabaseManager(env.DATABASE_URL);

  await databaseManager.withTransaction(async (client) => {
    const email = emailArg.trim().toLowerCase();
    const userRow = await findUserByEmail(client, email);

    if (!userRow) {
      console.error(`No user found with email ${email}.`);
      process.exitCode = 1;
      return;
    }

    const passwordHash = await hashPassword(passwordArg);
    await updatePasswordHashAndClearFlags(client, userRow.id, passwordHash);
    await deleteAllSessionsForUser(client, userRow.id);

    console.log(`Password reset for ${userRow.name} <${userRow.email}> (role: ${userRow.role}, tenant: ${userRow.tenant_id || "none — platform user"}).`);
    console.log("All existing sessions for this user have been revoked.");
  });

  await databaseManager.getPool().end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
