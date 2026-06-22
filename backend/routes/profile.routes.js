import { Router } from "express";
import { requireFeature } from "../middleware/requireFeature.js";

export function createProfileRoutes(userController) {
  const router = Router();
  router.use(requireFeature("my-profile"));

  router.patch("/", userController.updateProfile);

  return router;
}
