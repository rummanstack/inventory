export class AuditController {
  constructor(auditService) {
    this.auditService = auditService;
  }

  recordPrint = async (req, res, next) => {
    try {
      const actor = req.currentUser;
      await this.auditService.recordPrint({
        tenantId: actor.tenantId || null,
        userId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        entityType: String(req.body?.entityType || "report"),
        entityId: req.body?.entityId || null,
        label: req.body?.label || "",
      });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

  entityHistory = async (req, res, next) => {
    try {
      const result = await this.auditService.listForEntity(
        req.params.entityType,
        req.params.entityId,
        req.currentUser.tenantId,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
