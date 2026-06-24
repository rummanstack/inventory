import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { cleanMoney } from "../lib/normalizers.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { TRADE_IN_CONDITION_VALUES } from "../lib/tradeIns.js";
import { TRADE_IN_ACTIONS } from "../lib/auditActions.js";
import { STOCK_MOVEMENT_TYPES } from "../lib/stockMovements.js";
import { nextTradeInNumber } from "../lib/tradeInNumber.js";
import {
  countTradeIns,
  countTrashedTradeIns,
  findTradeInById,
  insertTradeIn,
  insertTradeInReceivedItem,
  insertTradeInSoldItem,
  listTradeInsPage,
  listTrashedTradeIns,
  mapTradeIn,
  softDeleteTradeIn,
} from "../repositories/tradeInRepository.js";
import {
  logActivity,
  lockProducts,
  applyStockDelta,
  recordStockMovement,
} from "./shared/inventoryHelpers.js";

const DATE_ERROR = "Date must be in YYYY-MM-DD format.";

function normalizeReceivedItem(input) {
  const quantity = Math.max(0.001, cleanMoney(input.quantity ?? 1));
  const tradeInValue = Math.max(0, cleanMoney(input.tradeInValue ?? 0));
  const condition = TRADE_IN_CONDITION_VALUES.includes(String(input.condition || "").toUpperCase())
    ? String(input.condition).toUpperCase()
    : "GOOD";
  return {
    id: input.id || createId("trd-recv"),
    productId: String(input.productId || "").trim() || null,
    productName: String(input.productName || "").trim(),
    serialNumber: String(input.serialNumber || "").trim(),
    condition,
    quantity,
    tradeInValue,
  };
}

function normalizeSoldItem(input) {
  const quantity = Math.max(0.001, cleanMoney(input.quantity ?? 1));
  const unitPrice = Math.max(0, cleanMoney(input.unitPrice ?? 0));
  const lineTotal = Math.max(0, quantity * unitPrice);
  return {
    id: input.id || createId("trd-sold"),
    productId: String(input.productId || "").trim() || null,
    productName: String(input.productName || "").trim(),
    quantity,
    unitPrice,
    costPriceSnapshot: 0,
    lineTotal,
  };
}

