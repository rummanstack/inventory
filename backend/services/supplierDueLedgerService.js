import { assert } from "../lib/errors.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { findSupplierById } from "../repositories/supplierRepository.js";
import {
  countSupplierDueLedgerEntries,
  listSupplierDueLedgerPage,
  listSupplierDueLedgerInRange,
  getLatestSupplierDueLedgerEntry,
  getSupplierBalanceBefore,
} from "../repositories/supplierDueLedgerRepository.js";

const DATE_ERROR = "Ledger date must be in YYYY-MM-DD format.";

function normalizeOptionalDate(value) {
  const raw = String(value || "").trim();
  return raw ? normalizeIsoDate(raw, raw, DATE_ERROR) : "";
}

export class SupplierDueLedgerService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async listLedger(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const supplierId = String(query.supplierId || "").trim();
    const dateFrom = normalizeOptionalDate(query.dateFrom);
    const dateTo = normalizeOptionalDate(query.dateTo);

    if (dateFrom && dateTo) {
      assert(dateFrom <= dateTo, "Start date must be before or equal to end date.");
    }

    const filters = {
      tenantId: actor.tenantId,
      supplierId: supplierId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };

    const client = await this.databaseManager.getPool().connect();
    try {
      if (supplierId) {
        const result = await findSupplierById(client, supplierId, actor.tenantId);
        assert(result.rowCount > 0, "Supplier not found.", 404);
      }

      const [items, total] = await Promise.all([
        listSupplierDueLedgerPage(client, { ...filters, limit, offset }),
        countSupplierDueLedgerEntries(client, filters),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }

  async getStatement(query = {}, actor) {
    const supplierId = String(query.supplierId || "").trim();
    assert(supplierId, "supplierId is required.");

    const dateFrom = normalizeOptionalDate(query.dateFrom);
    const dateTo = normalizeOptionalDate(query.dateTo);

    if (dateFrom && dateTo) {
      assert(dateFrom <= dateTo, "Start date must be before or equal to end date.");
    }

    const client = await this.databaseManager.getPool().connect();
    try {
      const supplierResult = await findSupplierById(client, supplierId, actor.tenantId);
      assert(supplierResult.rowCount > 0, "Supplier not found.", 404);
      const supplier = supplierResult.rows[0];

      const filters = {
        tenantId: actor.tenantId,
        supplierId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };

      const [entries, openingBalance] = await Promise.all([
        listSupplierDueLedgerInRange(client, filters),
        getSupplierBalanceBefore(client, { tenantId: actor.tenantId, supplierId, dateFrom: dateFrom || undefined }),
      ]);

      const totals = entries.reduce(
        (acc, entry) => {
          acc.debit += entry.debit;
          acc.credit += entry.credit;
          return acc;
        },
        { debit: 0, credit: 0 },
      );

      const closingBalance = entries.length ? entries[0].balanceAfter : openingBalance;

      return {
        supplier: {
          id: supplier.id,
          name: supplier.name,
          phone: supplier.phone,
          address: supplier.address,
          openingDue: Number(supplier.opening_due || 0),
          currentDue: Number(supplier.current_due || 0),
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
    const supplierId = String(query.supplierId || "").trim();
    assert(supplierId, "supplierId is required.");

    const client = await this.databaseManager.getPool().connect();
    try {
      const supplierResult = await findSupplierById(client, supplierId, actor.tenantId);
      assert(supplierResult.rowCount > 0, "Supplier not found.", 404);

      const latest = await getLatestSupplierDueLedgerEntry(client, supplierId, actor.tenantId);
      const balance = latest ? latest.balanceAfter : Number(supplierResult.rows[0].opening_due || 0);

      return { supplierId, balance };
    } finally {
      client.release();
    }
  }
}
