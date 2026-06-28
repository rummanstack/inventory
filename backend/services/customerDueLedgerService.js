import { assert } from "../lib/errors.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { findRetailCustomerById } from "../repositories/retailCustomerRepository.js";
import {
  countCustomerDueLedgerEntries,
  listCustomerDueLedgerPage,
  listCustomerDueLedgerInRange,
  getLatestCustomerDueLedgerEntry,
  getCustomerBalanceBefore,
  getCustomerDueReport,
} from "../repositories/customerDueLedgerRepository.js";

const DATE_ERROR = "Ledger date must be in YYYY-MM-DD format.";

function normalizeOptionalDate(value) {
  const raw = String(value || "").trim();
  return raw ? normalizeIsoDate(raw, raw, DATE_ERROR) : "";
}

export class CustomerDueLedgerService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async listLedger(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const customerId = String(query.customerId || "").trim();
    const dateFrom = normalizeOptionalDate(query.dateFrom);
    const dateTo = normalizeOptionalDate(query.dateTo);

    if (dateFrom && dateTo) {
      assert(dateFrom <= dateTo, "Start date must be before or equal to end date.");
    }

    const filters = {
      tenantId: actor.tenantId,
      customerId: customerId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };

    const client = await this.databaseManager.getPool().connect();
    try {
      if (customerId) {
        const result = await findRetailCustomerById(client, customerId, actor.tenantId);
        assert(result.rowCount > 0, "Customer not found.", 404);
      }

      const [items, total] = await Promise.all([
        listCustomerDueLedgerPage(client, { ...filters, limit, offset }),
        countCustomerDueLedgerEntries(client, filters),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }

  async getStatement(query = {}, actor) {
    const customerId = String(query.customerId || "").trim();
    assert(customerId, "customerId is required.");

    const dateFrom = normalizeOptionalDate(query.dateFrom);
    const dateTo = normalizeOptionalDate(query.dateTo);

    if (dateFrom && dateTo) {
      assert(dateFrom <= dateTo, "Start date must be before or equal to end date.");
    }

    const client = await this.databaseManager.getPool().connect();
    try {
      const customerResult = await findRetailCustomerById(client, customerId, actor.tenantId);
      assert(customerResult.rowCount > 0, "Customer not found.", 404);
      const customer = customerResult.rows[0];

      const filters = {
        tenantId: actor.tenantId,
        customerId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };

      const [entries, openingBalance] = await Promise.all([
        listCustomerDueLedgerInRange(client, filters),
        getCustomerBalanceBefore(client, { tenantId: actor.tenantId, customerId, dateFrom: dateFrom || undefined }),
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
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          openingDue: Number(customer.opening_due || 0),
          currentDue: Number(customer.current_due || 0),
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
    const customerId = String(query.customerId || "").trim();
    assert(customerId, "customerId is required.");

    const client = await this.databaseManager.getPool().connect();
    try {
      const customerResult = await findRetailCustomerById(client, customerId, actor.tenantId);
      assert(customerResult.rowCount > 0, "Customer not found.", 404);

      const latest = await getLatestCustomerDueLedgerEntry(client, customerId, actor.tenantId);
      const balance = latest ? latest.balanceAfter : Number(customerResult.rows[0].opening_due || 0);

      return { customerId, balance };
    } finally {
      client.release();
    }
  }

  async getCustomerDueReport(actor) {
    return this.databaseManager.withClient(async (client) => {
      const rows = await getCustomerDueReport(client, actor.tenantId);
      return { rows };
    });
  }
}
