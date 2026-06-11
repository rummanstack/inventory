import { assert } from "../lib/errors.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import {
  countDueLedgerEntries,
  listDueLedgerPage,
  listDueLedgerInRange,
  getLatestDueLedgerEntry,
  getBalanceBefore,
} from "../repositories/dsrDueLedgerRepository.js";

const DATE_ERROR = "Ledger date must be in YYYY-MM-DD format.";

function normalizeOptionalDate(value) {
  const raw = String(value || "").trim();
  return raw ? normalizeIsoDate(raw, raw, DATE_ERROR) : "";
}

export class DsrDueLedgerService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
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
}
