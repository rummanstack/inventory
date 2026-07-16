import fs from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { uploadsDir } from "../middleware/upload.js";
import { createId } from "../lib/ids.js";

const EXTENSIONS_BY_MIME_TYPE = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function safePathPart(value, fallback) {
  const cleaned = String(value || "").trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || fallback;
}

function normalizePrefix(value) {
  return String(value || "photos").split("/").map((part) => safePathPart(part, "")).filter(Boolean).join("/") || "photos";
}

function encodeObjectKey(key) {
  return key.split("/").map(encodeURIComponent).join("/");
}

export class PhotoStorageService {
  constructor(env, { s3Client } = {}) {
    this.driver = env.PHOTO_STORAGE_DRIVER || "local";
    this.bucket = env.AWS_S3_BUCKET || "";
    this.prefix = normalizePrefix(env.AWS_S3_PHOTO_PREFIX);
    this.publicBaseUrl = String(env.AWS_S3_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
    this.s3Client = s3Client || (this.driver === "s3" ? new S3Client({ region: env.AWS_REGION }) : null);
  }

  async storePhoto(file, { tenantId } = {}) {
    if (!file?.buffer) {
      const error = new Error("No file uploaded.");
      error.status = 400;
      throw error;
    }

    const extension = EXTENSIONS_BY_MIME_TYPE[file.mimetype];
    if (!extension) {
      const error = new Error("Unsupported image type.");
      error.status = 400;
      throw error;
    }

    const storedName = `${createId("photo")}${extension}`;
    if (this.driver === "s3") {
      const tenantPart = safePathPart(tenantId, "platform");
      const key = `${this.prefix}/${tenantPart}/${storedName}`;
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: "public, max-age=31536000, immutable",
        ServerSideEncryption: "AES256",
      }));
      return { key, storedName, url: `${this.publicBaseUrl}/${encodeObjectKey(key)}` };
    }

    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(path.join(uploadsDir, storedName), file.buffer, { flag: "wx" });
    return {
      key: `uploads/photos/${storedName}`,
      storedName,
      url: `/uploads/photos/${storedName}`,
    };
  }
}
