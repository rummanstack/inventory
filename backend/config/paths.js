import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const backendRoot = path.resolve(__dirname, "..");
// Root for locally written files (uploads, documents). On Lambda the app
// directory is read-only — set FILE_STORAGE_ROOT=/tmp there.
export const fileStorageRoot = process.env.FILE_STORAGE_ROOT || backendRoot;
export const projectRoot = path.resolve(backendRoot, "..");
export const envPath = path.join(projectRoot, ".env");
export const frontendDistPath = path.join(projectRoot, "frontend", "dist");
export const backendDistPath = path.join(backendRoot, "public", "dist");
