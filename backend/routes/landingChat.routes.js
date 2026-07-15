import { Router } from "express";

export function createLandingChatRoutes(landingChatController, { landingChatRateLimiter } = {}) {
  const router = Router();

  router.get("/status", landingChatController.status);
  router.post("/chat", landingChatRateLimiter, landingChatController.chat);

  return router;
}
