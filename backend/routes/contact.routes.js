import { Router } from "express";

export function createContactRoutes(contactMessageController, { contactRateLimiter } = {}) {
  const router = Router();

  router.post("/", contactRateLimiter, contactMessageController.submit);

  return router;
}
