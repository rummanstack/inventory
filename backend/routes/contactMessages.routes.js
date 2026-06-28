import { Router } from "express";
import { requirePlatformAdmin } from "../middleware/requirePlatformAdmin.js";

export function createContactMessagesRoutes(contactMessageController) {
  const router = Router();

  router.get("/", requirePlatformAdmin, contactMessageController.list);

  return router;
}
