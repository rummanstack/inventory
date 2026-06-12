import { Router } from "express";
import { requireRoles } from "../middleware/requireRole.js";
import { USER_ROLES } from "../lib/roles.js";

export function createPermissionsRoutes(permissionController) {
  const router = Router();

  router.get("/", requireRoles(USER_ROLES.SYSTEM_DEVELOPER, USER_ROLES.SUPER_ADMIN), permissionController.list);
  router.put("/:role", requireRoles(USER_ROLES.SYSTEM_DEVELOPER, USER_ROLES.SUPER_ADMIN), permissionController.update);

  return router;
}
