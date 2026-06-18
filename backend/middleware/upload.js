import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { backendRoot } from "../config/paths.js";
import { createId } from "../lib/ids.js";

export const uploadsDir = path.join(backendRoot, "uploads", "photos");
fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      callback(null, uploadsDir);
    },
    filename(req, file, callback) {
      const ext = path.extname(file.originalname || "").toLowerCase();
      callback(null, `${createId("photo")}${ext}`);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter(req, file, callback) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(new Error("Only JPEG, PNG, WEBP, or GIF images are allowed."));
      return;
    }
    callback(null, true);
  },
});

export function uploadPhotoMiddleware(req, res, next) {
  upload.single("photo")(req, res, (error) => {
    if (error) {
      error.status = 400;
      next(error);
      return;
    }
    next();
  });
}
