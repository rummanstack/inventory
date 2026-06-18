import { Router } from "express";
import { uploadPhotoMiddleware } from "../middleware/upload.js";

export function createUploadsRoutes(uploadController) {
  const router = Router();

  router.post("/photo", uploadPhotoMiddleware, uploadController.uploadPhoto);

  return router;
}
