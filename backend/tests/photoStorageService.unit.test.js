import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { PhotoStorageService } from "../services/photoStorageService.js";
import { uploadsDir } from "../middleware/upload.js";

const pngFile = { buffer: Buffer.from("test-image"), mimetype: "image/png" };

test("S3 photo storage uploads to a tenant-scoped key and returns the public URL", async () => {
  let commandInput;
  const service = new PhotoStorageService({
    PHOTO_STORAGE_DRIVER: "s3",
    AWS_REGION: "ap-south-1",
    AWS_S3_BUCKET: "inventory-photos",
    AWS_S3_PHOTO_PREFIX: "photos",
    AWS_S3_PUBLIC_BASE_URL: "https://media.example.com",
  }, {
    s3Client: { send: async (command) => { commandInput = command.input; } },
  });

  const result = await service.storePhoto(pngFile, { tenantId: "tenant-123" });
  assert.equal(commandInput.Bucket, "inventory-photos");
  assert.match(commandInput.Key, /^photos\/tenant-123\/photo-[0-9a-f-]+\.png$/);
  assert.equal(commandInput.ContentType, "image/png");
  assert.equal(commandInput.ServerSideEncryption, "AES256");
  assert.equal(result.url, `https://media.example.com/${commandInput.Key}`);
});

test("local photo storage preserves the existing relative URL contract", async () => {
  const service = new PhotoStorageService({ PHOTO_STORAGE_DRIVER: "local" });
  const result = await service.storePhoto(pngFile, { tenantId: "tenant-123" });
  try {
    assert.match(result.url, /^\/uploads\/photos\/photo-[0-9a-f-]+\.png$/);
    assert.equal(await fs.readFile(path.join(uploadsDir, result.storedName), "utf8"), "test-image");
  } finally {
    await fs.rm(path.join(uploadsDir, result.storedName), { force: true });
  }
});
