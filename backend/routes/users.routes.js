import { Router } from "express";
import { requirePermission } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createUsersRoutes(userController) {
  const router = Router();

  router.get("/", requirePermission(PERMISSIONS.MANAGE_USERS), userController.list);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_USERS), userController.create);
  router.get("/password-reset-requests", requirePermission(PERMISSIONS.MANAGE_USERS), userController.listPasswordResetRequests);
  router.get("/trash", requirePermission(PERMISSIONS.MANAGE_USERS), userController.listTrash);
  router.patch("/:id", requirePermission(PERMISSIONS.MANAGE_USERS), userController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_USERS), userController.remove);
  router.post("/:id/reset-password", requirePermission(PERMISSIONS.MANAGE_USERS), userController.resetPassword);
  router.post("/:id/unlock", requirePermission(PERMISSIONS.MANAGE_USERS), userController.unlock);
  router.post("/:id/restore", requirePermission(PERMISSIONS.MANAGE_USERS), userController.restore);
  router.delete("/:id/permanent", requirePermission(PERMISSIONS.PERMANENT_DELETE), userController.permanentlyDelete);

  return router;
}
