import { Router } from "express";
import { AuthController } from "../controllers/authController.js";
import { DsrFinanceController } from "../controllers/dsrFinanceController.js";
import { MonthEndSummaryController } from "../controllers/monthEndSummaryController.js";
import { ProfitController } from "../controllers/profitController.js";
import { BackupController } from "../controllers/backupController.js";
import { DsrController } from "../controllers/dsrController.js";
import { ActivityLogController } from "../controllers/activityLogController.js";
import { ExpenseController } from "../controllers/expenseController.js";
import { IssueController } from "../controllers/issueController.js";
import { ProductController } from "../controllers/productController.js";
import { StockMovementController } from "../controllers/stockMovementController.js";
import { DsrDueLedgerController } from "../controllers/dsrDueLedgerController.js";
import { UserController } from "../controllers/userController.js";
import { SettlementController } from "../controllers/settlementController.js";
import { TenantController } from "../controllers/tenantController.js";
import { OrgController } from "../controllers/orgController.js";
import { PermissionController } from "../controllers/permissionController.js";
import { SystemController } from "../controllers/systemController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireActiveTenant } from "../middleware/requireActiveTenant.js";
import { requirePlatformAdmin } from "../middleware/requirePlatformAdmin.js";
import { requirePermission, requireRoles } from "../middleware/requireRole.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { USER_ROLES } from "../lib/roles.js";

