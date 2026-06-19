import { assert } from "../lib/errors.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { normalizeSalesReturn } from "../lib/normalizers.js";
import { STOCK_MOVEMENT_TYPES } from "../lib/stockMovements.js";
import { CUSTOMER_DUE_LEDGER_TYPES } from "../lib/customerDueLedger.js";
import { SALES_RETURN_ACTIONS } from "../lib/auditActions.js";
import { nextReturnNumber } from "../lib/salesNumber.js";
import { findRetailCustomerForUpdate, updateRetailCustomerCurrentDue } from "../repositories/retailCustomerRepository.js";
import { getLatestCustomerDueLedgerEntry } from "../repositories/customerDueLedgerRepository.js";
import { findSalesInvoiceById, mapSalesInvoice } from "../repositories/salesInvoiceRepository.js";
import {
  countSalesReturns,
  findSalesReturnById,
  insertSalesReturn,
  insertSalesReturnItem,
  listSalesReturnsPage,
  mapSalesReturn,
  sumReturnedQuantitiesByInvoiceItem,
} from "../repositories/salesReturnRepository.js";
import {
  logActivity,
  lockProducts,
  recordStockMovement,
  recordCustomerDueLedgerEntry,
  applyStockDelta,
} from "./shared/inventoryHelpers.js";

const DATE_ERROR = "Return date must be in YYYY-MM-DD format.";
const REFUND_METHODS = ["CASH", "DUE_ADJUSTMENT"];

export class SalesReturnService {
  constructor(databaseManager, { auditService, financeAccountService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.financeAccountService = financeAccountService;
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
    assert(base.salesInvoiceId, "The original invoice is required for a return.");
    base.returnDate = normalizeIsoDate(base.returnDate, base.returnDate, DATE_ERROR);

    return this.databaseManager.withTransaction(async (client) => {
      const invoiceResult = await findSalesInvoiceById(client, base.salesInvoiceId, actor.tenantId);
      assert(invoiceResult.rowCount > 0, "Original sales invoice not found.", 404);
      const invoice = mapSalesInvoice(invoiceResult.rows[0]);
      base.refundMethod = REFUND_METHODS.includes(base.refundMethod) ? base.refundMethod : "DUE_ADJUSTMENT";
      if (!input.refundMethod) {
        base.refundMethod = Number(invoice.dueAmount || 0) > 0 ? "DUE_ADJUSTMENT" : "CASH";
      }
      const invoiceItemsById = new Map(invoice.items.map((item) => [item.id, item]));
      assert(
        base.refundMethod === "DUE_ADJUSTMENT" || Number(invoice.dueAmount || 0) === 0,
        "Cash refund is only allowed for fully paid sales.",
        400,
      );

      // Never trust client-supplied product/price/cost or invoice linkage — only the
      // amount actually requested per original invoice line is taken from the client.
      const requestedByInvoiceItem = new Map();
      for (const item of base.items) {
        assert(item.salesInvoiceItemId, "Each return line must reference the original invoice item.");
        const invoiceItem = invoiceItemsById.get(item.salesInvoiceItemId);
        assert(invoiceItem, "Returned item does not match the original invoice.", 400);

        requestedByInvoiceItem.set(
          item.salesInvoiceItemId,
          (requestedByInvoiceItem.get(item.salesInvoiceItemId) || 0) + item.quantityPieces,
        );

        item.productId = invoiceItem.productId;
        item.productName = invoiceItem.productName;
        item.actualSalePrice = invoiceItem.actualSalePrice;
        item.costPriceSnapshot = invoiceItem.costPriceSnapshot;
        item.lineTotal = item.quantityPieces * invoiceItem.actualSalePrice;
      }

      const alreadyReturned = await sumReturnedQuantitiesByInvoiceItem(
        client,
        [...requestedByInvoiceItem.keys()],
        actor.tenantId,
      );

      for (const [salesInvoiceItemId, requestedQuantity] of requestedByInvoiceItem) {
        const invoiceItem = invoiceItemsById.get(salesInvoiceItemId);
        const returnedSoFar = alreadyReturned.get(salesInvoiceItemId) || 0;
        const remaining = invoiceItem.quantityPieces - returnedSoFar;
        assert(
          requestedQuantity <= remaining,
          `Cannot return ${requestedQuantity} of ${invoiceItem.productName}; only ${Math.max(0, remaining)} remaining to return (sold ${invoiceItem.quantityPieces}, already returned ${returnedSoFar}).`,
          400,
        );
      }

      // Recompute totals from the now server-verified item data, not the client's first pass.
      base.totalAmount = base.items.reduce((sum, item) => sum + item.lineTotal, 0);
      base.totalProfitAdjustment = base.items.reduce(
        (sum, item) => sum + (item.actualSalePrice - item.costPriceSnapshot) * item.quantityPieces,
        0,
      );
      base.customerId = invoice.customerId;

      const productIds = base.items.map((item) => item.productId);
      await lockProducts(client, productIds, actor.tenantId);

      const year = new Date(base.returnDate).getUTCFullYear();
      const returnNumber = await nextReturnNumber(client, actor.tenantId, year);

      for (const item of base.items) {
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
          businessDate: base.returnDate,
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
      if (base.customerId && base.refundMethod === "DUE_ADJUSTMENT") {
        const customerResult = await findRetailCustomerForUpdate(client, base.customerId, actor.tenantId);
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
          businessDate: base.returnDate,
        });

        await updateRetailCustomerCurrentDue(client, customer.id, actor.tenantId, Math.max(0, balanceAfter));
      }

      if (base.refundMethod === "CASH" && base.totalAmount > 0 && this.financeAccountService) {
        await this.financeAccountService.recordTransactionInClient(
          client,
          {
            accountType: "CASH",
            type: "WITHDRAWAL",
            amount: base.totalAmount,
            date: base.returnDate,
            note: `Cash refund for sales return ${returnNumber}`,
          },
          actor,
        );
      }

      await this.recordActivity(client, actor, {
        actionType: SALES_RETURN_ACTIONS.CREATE,
        entityType: "sales_return",
        entityId: base.id,
        description: `${actor.name} recorded sales return ${returnNumber}${customer ? ` from ${customer.name}` : ""}`,
        metadata: {
          returnNumber,
          salesInvoiceId: base.salesInvoiceId,
          customerId: base.customerId,
          refundMethod: base.refundMethod,
          totalAmount: base.totalAmount,
          totalProfitAdjustment,
        },
      });

      const fullResult = await findSalesReturnById(client, base.id, actor.tenantId);
      return mapSalesReturn(fullResult.rows[0]);
    });
  }
}
