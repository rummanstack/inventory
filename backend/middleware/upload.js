import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { backendRoot } from "../config/paths.js";
import { createId } from "../lib/ids.js";

export const uploadsDir = path.join(backendRoot, "uploads", "photos");
export const employeeDocumentsDir = path.join(backendRoot, "private_uploads", "employee-documents");
export const voucherDocumentsDir = path.join(backendRoot, "private_uploads", "voucher-documents");
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(employeeDocumentsDir, { recursive: true });
fs.mkdirSync(voucherDocumentsDir, { recursive: true });

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const upload = multer({
  storage: multer.memoryStorage(),
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


const employeeDocumentUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      const tenantId = req.currentUser?.tenantId || "unknown";
      const tenantDir = path.join(employeeDocumentsDir, tenantId);
      fs.mkdirSync(tenantDir, { recursive: true });
      callback(null, tenantDir);
    },
    filename(req, file, callback) {
      const ext = path.extname(file.originalname || "").toLowerCase();
      callback(null, `${createId("empdoc")}${ext}`);
    },
  }),
  limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES },
  fileFilter(req, file, callback) {
    if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.mimetype)) {
      callback(new Error("Only PDF, DOC, DOCX, JPEG, PNG, or WEBP documents are allowed."));
      return;
    }
    callback(null, true);
  },
});

export function uploadEmployeeDocumentMiddleware(req, res, next) {
  employeeDocumentUpload.single("document")(req, res, (error) => {
    if (error) {
      error.status = 400;
      next(error);
      return;
    }
    next();
  });
}

const voucherDocumentUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      const tenantId = req.currentUser?.tenantId || "unknown";
      const tenantDir = path.join(voucherDocumentsDir, tenantId);
      fs.mkdirSync(tenantDir, { recursive: true });
      callback(null, tenantDir);
    },
    filename(req, file, callback) {
      const ext = path.extname(file.originalname || "").toLowerCase();
      callback(null, `${createId("vdoc")}${ext}`);
    },
  }),
  limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES },
  fileFilter(req, file, callback) {
    if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.mimetype)) {
      callback(new Error("Only PDF, DOC, DOCX, JPEG, PNG, or WEBP documents are allowed."));
      return;
    }
    callback(null, true);
  },
});

export function uploadVoucherDocumentMiddleware(req, res, next) {
  voucherDocumentUpload.single("document")(req, res, (error) => {
    if (error) {
      error.status = 400;
      next(error);
      return;
    }
    next();
  });
}
