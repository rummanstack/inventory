import { assert } from "../lib/errors.js";
import { diffFields } from "../lib/auditDiff.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { normalizeSr } from "../lib/normalizers.js";
import { SR_DUE_LEDGER_TYPES } from "../lib/srDueLedger.js";
import { getLatestSrDueLedgerEntry } from "../repositories/srDueLedgerRepository.js";
import {
  countSrs,
  countTrashedSrs,
  findSrForUpdate,
  insertSr,
  listAllActiveSrsLite,
  listSrsPage,
  listTrashedSrs,
  mapSr,
  permanentlyDeleteSr,
  restoreSr,
  softDeleteSr,
  updateSr,
} from "../repositories/srRepository.js";
import { logActivity, recordSrDueLedgerEntry } from "./shared/inventoryHelpers.js";
import { assertZeroBalanceBeforeDelete } from "../lib/entityDeletionGuard.js";

export class SrService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  async listSrs(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const search = String(query.search || "").trim();
    const tenantId = actor.tenantId;

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listSrsPage(client, { search, tenantId, limit, offset }),
        countSrs(client, { search, tenantId }),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async getSrsDirectory(actor) {
    return this.databaseManager.withClient(async (client) => ({
      srs: await listAllActiveSrsLite(client, actor.tenantId),
    }));
  }

  async saveSr(input, actor) {
    const sr = normalizeSr(input);
    assert(sr.name && sr.phone, "Name and phone are required.");

    return this.databaseManager.withTransaction(async (client) => {
      let result;

      if (input.id) {
        const existingResult = await findSrForUpdate(client, sr.id, actor.tenantId);
        assert(existingResult.rowCount > 0, "SR not found.", 404);
        const existingOpeningDue = Number(existingResult.rows[0].opening_due || 0);

        sr.tenantId = actor.tenantId;
        result = await updateSr(client, sr);
        assert(result.rowCount > 0, "SR not found.", 404);

        const openingDueDelta = sr.openingDue - existingOpeningDue;
        if (openingDueDelta !== 0) {
          assert(String(input.reason || "").trim(), "Reason is required for due adjustments.");

          const latestEntry = await getLatestSrDueLedgerEntry(client, sr.id, actor.tenantId);
          const latestBalance = latestEntry ? latestEntry.balanceAfter : existingOpeningDue;
          const balanceAfter = latestBalance + openingDueDelta;

          await recordSrDueLedgerEntry(client, {
            tenantId: actor.tenantId,
            srId: sr.id,
            type: SR_DUE_LEDGER_TYPES.MANUAL_ADJUSTMENT,
            debit: Math.max(0, openingDueDelta),
            credit: Math.max(0, -openingDueDelta),
            balanceAfter,
            referenceType: "sr",
            referenceId: sr.id,
            note: `Opening due adjusted for ${sr.name}`,
            createdById: actor.id,
          });

          const { before, after } = diffFields(
            { openingDue: existingOpeningDue },
            { openingDue: sr.openingDue },
            ["openingDue"],
          );
          await this.recordActivity(client, actor, {
            actionType: "sr.due_adjustment",
            entityType: "sr",
            entityId: sr.id,
            module: "sr-due-ledger",
            description: `${actor.name} adjusted opening due for SR ${sr.name}`,
            before,
            after,
            reason: input.reason,
          });
        }

        await this.recordActivity(client, actor, {
          actionType: "sr.update",
          entityType: "sr",
          entityId: sr.id,
          description: `${actor.name} updated SR ${sr.name}`,
          metadata: { name: sr.name, status: sr.status },
        });
      } else {
        sr.tenantId = actor.tenantId;
        result = await insertSr(client, sr);

        if (sr.openingDue > 0) {
          await recordSrDueLedgerEntry(client, {
            tenantId: actor.tenantId,
            srId: sr.id,
            type: SR_DUE_LEDGER_TYPES.OPENING,
            debit: sr.openingDue,
            credit: 0,
            balanceAfter: sr.openingDue,
            referenceType: "sr",
            referenceId: sr.id,
            note: `Opening due for ${sr.name}`,
            createdById: actor.id,
          });
        }

        await this.recordActivity(client, actor, {
          actionType: "sr.create",
          entityType: "sr",
          entityId: sr.id,
          description: `${actor.name} created SR ${sr.name}`,
          metadata: { name: sr.name, status: sr.status },
        });
      }

      return mapSr(result.rows[0]);
    });
  }

  async removeSr(srId, actor, reason) {
    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findSrForUpdate(client, srId, actor.tenantId);
      assert(existingResult.rowCount > 0, "SR not found.", 404);
      const latestBalance = await getLatestSrDueLedgerEntry(client, srId, actor.tenantId);
      assertZeroBalanceBeforeDelete(
        latestBalance?.balanceAfter ?? existingResult.rows[0].opening_due,
        "SR " + existingResult.rows[0].name,
      );
      const result = await softDeleteSr(client, srId, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });
      assert(result.rowCount > 0, "SR not found.", 404);
      await this.recordActivity(client, actor, {
        actionType: "sr.delete",
        entityType: "sr",
        entityId: srId,
        description: `${actor.name} moved SR ${srId} to trash${reason ? ` (${reason})` : ""}`,
      });
      return { ok: true };
    });
  }

  async restoreSr(srId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await restoreSr(client, srId, actor.tenantId);
      assert(result.rowCount > 0, "SR not found in trash.", 404);
      await this.recordActivity(client, actor, {
        actionType: "sr.restore",
        entityType: "sr",
        entityId: srId,
        description: `${actor.name} restored SR ${result.rows[0].name} from trash`,
      });
      return { ok: true };
    });
  }

  async permanentlyDeleteSr(srId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await permanentlyDeleteSr(client, srId, actor.tenantId);
      assert(result.rowCount > 0, "SR not found in trash.", 404);
      await this.recordActivity(client, actor, {
        actionType: "sr.permanent_delete",
        entityType: "sr",
        entityId: srId,
        description: `${actor.name} permanently deleted SR ${srId}`,
      });
      return { ok: true };
    });
  }

  async listTrashedSrs(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const tenantId = actor.tenantId;

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listTrashedSrs(client, { tenantId, limit, offset }),
        countTrashedSrs(client, tenantId),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }
}
