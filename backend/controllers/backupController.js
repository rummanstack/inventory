export class BackupController {
  constructor(backupService, databaseManager, auditService) {
    this.backupService = backupService;
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  history = async (req, res, next) => {
    try {
      res.json(await this.auditService.list({ ...req.query, entityType: "database_backup" }, req.currentUser.tenantId));
    } catch (error) {
      next(error);
    }
  };

  download = async (req, res, next) => {
    let backupFile = null;
    let client = null;

    try {
      const format = req.query.format === "json" ? "json" : "sql";
      backupFile = await this.backupService.createBackupFile(format);
      client = await this.databaseManager.getPool().connect();

      try {
        await this.backupService.recordDownload(client, req.currentUser, backupFile.filename, format);
      } catch (auditError) {
        console.error("Failed to record backup download audit entry");
        console.error(auditError);
      } finally {
        client.release();
        client = null;
      }

      await new Promise((resolve, reject) => {
        res.download(backupFile.tempPath, backupFile.filename, (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    } catch (error) {
      next(error);
    } finally {
      if (client) {
        client.release();
      }

      if (backupFile) {
        await this.backupService.removeBackupFile(backupFile.tempPath);
      }
    }
  };
}
