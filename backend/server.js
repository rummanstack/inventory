import dotenv from 'dotenv';
import { createApp } from './app.js';
import { backendRoot } from './config/paths.js';
import { DatabaseManager } from './db/pool.js';
import { initializeDatabase } from './services/bootstrapService.js';
import { AuditService } from './services/auditService.js';
import { AuthService } from './services/authService.js';
import { DsrFinanceService } from './services/dsrFinanceService.js';
import { MonthEndSummaryService } from './services/monthEndSummaryService.js';
import { ExpenseService } from './services/expenseService.js';
import { ProfitService } from './services/profitService.js';
import { InventoryService } from './services/inventoryService.js';
import { UserService } from './services/userService.js';
import { BackupService } from './services/backupService.js';
import { TenantService } from './services/tenantService.js';
import { PermissionService } from './services/permissionService.js';

dotenv.config({ path: `${backendRoot}/.env` });

async function start() {
  const { env } = await import('./config/env.js');
  const databaseManager = new DatabaseManager(env.DATABASE_URL);
  await initializeDatabase(databaseManager, env);

  const auditService = new AuditService(databaseManager);
  const authService = new AuthService(databaseManager, { sessionDays: env.SESSION_DAYS, auditService });
  const inventoryService = new InventoryService(databaseManager, { auditService });
  const userService = new UserService(databaseManager, { auditService });
  const expenseService = new ExpenseService(databaseManager, { auditService });
  const dsrFinanceService = new DsrFinanceService(databaseManager, { auditService });
  const monthEndSummaryService = new MonthEndSummaryService(databaseManager);
  const profitService = new ProfitService(databaseManager);
  const backupService = new BackupService(databaseManager, { auditService });
  const tenantService = new TenantService(databaseManager);
  const permissionService = new PermissionService(databaseManager, { auditService });
  const app = createApp({ authService, env, inventoryService, auditService, userService, expenseService, dsrFinanceService, monthEndSummaryService, profitService, backupService, databaseManager, tenantService, permissionService });

  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
    if (databaseManager.isUsingFallbackDatabase()) {
      console.log('DATABASE_URL database name was unavailable, using "postgres" instead.');
    }
  });
}

start().catch((error) => {
  console.error('Failed to start server');
  console.error(error);
  process.exit(1);
});
