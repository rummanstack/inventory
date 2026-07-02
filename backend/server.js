import { createBackendApp } from "./composition.js";

async function start() {
  const { app, databaseManager, env } = await createBackendApp();

  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
    console.log(`Database: ${process.env.npm_lifecycle_event === "dev" && process.env.DEV_DATABASE_URL ? "DEV_DATABASE_URL (test)" : "DATABASE_URL (live)"}`);
    if (databaseManager.isUsingFallbackDatabase()) {
      console.log('DATABASE_URL database name was unavailable, using "postgres" instead.');
    }
  });
}

start().catch((error) => {
  console.error("Failed to start server");
  console.error(error);
  process.exit(1);
});
