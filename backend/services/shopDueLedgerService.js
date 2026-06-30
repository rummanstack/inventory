import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { cleanMoney } from "../lib/normalizers.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import {
  countShopDueLedgerEntries,
  listShopDueLedgerPage,
  listShopDueLedgerInRange,
  getLatestShopDueLedgerEntry,
  getShopBalanceBefore,
  insertShopDueLedgerEntry,
  mapShopDueLedgerEntry,
} from "../repositories/shopDueLedgerRepository.js";
import {
  findCustomerById,
  updateCustomerCurrentDue,
} from "../repositories/customerRepository.js";

const DATE_ERROR = "Ledger date must be in YYYY-MM-DD format.";

const TYPES = {
  OPENING: "OPENING",
  SALE_DUE: "SALE_DUE",
  COLLECTION: "COLLECTION",
  MANUAL_ADJUSTMENT: "MANUAL_ADJUSTMENT",
};

function normalizeOptionalDate(value) {
  const raw = String(value || "").trim();
  return raw ? normalizeIsoDate(raw, raw, DATE_ERROR) : "";
}

export class ShopDueLedgerService {
  constructor(databaseManager, { auditService, financeAccountService } = {}) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.financeAccountService = financeAccountService;
  }

  async listLedger(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const shopId = String(query.shopId || "").trim();
    const dateFrom = normalizeOptionalDate(query.dateFrom);
    const dateTo = normalizeOptionalDate(query.dateTo);

    if (dateFrom && dateTo) {
      assert(dateFrom <= dateTo, "Start date must be before or equal to end date.");
    }

    const filters = {
      tenantId: actor.tenantId,
      shopId: shopId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };

    const client = await this.databaseManager.getPool().connect();
    try {
      if (shopId) {
        const result = await findCustomerById(client, shopId, actor.tenantId);
        assert(result.rowCount > 0, "Shop not found.", 404);
      }

      const [items, total] = await Promise.all([
        listShopDueLedgerPage(client, { ...filters, limit, offset }),
        countShopDueLedgerEntries(client, filters),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }

  async getStatement(query = {}, actor) {
    const shopId = String(query.shopId || "").trim();
    assert(shopId, "shopId is required.");

    const dateFrom = normalizeOptionalDate(query.dateFrom);
    const dateTo = normalizeOptionalDate(query.dateTo);

    if (dateFrom && dateTo) {
      assert(dateFrom <= dateTo, "Start date must be before or equal to end date.");
    }

    const client = await this.databaseManager.getPool().connect();
    try {
      const shopResult = await findCustomerById(client, shopId, actor.tenantId);
      assert(shopResult.rowCount > 0, "Shop not found.", 404);
      const shop = shopResult.rows[0];

      const filters = {
        tenantId: actor.tenantId,
        shopId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };

      const [entries, openingBalance] = await Promise.all([
        listShopDueLedgerInRange(client, filters),
        getShopBalanceBefore(client, { tenantId: actor.tenantId, shopId, dateFrom: dateFrom || undefined }),
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
        shop: {
          id: shop.id,
          shopName: shop.shop_name,
          ownerName: shop.owner_name,
          phone: shop.phone,
          market: shop.market,
          openingDue: Number(shop.opening_due || 0),
          currentDue: Number(shop.current_due || 0),
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
    const shopId = String(query.shopId || "").trim();
    assert(shopId, "shopId is required.");

    const client = await this.databaseManager.getPool().connect();
    try {
      const shopResult = await findCustomerById(client, shopId, actor.tenantId);
      assert(shopResult.rowCount > 0, "Shop not found.", 404);

      const latest = await getLatestShopDueLedgerEntry(client, shopId, actor.tenantId);
      const balance = latest ? latest.balanceAfter : Number(shopResult.rows[0].opening_due || 0);

      return { shopId, balance };
    } finally {
      client.release();
    }
  }

  async recordDue(input, actor) {
    const shopId = String(input.shopId || "").trim();
    const amount = cleanMoney(input.amount);
    const note = String(input.note || "").trim();
    const businessDate = String(input.businessDate || "").trim() || new Date().toISOString().slice(0, 10);

    assert(shopId, "Shop is required.");
    assert(amount > 0, "Amount must be greater than zero.");

    return this.databaseManager.withTransaction(async (client) => {
      const shopResult = await client.query(
        `SELECT * FROM customers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1`,
        [shopId, actor.tenantId],
      );
      assert(shopResult.rowCount > 0, "Shop not found.", 404);
      const shop = shopResult.rows[0];

      const latestEntry = await getLatestShopDueLedgerEntry(client, shopId, actor.tenantId);
      const currentBalance = latestEntry ? latestEntry.balanceAfter : Number(shop.opening_due || 0);
      const balanceAfter = currentBalance + amount;

      const result = await insertShopDueLedgerEntry(client, {
        id: createId("sdl"),
        organizationId: actor.tenantId,
        shopId,
        type: TYPES.SALE_DUE,
        debit: amount,
        credit: 0,
        balanceAfter,
        referenceType: "manual_due",
        referenceId: null,
        note: note || `Due recorded for ${shop.shop_name}`,
        createdById: actor.id,
        businessDate,
      });

      await updateCustomerCurrentDue(client, shopId, actor.tenantId, balanceAfter);

      await this.recordActivity(client, actor, {
        actionType: "shop_due_ledger.record_due",
        entityType: "customer",
        entityId: shopId,
        module: "shop-due-ledger",
        description: `${actor.name} recorded due of ${amount} for ${shop.shop_name}`,
        metadata: { shopId, amount, balanceAfter, note },
      });

      return mapShopDueLedgerEntry(result.rows[0]);
    });
  }

  async collectDue(input, actor) {
    const shopId = String(input.shopId || "").trim();
    const amount = cleanMoney(input.amount);
    const note = String(input.note || "").trim();
    const businessDate = String(input.businessDate || "").trim() || new Date().toISOString().slice(0, 10);

    assert(shopId, "Shop is required.");
    assert(amount > 0, "Amount must be greater than zero.");

    return this.databaseManager.withTransaction(async (client) => {
      const shopResult = await client.query(
        `SELECT * FROM customers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1`,
        [shopId, actor.tenantId],
      );
      assert(shopResult.rowCount > 0, "Shop not found.", 404);
      const shop = shopResult.rows[0];

      const latestEntry = await getLatestShopDueLedgerEntry(client, shopId, actor.tenantId);
      const currentBalance = latestEntry ? latestEntry.balanceAfter : Number(shop.opening_due || 0);
      assert(amount <= currentBalance, `Collection amount exceeds current due balance of ${currentBalance}.`, 400);
      const balanceAfter = currentBalance - amount;

      const result = await insertShopDueLedgerEntry(client, {
        id: createId("sdl"),
        organizationId: actor.tenantId,
        shopId,
        type: TYPES.COLLECTION,
        debit: 0,
        credit: amount,
        balanceAfter,
        referenceType: "manual_collection",
        referenceId: null,
        note: note || `Collection from ${shop.shop_name}`,
        createdById: actor.id,
        businessDate,
      });

      await updateCustomerCurrentDue(client, shopId, actor.tenantId, balanceAfter);

      if (this.financeAccountService) {
        await this.financeAccountService.recordTransactionInClient(
          client,
          {
            accountType: "CASH",
            type: "DEPOSIT",
            amount,
            date: businessDate,
            note: note || `Due collected — ${shop.shop_name}`,
          },
          actor,
        );
      }

      await this.recordActivity(client, actor, {
        actionType: "shop_due_ledger.collect",
        entityType: "customer",
        entityId: shopId,
        module: "shop-due-ledger",
        description: `${actor.name} collected ${amount} from ${shop.shop_name}`,
        metadata: { shopId, amount, balanceAfter, note },
      });

      return mapShopDueLedgerEntry(result.rows[0]);
    });
  }

  async recordActivity(client, actor, payload) {
    if (!this.auditService || !actor) return;
    await this.auditService.record(client, {
      tenantId: actor.tenantId,
      userId: actor.id,
      actionType: payload.actionType,
      entityType: payload.entityType,
      entityId: payload.entityId,
      module: payload.module,
      description: payload.description,
      metadata: { actorName: actor.name, actorRole: actor.role, ...payload.metadata },
    });
  }
}
