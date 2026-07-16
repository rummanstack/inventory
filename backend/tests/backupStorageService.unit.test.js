import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { BackupStorageService } from "../services/backupStorageService.js";

test("S3 backup storage writes a private tenant-scoped backup object", async () => {
  const tempPath = path.join(os.tmpdir(), `backup-storage-${Date.now()}.sql`);
  await fs.writeFile(tempPath, "SELECT 1;\n", "utf8");
  let commandInput;

  try {
    const service = new BackupStorageService({
      BACKUP_STORAGE_DRIVER: "s3",
      AWS_REGION: "ap-south-1",
      AWS_S3_BACKUP_BUCKET: "private-backups",
      AWS_S3_BACKUP_PREFIX: "database-backups",
    }, {
      s3Client: { send: async (command) => { commandInput = command.input; } },
    });

    const stored = await service.storeBackupFile({
      filename: "arinda-database-backup.sql",
      tempPath,
    }, {
      tenantId: "tenant-123",
      scope: "tenant",
      format: "sql",
    });

    assert.equal(commandInput.Bucket, "private-backups");
    assert.equal(commandInput.Key, "database-backups/tenants/tenant-123/arinda-database-backup.sql");
    assert.equal(commandInput.ServerSideEncryption, "AES256");
    assert.equal(commandInput.CacheControl, "no-store");
    assert.equal(commandInput.ContentLength, 10);
    assert.deepEqual(stored, {
      bucket: "private-backups",
      key: commandInput.Key,
      driver: "s3",
    });
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
});

test("local backup storage leaves the existing download-only flow unchanged", async () => {
  const service = new BackupStorageService({ BACKUP_STORAGE_DRIVER: "local" });
  assert.equal(await service.storeBackupFile({ filename: "backup.sql", tempPath: "unused" }), null);
});
