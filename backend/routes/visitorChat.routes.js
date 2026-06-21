import { Router } from "express";

export function createVisitorChatRoutes(visitorChatController, { visitorChatRateLimiter } = {}) {
  const router = Router();

  router.post("/messages", visitorChatRateLimiter, visitorChatController.postMessage);
  router.get("/messages", visitorChatController.listMessages);

  return router;
}