export function createApiRouter({
  authService,
  env,
  inventoryService,
  auditService,
  userService,
  expenseService,
  dsrFinanceService,
  monthEndSummaryService,
  profitService,
  backupService,
  stockMovementService,
  dsrDueLedgerService,
  databaseManager,
  tenantService,
  permissionService,
  systemService,
  errorLogService,
}) {
  const router = Router();
  const authController = new AuthController(authService, env, tenantService);
  const productController = new ProductController(inventoryService);
  const stockMovementController = new StockMovementController(stockMovementService);
  const dsrDueLedgerController = new DsrDueLedgerController(dsrDueLedgerService);
  const dsrController = new DsrController(inventoryService);
  const issueController = new IssueController(inventoryService);
  const settlementController = new SettlementController(inventoryService);
  const activityLogController = new ActivityLogController(auditService);
  const userController = new UserController(userService);
  const expenseController = new ExpenseController(expenseService);
  const dsrFinanceController = new DsrFinanceController(dsrFinanceService);
  const monthEndSummaryController = new MonthEndSummaryController(monthEndSummaryService);
  const profitController = new ProfitController(profitService);
  const backupController = new BackupController(backupService, databaseManager, auditService);
  const tenantController = new TenantController(tenantService);
  const orgController = new OrgController(tenantService);
  const permissionController = new PermissionController(permissionService);
  const systemController = new SystemController(systemService, errorLogService, env);

  router.post("/auth/login", authController.login);
  router.post("/auth/logout", authController.logout);

  router.use(requireAuth(authService, env));

  router.get("/auth/me", authController.me);
  router.patch("/profile", userController.updateProfile);

  // Platform admin routes — no tenant required, platform_admin only
  router.get("/platform/tenants", requirePlatformAdmin, tenantController.list);
  router.post("/platform/tenants", requirePlatformAdmin, tenantController.create);
  router.patch("/platform/tenants/:id", requirePlatformAdmin, tenantController.update);
  router.patch("/platform/tenants/:id/status", requirePlatformAdmin, tenantController.setStatus);
  router.get("/platform/tenants/:id/features", requirePlatformAdmin, tenantController.getFeatures);
  router.patch("/platform/tenants/:id/features", requirePlatformAdmin, tenantController.updateFeatures);

  // System developer routes — no tenant required, system_developer only
  router.get("/system/health", requireRoles(USER_ROLES.SYSTEM_DEVELOPER), systemController.health);
  router.get("/system/error-logs", requireRoles(USER_ROLES.SYSTEM_DEVELOPER), systemController.errorLogs);

  // All business routes require an active tenant subscription
  router.use(requireActiveTenant);

  router.patch("/org", requirePermission(PERMISSIONS.MANAGE_ORG), orgController.update);

  router.get(
    "/permissions",
    requireRoles(USER_ROLES.SYSTEM_DEVELOPER, USER_ROLES.SUPER_ADMIN),
    permissionController.list,
  );
  router.put(
    "/permissions/:role",
    requireRoles(USER_ROLES.SYSTEM_DEVELOPER, USER_ROLES.SUPER_ADMIN),
    permissionController.update,
  );

  router.get("/users", requirePermission(PERMISSIONS.MANAGE_USERS), userController.list);
  router.post("/users", requirePermission(PERMISSIONS.MANAGE_USERS), userController.create);
  router.patch("/users/:id", requirePermission(PERMISSIONS.MANAGE_USERS), userController.update);
  router.delete("/users/:id", requirePermission(PERMISSIONS.MANAGE_USERS), userController.remove);

  router.get("/activity-logs", requirePermission(PERMISSIONS.VIEW_ACTIVITY_LOGS), activityLogController.list);

  router.get("/expenses", requirePermission(PERMISSIONS.MANAGE_EXPENSES), expenseController.report);
  router.post("/expenses", requirePermission(PERMISSIONS.MANAGE_EXPENSES), expenseController.create);
  router.patch("/expenses/:id", requirePermission(PERMISSIONS.MANAGE_EXPENSES), expenseController.update);
  router.delete("/expenses/:id", requirePermission(PERMISSIONS.MANAGE_EXPENSES), expenseController.remove);

  router.get("/dsr-cash-receipts", requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.cashReport);
  router.post("/dsr-cash-receipts", requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.cashCreate);
  router.patch(
    "/dsr-cash-receipts/:id",
    requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE),
    dsrFinanceController.cashUpdate,
  );
  router.delete(
    "/dsr-cash-receipts/:id",
    requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE),
    dsrFinanceController.cashDelete,
  );

  router.get("/dsr-advances", requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.advanceReport);
  router.post("/dsr-advances", requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.advanceCreate);
  router.patch(
    "/dsr-advances/:id",
    requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE),
    dsrFinanceController.advanceUpdate,
  );
  router.delete(
    "/dsr-advances/:id",
    requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE),
    dsrFinanceController.advanceDelete,
  );

  router.get(
    "/month-end-summary",
    requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE),
    monthEndSummaryController.getSummary,
  );
  router.get("/profit-report", requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), profitController.report);
  router.get("/database-backup", requirePermission(PERMISSIONS.MANAGE_BACKUPS), backupController.download);
  router.get("/database-backup/history", requirePermission(PERMISSIONS.MANAGE_BACKUPS), backupController.history);

  router.get("/products/directory", requirePermission(PERMISSIONS.VIEW_STATE), productController.directory);
  router.get("/products", requirePermission(PERMISSIONS.VIEW_STATE), productController.list);
  router.post("/products", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.create);
  router.put("/products/:id", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.update);
  router.delete("/products/:id", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.remove);
  router.post("/products/:id/stock", requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.addStock);
  router.get("/stock-movements", requirePermission(PERMISSIONS.VIEW_STATE), stockMovementController.list);

  router.get("/dsr-due-ledger", requirePermission(PERMISSIONS.VIEW_STATE), dsrDueLedgerController.list);
  router.get("/dsr-due-ledger/statement", requirePermission(PERMISSIONS.VIEW_STATE), dsrDueLedgerController.statement);
  router.get("/dsr-due-ledger/balance", requirePermission(PERMISSIONS.VIEW_STATE), dsrDueLedgerController.balance);

  router.get("/dsrs/directory", requirePermission(PERMISSIONS.VIEW_STATE), dsrController.directory);
  router.get("/dsrs", requirePermission(PERMISSIONS.VIEW_STATE), dsrController.list);
  router.post("/dsrs", requirePermission(PERMISSIONS.MANAGE_DSRS), dsrController.create);
  router.put("/dsrs/:id", requirePermission(PERMISSIONS.MANAGE_DSRS), dsrController.update);
  router.delete("/dsrs/:id", requirePermission(PERMISSIONS.MANAGE_DSRS), dsrController.remove);

  router.get("/issues", requirePermission(PERMISSIONS.VIEW_STATE), issueController.list);
  router.post("/issues", requirePermission(PERMISSIONS.CREATE_ISSUES), issueController.create);
  router.put("/issues/:id", requirePermission(PERMISSIONS.UPDATE_ISSUES), issueController.update);

  router.get("/settlements", requirePermission(PERMISSIONS.VIEW_STATE), settlementController.list);
  router.post("/settlements", requirePermission(PERMISSIONS.CREATE_SETTLEMENTS), settlementController.create);
  router.put("/settlements/:id", requirePermission(PERMISSIONS.UPDATE_SETTLEMENTS), settlementController.update);

  return router;
}
