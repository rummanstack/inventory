import { assert } from "../lib/errors.js";
import { diffFields } from "../lib/auditDiff.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { normalizeDsr } from "../lib/normalizers.js";
import { DSR_DUE_LEDGER_TYPES } from "../lib/dsrDueLedger.js";
import { getLatestDueLedgerEntry } from "../repositories/dsrDueLedgerRepository.js";
import {
  syncDsrHistory,
  countDsrs,
  countTrashedDsrs,
  listTrashedDsrs,
  permanentlyDeleteDsr,
  restoreDsr,
  softDeleteDsr,
  findDsrById,
  insertDsr,
  listAllActiveDsrsLite,
  listDsrsPage,
  mapDsr,
  updateDsr,
} from "../repositories/dsrRepository.js";
import { recordActivity, recordDueLedgerEntry } from "./shared/inventoryHelpers.js";

export class DsrService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  recordActivity(client, actor, payload) {
    return recordActivity(this.auditService, client, actor, payload);
  }

  async listDsrs(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const search = String(query.search || "").trim();
    const tenantId = actor.tenantId;

    const client = await this.databaseManager.getPool().connect();
    try {
      const [items, total] = await Promise.all([
        listDsrsPage(client, { search, tenantId, limit, offset }),
        countDsrs(client, { search, tenantId }),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }

  async getDsrsDirectory(actor) {
    const client = await this.databaseManager.getPool().connect();
    try {
      return { dsrs: await listAllActiveDsrsLite(client, actor.tenantId) };
    } finally {
      client.release();
    }
  }

  async saveDsr(input, actor) {
    const dsr = normalizeDsr(input);
    assert(dsr.name && dsr.phone && dsr.area, "Name, phone, and area are required.");

    return this.databaseManager.withTransaction(async (client) => {
      let result;

      if (input.id) {
        const existingResult = await findDsrById(client, dsr.id, actor.tenantId);
        assert(existingResult.rowCount > 0, "DSR not found.", 404);
        const existingOpeningDue = Number(existingResult.rows[0].opening_due || 0);

        dsr.tenantId = actor.tenantId;
        result = await updateDsr(client, dsr);
        assert(result.rowCount > 0, "DSR not found.", 404);
        await syncDsrHistory(client, dsr);

        const openingDueDelta = dsr.openingDue - existingOpeningDue;
        if (openingDueDelta !== 0) {
          assert(String(input.reason || "").trim(), "Reason is required for due adjustments.");

          const latestEntry = await getLatestDueLedgerEntry(client, dsr.id, actor.tenantId);
          const latestBalance = latestEntry ? latestEntry.balanceAfter : existingOpeningDue;
          const balanceAfter = latestBalance + openingDueDelta;

          await recordDueLedgerEntry(client, {
            tenantId: actor.tenantId,
            dsrId: dsr.id,
            type: DSR_DUE_LEDGER_TYPES.MANUAL_ADJUSTMENT,
            debit: Math.max(0, openingDueDelta),
            credit: Math.max(0, -openingDueDelta),
            balanceAfter,
            referenceType: "dsr",
            referenceId: dsr.id,
            note: `Opening due adjusted for ${dsr.name}`,
            createdById: actor.id,
          });

          const { before, after } = diffFields(
            { openingDue: existingOpeningDue },
            { openingDue: dsr.openingDue },
            ["openingDue"],
          );
          await this.recordActivity(client, actor, {
            actionType: "dsr.due_adjustment",
            entityType: "dsr",
            entityId: dsr.id,
            module: "due-ledger",
            description: `${actor.name} adjusted opening due for DSR ${dsr.name}`,
            before,
            after,
            reason: input.reason,
          });
        }

        await this.recordActivity(client, actor, {
          actionType: "dsr.update",
          entityType: "dsr",
          entityId: dsr.id,
          description: `${actor.name} updated DSR ${dsr.name}`,
          metadata: { name: dsr.name, status: dsr.status, area: dsr.area },
        });
      } else {
        dsr.tenantId = actor.tenantId;
        result = await insertDsr(client, dsr);

        if (dsr.openingDue > 0) {
          await recordDueLedgerEntry(client, {
            tenantId: actor.tenantId,
            dsrId: dsr.id,
            type: DSR_DUE_LEDGER_TYPES.OPENING,
            debit: dsr.openingDue,
            credit: 0,
            balanceAfter: dsr.openingDue,
            referenceType: "dsr",
            referenceId: dsr.id,
            note: `Opening due for ${dsr.name}`,
            createdById: actor.id,
          });
        }

        await this.recordActivity(client, actor, {
          actionType: "dsr.create",
          entityType: "dsr",
          entityId: dsr.id,
          description: `${actor.name} created DSR ${dsr.name}`,
          metadata: { name: dsr.name, status: dsr.status, area: dsr.area },
        });
      }

      return mapDsr(result.rows[0]);
    });
  }

  async removeDsr(dsrId, actor, reason) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await softDeleteDsr(client, dsrId, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });
      assert(result.rowCount > 0, "DSR not found.", 404);
      await this.recordActivity(client, actor, {
        actionType: "dsr.delete",
        entityType: "dsr",
        entityId: dsrId,
        description: `${actor.name} moved DSR ${dsrId} to trash${reason ? ` (${reason})` : ""}`,
      });
      return { ok: true };
    });
  }

  async restoreDsr(dsrId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await restoreDsr(client, dsrId, actor.tenantId);
      assert(result.rowCount > 0, "DSR not found in trash.", 404);
      await this.recordActivity(client, actor, {
        actionType: "dsr.restore",
        entityType: "dsr",
        entityId: dsrId,
        description: `${actor.name} restored DSR ${result.rows[0].name} from trash`,
      });
      return { ok: true };
    });
  }

  async permanentlyDeleteDsr(dsrId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await permanentlyDeleteDsr(client, dsrId, actor.tenantId);
      assert(result.rowCount > 0, "DSR not found in trash.", 404);
      await this.recordActivity(client, actor, {
        actionType: "dsr.permanent_delete",
        entityType: "dsr",
        entityId: dsrId,
        description: `${actor.name} permanently deleted DSR ${dsrId}`,
      });
      return { ok: true };
    });
  }

  async listTrashedDsrs(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const tenantId = actor.tenantId;

    const client = await this.databaseManager.getPool().connect();
    try {
      const [items, total] = await Promise.all([
        listTrashedDsrs(client, { tenantId, limit, offset }),
        countTrashedDsrs(client, tenantId),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }
}
