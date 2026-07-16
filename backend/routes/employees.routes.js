import { Router } from "express";
import { requireAnyPermission, requirePermission } from "../middleware/requireRole.js";
import { requireFeature } from "../middleware/requireFeature.js";
import { uploadEmployeeDocumentMiddleware } from "../middleware/upload.js";
import { PERMISSIONS } from "../lib/permissions.js";

export function createEmployeesRoutes(employeeController) {
  const router = Router();

  router.get(
    "/active",
    requireFeature(["employees", "hr-reports"]),
    requireAnyPermission(PERMISSIONS.VIEW_EMPLOYEES, PERMISSIONS.HR_REPORTS),
    employeeController.listActive,
  );
  router.get(
    "/",
    requireFeature(["employees", "hr-reports"]),
    requireAnyPermission(PERMISSIONS.VIEW_EMPLOYEES, PERMISSIONS.HR_REPORTS),
    employeeController.list,
  );

  router.use(requireFeature("employees"));
  router.get("/:id", requirePermission(PERMISSIONS.VIEW_EMPLOYEES), employeeController.get);
  router.post("/", requirePermission(PERMISSIONS.MANAGE_EMPLOYEES), employeeController.create);
  router.put("/:id", requirePermission(PERMISSIONS.MANAGE_EMPLOYEES), employeeController.update);
  router.delete("/:id", requirePermission(PERMISSIONS.MANAGE_EMPLOYEES), employeeController.remove);
  router.post("/:id/restore", requirePermission(PERMISSIONS.MANAGE_EMPLOYEES), employeeController.restore);
  router.get("/:id/documents", requirePermission(PERMISSIONS.VIEW_EMPLOYEES), employeeController.listDocuments);
  router.post("/:id/documents", requirePermission(PERMISSIONS.MANAGE_EMPLOYEES), uploadEmployeeDocumentMiddleware, employeeController.uploadDocument);
  router.get("/:id/documents/:documentId/download", requirePermission(PERMISSIONS.VIEW_EMPLOYEES), employeeController.downloadDocument);
  router.delete("/:id/documents/:documentId", requirePermission(PERMISSIONS.MANAGE_EMPLOYEES), employeeController.deleteDocument);

  return router;
}
