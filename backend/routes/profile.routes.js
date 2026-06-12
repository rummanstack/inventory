import { Router } from "express";

export function createProfileRoutes(userController) {
  const router = Router();

  router.patch("/", userController.updateProfile);

  return router;
}