export class TradeInService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  async listTradeIns(query, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const filters = {
      tenantId: actor.tenantId,
      search: String(query.search || "").trim() || null,
      dateFrom: String(query.dateFrom || "").trim() || null,
      dateTo: String(query.dateTo || "").trim() || null,
    };

    return this.databaseManager.withClient(async (client) => {
      const [total, items] = await Promise.all([
        countTradeIns(client, filters),
        listTradeInsPage(client, { ...filters, limit, offset }),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async getTradeIn(id, actor) {
    return this.databaseManager.withClient(async (client) => {
      const result = await findTradeInById(client, id, actor.tenantId);
      assert(result.rowCount > 0, "Trade-in not found.", 404);
      return mapTradeIn(result.rows[0]);
    });
  }

  async createTradeIn(input, actor) {
    const rawReceived = Array.isArray(input.receivedItems) ? input.receivedItems : [];
    const rawSold = Array.isArray(input.soldItems) ? input.soldItems : [];

    assert(rawReceived.length > 0, "At least one trade-in (received) item is required.");
    assert(rawSold.length > 0, "At least one sold item is required.");

    const receivedItems = rawReceived.map(normalizeReceivedItem);
    const soldItems = rawSold.map(normalizeSoldItem);

    for (const item of receivedItems) {
      assert(item.productName || item.productId, "Each received item must have a product name.");
    }
    for (const item of soldItems) {
      assert(item.productName || item.productId, "Each sold item must have a product name.");
    }

    const totalTradeInValue = receivedItems.reduce((sum, item) => sum + item.tradeInValue, 0);
    const totalSaleAmount = soldItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const paymentAmount = totalSaleAmount - totalTradeInValue;
    const paymentMethod = String(input.paymentMethod || "CASH").trim().toUpperCase();
    const tradeInDate = normalizeIsoDate(input.tradeInDate, new Date().toISOString().slice(0, 10), DATE_ERROR);

    return this.databaseManager.withTransaction(async (client) => {
      // Lock all products that appear in either list
      const productIds = [
        ...receivedItems.filter((i) => i.productId).map((i) => i.productId),
        ...soldItems.filter((i) => i.productId).map((i) => i.productId),
      ];
      const productMap = productIds.length > 0 ? await lockProducts(client, productIds, actor.tenantId) : new Map();

      // Validate stock for sold items
      for (const item of soldItems) {
        if (!item.productId) continue;
        const product = productMap.get(item.productId);
        assert(product, `Product not found: "${item.productName}".`, 404);
        assert(
          Number(product.stock_pieces) >= item.quantity,
          `Insufficient stock for "${item.productName}". Available: ${product.stock_pieces}, required: ${item.quantity}.`,
          400,
        );
      }

      // Fill cost price snapshots from locked products
      for (const item of soldItems) {
        if (item.productId) {
          const product = productMap.get(item.productId);
          item.costPriceSnapshot = product ? Number(product.cost_price || 0) : 0;
          if (!item.productName) item.productName = product?.name || '';
        }
      }
      for (const item of receivedItems) {
        if (item.productId && !item.productName) {
          const product = productMap.get(item.productId);
          item.productName = product?.name || '';
        }
      }

      const year = new Date(tradeInDate).getUTCFullYear();
      const tradeInNumber = await nextTradeInNumber(client, actor.tenantId, year);
      const tradeInId = createId("tradein");

      await insertTradeIn(client, {
        id: tradeInId,
        tenantId: actor.tenantId,
        tradeInNumber,
        tradeInDate,
        customerName: String(input.customerName || "").trim(),
        customerPhone: String(input.customerPhone || "").trim(),
        totalTradeInValue,
        totalSaleAmount,
        paymentAmount,
        paymentMethod,
        notes: String(input.notes || "").trim(),
        createdById: actor.id,
      });

      // Insert and process received items
      for (const item of receivedItems) {
        await insertTradeInReceivedItem(client, item, tradeInId, actor.tenantId);
        if (item.productId) {
          const { stockPieces } = await applyStockDelta(client, item.productId, actor.tenantId, item.quantity, 0);
          await recordStockMovement(client, {
            tenantId: actor.tenantId,
            productId: item.productId,
            type: STOCK_MOVEMENT_TYPES.TRADE_IN_RECEIVED,
            quantityIn: item.quantity,
            quantityOut: 0,
            balanceAfter: stockPieces,
            referenceType: "trade_in",
            referenceId: tradeInId,
            note: `Trade-in received: ${item.productName}${item.serialNumber ? ` (SN: ${item.serialNumber})` : ""}`,
            createdById: actor.id,
            businessDate: tradeInDate,
          });
        }
      }

      // Insert and process sold items
      for (const item of soldItems) {
        await insertTradeInSoldItem(client, item, tradeInId, actor.tenantId);
        if (item.productId) {
          const { stockPieces } = await applyStockDelta(client, item.productId, actor.tenantId, -item.quantity, 0);
          await recordStockMovement(client, {
            tenantId: actor.tenantId,
            productId: item.productId,
            type: STOCK_MOVEMENT_TYPES.TRADE_IN_SALE,
            quantityIn: 0,
            quantityOut: item.quantity,
            balanceAfter: stockPieces,
            referenceType: "trade_in",
            referenceId: tradeInId,
            note: `Trade-in exchange sold: ${item.productName}`,
            createdById: actor.id,
            businessDate: tradeInDate,
          });
        }
      }

      await this.recordActivity(client, actor, {
        actionType: TRADE_IN_ACTIONS.CREATE,
        entityType: "trade_in",
        entityId: tradeInId,
        description: `${actor.name} created trade-in ${tradeInNumber} — received ${receivedItems.length} device(s), sold ${soldItems.length} device(s)`,
        metadata: { tradeInNumber, totalTradeInValue, totalSaleAmount, paymentAmount },
      });

      const result = await findTradeInById(client, tradeInId, actor.tenantId);
      return mapTradeIn(result.rows[0]);
    });
  }

  async removeTradeIn(id, actor, reason) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await softDeleteTradeIn(client, id, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });
      assert(result.rowCount > 0, "Trade-in not found.", 404);

      await this.recordActivity(client, actor, {
        actionType: TRADE_IN_ACTIONS.DELETE,
        entityType: "trade_in",
        entityId: id,
        description: `${actor.name} deleted trade-in ${id}${reason ? ` (${reason})` : ""}`,
      });

      return { ok: true };
    });
  }

  async listTrashed(query, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    return this.databaseManager.withClient(async (client) => {
      const [total, items] = await Promise.all([
        countTrashedTradeIns(client, actor.tenantId),
        listTrashedTradeIns(client, { tenantId: actor.tenantId, limit, offset }),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    });
  }
}
