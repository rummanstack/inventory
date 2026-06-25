import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { cleanMoney } from "../lib/normalizers.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { SR_DUE_LEDGER_TYPES } from "../lib/srDueLedger.js";
import { findSrForUpdate } from "../repositories/srRepository.js";
import {
  countSrDueLedgerEntries,
  listSrDueLedgerPage,
  listSrDueLedgerInRange,
  getLatestSrDueLedgerEntry,
  getBalanceBefore,
  insertSrDueLedgerEntry,
  mapSrDueLedgerEntry,
} from "../repositories/srDueLedgerRepository.js";

const DATE_ERROR = "Ledger date must be in YYYY-MM-DD format.";

function normalizeOptionalDate(value) {
  const raw = String(value || "").trim();
  return raw ? normalizeIsoDate(raw, raw, DATE_ERROR) : "";
}

export class SrDueLedgerService {
  constructor(databaseManager, { auditService, financeAccountService } = {}) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.financeAccountService = financeAccountService;
  }

  async listLedger(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const srId = String(query.srId || "").trim();
    const dateFrom = normalizeOptionalDate(query.dateFrom);
    const dateTo = normalizeOptionalDate(query.dateTo);

    if (dateFrom && dateTo) {
      assert(dateFrom <= dateTo, "Start date must be before or equal to end date.");
    }

    const filters = {
      tenantId: actor.tenantId,
      srId: srId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };

    const client = await this.databaseManager.getPool().connect();
    try {
      if (srId) {
        const srResult = await client.query("SELECT 1 FROM srs WHERE id = $1 AND tenant_id = $2 LIMIT 1", [
          srId,
          actor.tenantId,
        ]);
        assert(srResult.rowCount > 0, "SR not found.", 404);
      }

      const [items, total] = await Promise.all([
        listSrDueLedgerPage(client, { ...filters, limit, offset }),
        countSrDueLedgerEntries(client, filters),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }

  async getStatement(query = {}, actor) {
    const srId = String(query.srId || "").trim();
    assert(srId, "srId is required.");

    const dateFrom = normalizeOptionalDate(query.dateFrom);
    const dateTo = normalizeOptionalDate(query.dateTo);

    if (dateFrom && dateTo) {
      assert(dateFrom <= dateTo, "Start date must be before or equal to end date.");
    }

    const client = await this.databaseManager.getPool().connect();
    try {
      const srResult = await client.query(
        `SELECT s.id, s.name, s.phone, s.status, s.opening_due,
                COALESCE(ld.balance_after, s.opening_due) AS current_due
         FROM srs s
         LEFT JOIN LATERAL (
           SELECT balance_after FROM sr_due_ledger
           WHERE sr_id = s.id AND tenant_id = s.tenant_id
           ORDER BY created_at DESC LIMIT 1
         ) ld ON TRUE
         WHERE s.id = $1 AND s.tenant_id = $2 AND s.deleted_at IS NULL LIMIT 1`,
        [srId, actor.tenantId],
      );
      assert(srResult.rowCount > 0, "SR not found.", 404);

      const filters = {
        tenantId: actor.tenantId,
        srId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };

      const [entries, openingBalance] = await Promise.all([
        listSrDueLedgerInRange(client, filters),
        getBalanceBefore(client, { tenantId: actor.tenantId, srId, dateFrom: dateFrom || undefined }),
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

      const srRow = srResult.rows[0];
      return {
        sr: {
          id: srRow.id,
          name: srRow.name,
          phone: srRow.phone,
          status: srRow.status,
          openingDue: Number(srRow.opening_due || 0),
          currentDue: Number(srRow.current_due || 0),
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
    const srId = String(query.srId || "").trim();
    assert(srId, "srId is required.");

    const client = await this.databaseManager.getPool().connect();
    try {
      const srResult = await client.query("SELECT id, opening_due FROM srs WHERE id = $1 AND tenant_id = $2 LIMIT 1", [
        srId,
        actor.tenantId,
      ]);
      assert(srResult.rowCount > 0, "SR not found.", 404);

      const latest = await getLatestSrDueLedgerEntry(client, srId, actor.tenantId);
      const balance = latest ? latest.balanceAfter : Number(srResult.rows[0].opening_due || 0);

      return { srId, balance };
    } finally {
      client.release();
    }
  }

  async settleDue(input, actor) {
    const srId = String(input.srId || "").trim();
    const amount = cleanMoney(input.amount);
    const note = String(input.note || "").trim();

    assert(srId, "SR is required.");
    assert(amount > 0, "Amount must be greater than zero.");

    return this.databaseManager.withTransaction(async (client) => {
      const srResult = await findSrForUpdate(client, srId, actor.tenantId);
      assert(srResult.rowCount > 0, "SR not found.", 404);
      const sr = srResult.rows[0];

      const latestEntry = await getLatestSrDueLedgerEntry(client, srId, actor.tenantId);
      const currentBalance = latestEntry ? latestEntry.balanceAfter : Number(sr.opening_due || 0);
      assert(amount <= currentBalance + 0.004, `Collection amount exceeds current due balance of ${currentBalance}.`, 400);
      const balanceAfter = currentBalance - amount;
      const businessDate = new Date().toISOString().slice(0, 10);

      const result = await insertSrDueLedgerEntry(client, {
        id: createId("sr-ledger"),
        tenantId: actor.tenantId,
        srId,
        type: SR_DUE_LEDGER_TYPES.COLLECTION,
        debit: 0,
        credit: amount,
        balanceAfter,
        referenceType: "manual_collection",
        referenceId: null,
        note: note || `Due collected for ${sr.name}`,
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
            note: note || `SR due collected — ${sr.name}`,
          },
          actor,
        );
      }

      if (this.auditService && actor) {
        await this.auditService.record(client, {
          tenantId: actor.tenantId,
          userId: actor.id,
          actionType: "sr_due_ledger.collect",
          entityType: "sr",
          entityId: srId,
          module: "sr-due-ledger",
          description: `${actor.name} collected due of ${amount} from SR ${sr.name}`,
          metadata: { actorName: actor.name, actorRole: actor.role, srId, amount, balanceAfter, note },
        });
      }

      return mapSrDueLedgerEntry(result.rows[0]);
    });
  }
}
