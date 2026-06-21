import { Router } from "express";
import { requirePlatformAdmin } from "../middleware/requirePlatformAdmin.js";

export function createVisitorChatAdminRoutes(visitorChatAdminController) {
  const router = Router();

  router.get("/unread-count", requirePlatformAdmin, visitorChatAdminController.countUnread);
  router.get("/", requirePlatformAdmin, visitorChatAdminController.listChats);
  router.get("/:id", requirePlatformAdmin, visitorChatAdminController.getChat);
  router.get("/:id/messages", requirePlatformAdmin, visitorChatAdminController.listMessages);
  router.post("/:id/messages", requirePlatformAdmin, visitorChatAdminController.postReply);
  router.post("/:id/read", requirePlatformAdmin, visitorChatAdminController.markRead);
  router.post("/:id/close", requirePlatformAdmin, visitorChatAdminController.closeChat);

  return router;
}
