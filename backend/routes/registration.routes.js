import { Router } from "express";
import { requirePlatformAdmin } from "../middleware/requirePlatformAdmin.js";

// Public self-service signup — mounted before requireAuth.
export function createPublicRegistrationRoutes(registrationController, { registerRateLimiter } = {}) {
  const router = Router();

  router.post("/", registerRateLimiter, registrationController.register);

  return router;
}

// Platform admin review queue for pending registrations.
export function createPlatformRegistrationsRoutes(registrationController) {
  const router = Router();

  router.get("/", requirePlatformAdmin, registrationController.list);
  router.post("/:id/approve", requirePlatformAdmin, registrationController.approve);
  router.post("/:id/reject", requirePlatformAdmin, registrationController.reject);

  return router;
}
