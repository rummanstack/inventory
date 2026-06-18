import { createBackendApp } from "../../composition.js";

let cached = null;

export async function getTestApp() {
  if (!cached) {
    cached = await createBackendApp();
  }
  return cached;
}

export async function closeTestApp() {
  if (!cached) {
    return;
  }
  await cached.databaseManager.getPool().end();
  cached = null;
}
