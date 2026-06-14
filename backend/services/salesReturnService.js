import { assert } from "../lib/errors.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { normalizeSalesReturn } from "../lib/normalizers.js";
import { STOCK_MOVEMENT_TYPES } from "../lib/stockMovements.js";
import { CUSTOMER_DUE_LEDGER_TYPES } from "../lib/customerDueLedger.js";
import { SALES_RETURN_ACTIONS } from "../lib/auditActions.js";
import { nextReturnNumber } from "../lib/salesNumber.js";
import { findCustomerById, updateCustomerCurrentDue } from "../repositories/customerRepository.js";
import { getLatestCustomerDueLedgerEntry } from "../repositories/customerDueLedgerRepository.js";
import {
  countSalesReturns,
  findSalesReturnById,
  insertSalesReturn,
  insertSalesReturnItem,
  listSalesReturnsPage,
  mapSalesReturn,
} from "../repositories/salesReturnRepository.js";
import {
  logActivity,
  lockProducts,
  recordStockMovement,
  recordCustomerDueLedgerEntry,
  applyStockDelta,
} from "./shared/inventoryHelpers.js";

const DATE_ERROR = "Return date must be in YYYY-MM-DD format.";

export class SalesReturnService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  async listSalesReturns(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const dateFrom = String(query.dateFrom || "").trim()
      ? normalizeIsoDate(query.dateFrom, query.dateFrom, DATE_ERROR)
      : undefined;
    const dateTo = String(query.dateTo || "").trim()
      ? normalizeIsoDate(query.dateTo, query.dateTo, DATE_ERROR)
      : undefined;

    const filters = {
      tenantId: actor.tenantId,
      customerId: String(query.customerId || "").trim() || undefined,
      salesInvoiceId: String(query.salesInvoiceId || "").trim() || undefined,
      dateFrom,
      dateTo,
    };

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listSalesReturnsPage(client, { ...filters, limit, offset }),
        countSalesReturns(client, filters),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async getSalesReturn(returnId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const result = await findSalesReturnById(client, returnId, actor.tenantId);
      assert(result.rowCount > 0, "Sales return not found.", 404);
      return mapSalesReturn(result.rows[0]);
    });
  }

  async saveSalesReturn(input, actor) {
    const base = normalizeSalesReturn(input);
    base.tenantId = actor.tenantId;
    assert(base.items.length > 0, "At least one product line item is required.");
    assert(base.returnDate, "Return date is required.");
    base.returnDate = normalizeIsoDate(base.returnDate, base.returnDate, DATE_ERROR);

    return this.databaseManager.withTransaction(async (client) => {
      const productIds = base.items.map((item) => item.productId);
      const productMap = await lockProducts(client, productIds, actor.tenantId);

      const year = new Date(base.returnDate).getUTCFullYear();
      const returnNumber = await nextReturnNumber(client, actor.tenantId, year);

      for (const item of base.items) {
        const product = productMap.get(item.productId);
        item.productName = item.productName || product.name;
        const nextBalance = await applyStockDelta(client, item.productId, actor.tenantId, item.quantityPieces, 0);
        await recordStockMovement(client, {
          tenantId: actor.tenantId,
          productId: item.productId,
          type: STOCK_MOVEMENT_TYPES.SALES_RETURN,
          quantityIn: item.quantityPieces,
          quantityOut: 0,
          balanceAfter: nextBalance.stockPieces,
          referenceType: "sales_return",
          referenceId: base.id,
          note: `Sales return ${returnNumber}`,
          createdById: actor.id,
        });
      }

      const totalProfitAdjustment = -base.totalProfitAdjustment;

      await insertSalesReturn(client, {
        ...base,
        returnNumber,
        totalProfitAdjustment,
        createdById: actor.id,
      });

      for (const item of base.items) {
        await insertSalesReturnItem(client, {
          id: item.id,
          tenantId: actor.tenantId,
          salesReturnId: base.id,
          salesInvoiceItemId: item.salesInvoiceItemId,
          productId: item.productId,
          productName: item.productName,
          quantityPieces: item.quantityPieces,
          actualSalePrice: item.actualSalePrice,
          costPriceSnapshot: item.costPriceSnapshot,
          lineTotal: item.lineTotal,
        });
      }

      let customer = null;
      if (base.customerId) {
        const customerResult = await findCustomerById(client, base.customerId, actor.tenantId);
        assert(customerResult.rowCount > 0, "Customer not found.", 404);
        customer = customerResult.rows[0];

        const latestEntry = await getLatestCustomerDueLedgerEntry(client, customer.id, actor.tenantId);
        const currentBalance = latestEntry ? latestEntry.balanceAfter : Math.max(0, Number(customer.opening_due || 0));
        const balanceAfter = currentBalance - base.totalAmount;

        await recordCustomerDueLedgerEntry(client, {
          tenantId: actor.tenantId,
          customerId: customer.id,
          type: CUSTOMER_DUE_LEDGER_TYPES.RETURN_ADJUSTMENT,
          debit: 0,
          credit: base.totalAmount,
          balanceAfter,
          referenceType: "sales_return",
          referenceId: base.id,
          note: `Sales return ${returnNumber}`,
          createdById: actor.id,
        });

        await updateCustomerCurrentDue(client, customer.id, actor.tenantId, Math.max(0, balanceAfter));
      }

      await this.recordActivity(client, actor, {
        actionType: SALES_RETURN_ACTIONS.CREATE,
        entityType: "sales_return",
        entityId: base.id,
        description: `${actor.name} recorded sales return ${returnNumber}${customer ? ` from ${customer.shop_name}` : ""}`,
        metadata: {
          returnNumber,
          salesInvoiceId: base.salesInvoiceId,
          customerId: base.customerId,
          totalAmount: base.totalAmount,
          totalProfitAdjustment,
        },
      });

      const fullResult = await findSalesReturnById(client, base.id, actor.tenantId);
      return mapSalesReturn(fullResult.rows[0]);
    });
  }
}
