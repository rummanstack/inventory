import { createId } from "../lib/ids.js";
import { assert } from "../lib/errors.js";
import { DSR_TARGET_ACTIONS } from "../lib/auditActions.js";
import {
  upsertDsrTarget,
  getTargetsByMonth,
  getMonthlySummary,
} from "../repositories/dsrTargetRepository.js";
import { logActivity } from "./shared/inventoryHelpers.js";

export class DsrTargetService {
  constructor(databaseManager, { auditService } = {}) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async setTargets(targets, actor) {
    // targets = [{ dsrId, month, targetAmount }]
    assert(Array.isArray(targets) && targets.length, "No targets provided.", 400);
    const month = targets[0].month;
    assert(/^\d{4}-\d{2}$/.test(month), "Invalid month format (YYYY-MM).", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const results = [];
      for (const t of targets) {
        assert(t.dsrId, "dsrId is required.", 400);
        assert(Number(t.targetAmount) >= 0, "Target amount must be non-negative.", 400);
        const row = await upsertDsrTarget(client, {
          id: createId("dsrtgt"),
          tenantId: actor.tenantId,
          dsrId: t.dsrId,
          month: t.month || month,
          targetAmount: Number(t.targetAmount),
        });
        results.push(row);
      }
      await logActivity(this.auditService, client, actor, {
        actionType: DSR_TARGET_ACTIONS.SET,
        entityType: "dsr_target",
        entityId: month,
        description: `${actor.name} updated ${results.length} DSR target${results.length === 1 ? "" : "s"} for ${month}`,
        metadata: {
          month,
          count: results.length,
          dsrIds: results.map((item) => item.dsrId),
          targetAmounts: results.map((item) => ({
            dsrId: item.dsrId,
            targetAmount: item.targetAmount,
          })),
        },
        after: {
          month,
          targets: results.map((item) => ({
            dsrId: item.dsrId,
            targetAmount: item.targetAmount,
          })),
        },
      });
      return results;
    });
  }

  async getTargets(month, actor) {
    assert(/^\d{4}-\d{2}$/.test(month), "Invalid month format (YYYY-MM).", 400);
    return this.databaseManager.withClient((client) =>
      getTargetsByMonth(client, actor.tenantId, month),
    );
  }

  async getMonthlySummary(month, actor) {
    assert(/^\d{4}-\d{2}$/.test(month), "Invalid month format (YYYY-MM).", 400);
    return this.databaseManager.withClient((client) =>
      getMonthlySummary(client, actor.tenantId, month),
    );
  }
}
