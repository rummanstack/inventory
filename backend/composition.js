import dotenv from "dotenv";
import { backendRoot } from "./config/paths.js";
import { DatabaseManager } from "./db/pool.js";
import { initializeDatabase } from "./services/bootstrapService.js";
import { createControllerRegistry } from "./composition/createControllerRegistry.js";
import { createServiceRegistry } from "./composition/createServiceRegistry.js";
import { createApp } from "./app.js";

dotenv.config({ path: `${backendRoot}/.env` });

export async function createBackendApp() {
  const { env } = await import("./config/env.js");
  const databaseManager = new DatabaseManager(env.DATABASE_URL);
  if (process.env.SKIP_DATABASE_INIT !== "1") {
    await initializeDatabase(databaseManager, env);
  }

  const services = createServiceRegistry({ databaseManager, env });
  const controllers = createControllerRegistry({ services, env, databaseManager });

  const app = createApp({
    controllers,
    authService: services.operations.authService,
    env,
    auditService: services.platform.auditService,
    errorLogService: services.platform.errorLogService,
  });

  return { app, databaseManager, env };
}
