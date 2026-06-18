import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { cleanMoney } from "../lib/normalizers.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { DSR_DUE_LEDGER_TYPES } from "../lib/dsrDueLedger.js";
import { findDsrForUpdate } from "../repositories/dsrRepository.js";
import {
  countDueLedgerEntries,
  listDueLedgerPage,
  listDueLedgerInRange,
  getLatestDueLedgerEntry,
  getBalanceBefore,
  insertDueLedgerEntry,
  mapDueLedgerEntry,
} from "../repositories/dsrDueLedgerRepository.js";

const DATE_ERROR = "Ledger date must be in YYYY-MM-DD format.";

function normalizeOptionalDate(value) {
  const raw = String(value || "").trim();
  return raw ? normalizeIsoDate(raw, raw, DATE_ERROR) : "";
}

export class DsrDueLedgerService {
  constructor(databaseManager, { auditService, financeAccountService } = {}) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.financeAccountService = financeAccountService;
  }

  async listLedger(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const dsrId = String(query.dsrId || "").trim();
    const dateFrom = normalizeOptionalDate(query.dateFrom);
    const dateTo = normalizeOptionalDate(query.dateTo);

    if (dateFrom && dateTo) {
      assert(dateFrom <= dateTo, "Start date must be before or equal to end date.");
    }

    const filters = {
      tenantId: actor.tenantId,
      dsrId: dsrId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };

    const client = await this.databaseManager.getPool().connect();
    try {
      if (dsrId) {
        const dsrResult = await client.query("SELECT 1 FROM dsrs WHERE id = $1 AND tenant_id = $2 LIMIT 1", [
          dsrId,
          actor.tenantId,
        ]);
        assert(dsrResult.rowCount > 0, "DSR not found.", 404);
      }

      const [items, total] = await Promise.all([
        listDueLedgerPage(client, { ...filters, limit, offset }),
        countDueLedgerEntries(client, filters),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }

  async getStatement(query = {}, actor) {
    const dsrId = String(query.dsrId || "").trim();
    assert(dsrId, "dsrId is required.");

    const dateFrom = normalizeOptionalDate(query.dateFrom);
    const dateTo = normalizeOptionalDate(query.dateTo);

    if (dateFrom && dateTo) {
      assert(dateFrom <= dateTo, "Start date must be before or equal to end date.");
    }

    const client = await this.databaseManager.getPool().connect();
    try {
      const dsrResult = await client.query("SELECT id, name, area, phone, opening_due FROM dsrs WHERE id = $1 AND tenant_id = $2 LIMIT 1", [
        dsrId,
        actor.tenantId,
      ]);
      assert(dsrResult.rowCount > 0, "DSR not found.", 404);

      const filters = {
        tenantId: actor.tenantId,
        dsrId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };

      const [entries, openingBalance] = await Promise.all([
        listDueLedgerInRange(client, filters),
        getBalanceBefore(client, { tenantId: actor.tenantId, dsrId, dateFrom: dateFrom || undefined }),
      ]);

      const totals = entries.reduce(
        (acc, entry) => {
          acc.debit += entry.debit;
          acc.credit += entry.credit;
          return acc;
        },
        { debit: 0, credit: 0 },
      );

      const closingBalance = entries.length ? entries[entries.length - 1].balanceAfter : openingBalance;

      return {
        dsr: {
          id: dsrResult.rows[0].id,
          name: dsrResult.rows[0].name,
          area: dsrResult.rows[0].area,
          phone: dsrResult.rows[0].phone,
          openingDue: Number(dsrResult.rows[0].opening_due || 0),
        },
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        openingBalance,
        closingBalance,
        totalDebit: totals.debit,
        totalCredit: totals.credit,
        entries,
      };
    } finally {
      client.release();
    }
  }

  async getBalance(query = {}, actor) {
    const dsrId = String(query.dsrId || "").trim();
    assert(dsrId, "dsrId is required.");

    const client = await this.databaseManager.getPool().connect();
    try {
      const dsrResult = await client.query("SELECT id, opening_due FROM dsrs WHERE id = $1 AND tenant_id = $2 LIMIT 1", [
        dsrId,
        actor.tenantId,
      ]);
      assert(dsrResult.rowCount > 0, "DSR not found.", 404);

      const latest = await getLatestDueLedgerEntry(client, dsrId, actor.tenantId);
      const balance = latest ? latest.balanceAfter : Number(dsrResult.rows[0].opening_due || 0);

      return { dsrId, balance };
    } finally {
      client.release();
    }
  }

  async settleDue(input, actor) {
    const dsrId = String(input.dsrId || "").trim();
    const amount = cleanMoney(input.amount);
    const note = String(input.note || "").trim();

    assert(dsrId, "DSR is required.");
    assert(amount > 0, "Amount must be greater than zero.");

    return this.databaseManager.withTransaction(async (client) => {
      const dsrResult = await findDsrForUpdate(client, dsrId, actor.tenantId);
      assert(dsrResult.rowCount > 0, "DSR not found.", 404);
      const dsr = dsrResult.rows[0];

      const latestEntry = await getLatestDueLedgerEntry(client, dsrId, actor.tenantId);
      const currentBalance = latestEntry ? latestEntry.balanceAfter : Number(dsr.opening_due || 0);
      assert(amount <= currentBalance, `Settlement amount exceeds current due balance of ${currentBalance}.`, 400);
      const balanceAfter = currentBalance - amount;
      const businessDate = new Date().toISOString().slice(0, 10);

      const result = await insertDueLedgerEntry(client, {
        id: createId("due-ledger"),
        organizationId: actor.tenantId,
        dsrId,
        type: DSR_DUE_LEDGER_TYPES.COLLECTION,
        debit: 0,
        credit: amount,
        balanceAfter,
        referenceType: "manual_settlement",
        referenceId: null,
        note: note || `Due settled for ${dsr.name}`,
        createdById: actor.id,
        businessDate,
      });

      if (this.financeAccountService) {
        await this.financeAccountService.recordTransactionInClient(
          client,
          {
            accountType: "CASH",
            type: "DEPOSIT",
            amount,
            date: businessDate,
            note: note || `Due settled — ${dsr.name}`,
          },
          actor,
        );
      }

      await this.recordActivity(client, actor, {
        actionType: "dsr_due_ledger.settle",
        entityType: "dsr",
        entityId: dsrId,
        module: "due-ledger",
        description: `${actor.name} settled due of ${amount} for DSR ${dsr.name}`,
        metadata: { dsrId, amount, balanceAfter, note },
      });

      return mapDueLedgerEntry(result.rows[0]);
    });
  }

  async recordActivity(client, actor, payload) {
    if (!this.auditService || !actor) {
      return;
    }

    await this.auditService.record(client, {
      tenantId: actor.tenantId,
      userId: actor.id,
      actionType: payload.actionType,
      entityType: payload.entityType,
      entityId: payload.entityId,
      module: payload.module,
      before: payload.before,
      after: payload.after,
      reason: payload.reason,
      description: payload.description,
      metadata: {
        actorName: actor.name,
        actorRole: actor.role,
        ...payload.metadata,
      },
    });
  }
}
