function buildFilename(fileName, extension) {
  const safe = String(fileName || "report")
    .trim()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${safe || "report"}.${extension}`;
}

export class ReportExportController {
  constructor(reportExportService, auditService) {
    this.reportExportService = reportExportService;
    this.auditService = auditService;
  }

  pdf = async (req, res, next) => {
    try {
      const buffer = await this.reportExportService.createPdfBuffer(req.body || {});
      await this.recordDownload(req, "pdf");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${buildFilename(req.body?.fileName, "pdf")}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };

  excel = async (req, res, next) => {
    try {
      const buffer = await this.reportExportService.createExcelBuffer(req.body || {});
      await this.recordDownload(req, "excel");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${buildFilename(req.body?.fileName, "xlsx")}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };

  async recordDownload(req, format) {
    if (!this.auditService || !req.currentUser) {
      return;
    }

    try {
      const entityType = String(req.body?.entityType || "report");
      await this.auditService.recordPrint({
        tenantId: req.currentUser.tenantId,
        userId: req.currentUser.id,
        entityType,
        entityId: req.body?.entityId || null,
        label: `${format}:${req.body?.title || req.body?.fileName || entityType}`,
        actorName: req.currentUser.name,
        actorRole: req.currentUser.role,
      });
    } catch (error) {
      console.error("Failed to record report download audit entry");
      console.error(error);
    }
  }
}
