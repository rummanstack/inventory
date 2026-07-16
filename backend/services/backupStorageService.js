import path from "node:path";
import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function safePathPart(value, fallback) {
  const cleaned = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || fallback;
}

function normalizePrefix(value) {
  return String(value || "database-backups")
    .split("/")
    .map((part) => safePathPart(part, ""))
    .filter(Boolean)
    .join("/") || "database-backups";
}

export class BackupStorageService {
  constructor(env, { s3Client } = {}) {
    this.driver = env.BACKUP_STORAGE_DRIVER || "local";
    this.bucket = env.AWS_S3_BACKUP_BUCKET || env.AWS_S3_BUCKET || "";
    this.prefix = normalizePrefix(env.AWS_S3_BACKUP_PREFIX);
    this.s3Client = s3Client || (this.driver === "s3" ? new S3Client({ region: env.AWS_REGION }) : null);
  }

  async storeBackupFile(backupFile, { tenantId = null, scope = "tenant", format = "sql" } = {}) {
    if (this.driver !== "s3") {
      return null;
    }

    const filename = path.basename(backupFile.filename);
    const scopePath = scope === "platform"
      ? "platform"
      : `tenants/${safePathPart(tenantId, "unknown")}`;
    const key = `${this.prefix}/${scopePath}/${filename}`;
    const { size } = await fs.stat(backupFile.tempPath);

    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: createReadStream(backupFile.tempPath),
      ContentLength: size,
      ContentType: format === "json" ? "application/json" : "application/sql",
      ContentDisposition: `attachment; filename="${filename}"`,
      CacheControl: "no-store",
      ServerSideEncryption: "AES256",
      Metadata: {
        backupscope: scope,
        tenant: tenantId ? safePathPart(tenantId, "unknown") : "platform",
      },
    }));

    return { bucket: this.bucket, key, driver: "s3" };
  }
}
