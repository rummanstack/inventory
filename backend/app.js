import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { backendDistPath, frontendDistPath } from './config/paths.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createApiRouter } from './routes/api.js';

export function createApp({ authService, env, inventoryService, auditService, userService, expenseService, dsrFinanceService, monthEndSummaryService, profitService, backupService, databaseManager, tenantService, permissionService, systemService, errorLogService }) {
  const app = express();

  app.set('trust proxy', 1);
  app.use(express.json());
  app.use('/api', createApiRouter({ authService, env, inventoryService, auditService, userService, expenseService, dsrFinanceService, monthEndSummaryService, profitService, backupService, databaseManager, tenantService, permissionService, systemService, errorLogService }));

  const staticRoot = fs.existsSync(backendDistPath) ? backendDistPath : frontendDistPath;

  if (fs.existsSync(staticRoot)) {
    app.use(express.static(staticRoot));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(staticRoot, 'index.html'));
    });
  }

  app.use(errorHandler(errorLogService));

  return app;
}
