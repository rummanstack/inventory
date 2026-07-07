import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { normalizeSalesReturn } from "../lib/normalizers.js";
import { STOCK_MOVEMENT_TYPES } from "../lib/stockMovements.js";
import { CUSTOMER_DUE_LEDGER_TYPES } from "../lib/customerDueLedger.js";
import { SALES_RETURN_ACTIONS } from "../lib/auditActions.js";
import { nextReturnNumber } from "../lib/salesNumber.js";
import { findRetailCustomerForUpdate, updateRetailCustomerCurrentDue, updateRetailCustomerLoyaltyBalance } from "../repositories/retailCustomerRepository.js";
import { getLatestCustomerDueLedgerEntry } from "../repositories/customerDueLedgerRepository.js";
import { findSalesInvoiceById, mapSalesInvoice } from "../repositories/salesInvoiceRepository.js";
import {
  countSalesReturns,
  findSalesReturnById,
  getSalesReturnReport,
  insertSalesReturn,
  insertSalesReturnItem,
  listSalesReturnsPage,
  mapSalesReturn,
  sumReturnedQuantitiesByInvoiceItem,
} from "../repositories/salesReturnRepository.js";
import { insertRetailLoyaltyLedgerEntry } from "../repositories/retailLoyaltyLedgerRepository.js";
import { findProductSerialsForUpdate, updateProductSerial, mapProductSerial } from "../repositories/productSerialRepository.js";
import { listSalesItemSerialsByInvoiceItem } from "../repositories/salesItemSerialRepository.js";
import { PRODUCT_SERIAL_STATUSES } from "../lib/productSerials.js";
import {
  logActivity,
  lockProducts,
  recordStockMovement,
  recordCustomerDueLedgerEntry,
  applyStockDelta,
} from "./shared/inventoryHelpers.js";
import { listSalesInvoiceItemBatchesByItem, incrementDrugBatch } from "../repositories/drugBatchRepository.js";

const DATE_ERROR = "Return date must be in YYYY-MM-DD format.";
const REFUND_METHODS = ["CASH", "DUE_ADJUSTMENT"];

function normalizeLoyaltyPoints(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

async function recordLoyaltyEntry(client, {
  tenantId,
  customerId,
  type,
  pointsDelta,
  balanceAfter,
  referenceType,
  referenceId,
  note,
  createdById,
  businessDate,
}) {
  await insertRetailLoyaltyLedgerEntry(client, {
    id: createId("loyalty-ledger"),
    tenantId,
    customerId,
    type,
    pointsDelta,
    balanceAfter,
    referenceType,
    referenceId,
    note,
    createdById,
    businessDate,
  });
  await updateRetailCustomerLoyaltyBalance(client, customerId, tenantId, balanceAfter);
}

// Restores drug_batches.quantity_remaining for a returned item.
// Uses the original batch allocations proportionally (FEFO order is maintained because
// the original insertion order is preserved and we restore soonest-expiry batch first).
async function restoreBatchAllocationsForItem(client, salesInvoiceItemId, tenantId, originalQty, returnedQty) {
  if (returnedQty <= 0) return;
  const allocs = await listSalesInvoiceItemBatchesByItem(client, salesInvoiceItemId, tenantId);
  if (!allocs.length) return;

  let remaining = returnedQty;
  for (const alloc of allocs) {
    if (remaining <= 0) break;
    // Proportional share of this batch: how much of the alloc to restore
    const proportion = alloc.quantityFromBatch / originalQty;
    const toRestore = Math.min(remaining, Math.round(proportion * returnedQty));
    if (toRestore > 0) {
      await incrementDrugBatch(client, alloc.drugBatchId, tenantId, toRestore);
      remaining -= toRestore;
    }
  }
  // Floating-point rounding edge: assign any leftover units to the last batch
  if (remaining > 0) {
    const last = allocs[allocs.length - 1];
    await incrementDrugBatch(client, last.drugBatchId, tenantId, remaining);
  }
}

function isSerialRequired(product) {
  return product?.serial_required === true || product?.serial_required === "t";
}

// Validates that every serial-required return line selected exactly the right number of
// serials, that each one was actually sold via the original invoice line being returned,
// and that no serial is reused across two return lines in the same request.
async function validateReturnSerialSelections(client, items, productMap, tenantId) {
  const usedSerialIds = new Set();
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!isSerialRequired(product)) {
      continue;
    }

    assert(
      item.serialIds.length === item.quantityPieces,
      `${item.productName} requires selecting ${item.quantityPieces} serial/IMEI number(s), but ${item.serialIds.length} were selected.`,
    );

    const soldSerials = await listSalesItemSerialsByInvoiceItem(client, item.salesInvoiceItemId, tenantId);
    const soldSerialIds = new Set(soldSerials.map((link) => link.productSerialId));

    for (const serialId of item.serialIds) {
      assert(!usedSerialIds.has(serialId), "The same serial/IMEI was selected more than once in this return.");
      usedSerialIds.add(serialId);
      assert(soldSerialIds.has(serialId), "A selected serial/IMEI was not sold on this invoice line.");
    }
  }
}

// Locks and updates the product_serials rows for every serial-required return line,
// moving each one to IN_STOCK, DAMAGED, or WARRANTY depending on the reported condition.
async function processReturnedSerials(client, items, productMap, tenantId) {
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!isSerialRequired(product) || !item.serialIds.length) {
      continue;
    }

    const lockedResult = await findProductSerialsForUpdate(client, item.serialIds, tenantId);
    assert(lockedResult.rowCount === item.serialIds.length, "One or more selected serial/IMEI numbers could not be found.");

    const nextStatus = item.condition === "DAMAGED"
      ? PRODUCT_SERIAL_STATUSES.DAMAGED
      : item.condition === "WARRANTY"
        ? PRODUCT_SERIAL_STATUSES.WARRANTY
        : PRODUCT_SERIAL_STATUSES.IN_STOCK;

    for (const row of lockedResult.rows) {
      assert(row.product_id === item.productId, "A selected serial/IMEI does not belong to this product.");
      assert(row.status === PRODUCT_SERIAL_STATUSES.SOLD, `Serial/IMEI "${row.serial_number || row.imei1}" was already returned or is not currently sold.`);

      const serial = mapProductSerial(row);
      await updateProductSerial(client, { ...serial, tenantId, status: nextStatus });
    }
  }
}

export class SalesReturnService {
  constructor(databaseManager, { auditService, financeAccountService, journalService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.financeAccountService = financeAccountService;
    this.journalService = journalService;
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
      base.loyaltyPointsAdjustment = 0;

      const productIds = base.items.map((item) => item.productId);
      const productMap = await lockProducts(client, productIds, actor.tenantId);
      for (const item of base.items) {
        const product = productMap.get(item.productId);
        assert(product?.refundable !== false, `${item.productName} is marked non-refundable.`, 400);
      }

      await validateReturnSerialSelections(client, base.items, productMap, actor.tenantId);

      const year = new Date(base.returnDate).getUTCFullYear();
      const returnNumber = await nextReturnNumber(client, actor.tenantId, year);

      // GOOD goes back to sellable stock; DAMAGED goes to damaged stock instead (its own
      // counter and movement type, mirroring how settlementService.js already records damage);
      // WARRANTY changes no stock counters at all (in limbo pending a warranty claim, Phase 10).
      for (const item of base.items) {
        if (item.condition === "WARRANTY") {
          continue;
        }

        const isDamaged = item.condition === "DAMAGED";
        const nextBalance = await applyStockDelta(
          client,
          item.productId,
          actor.tenantId,
          isDamaged ? 0 : item.quantityPieces,
          isDamaged ? item.quantityPieces : 0,
        );

        // Restore drug batch quantities for GOOD returns only — damaged stock is
        // not put back into sellable batches.
        if (!isDamaged) {
          const invoiceItem = invoiceItemsById.get(item.salesInvoiceItemId);
          await restoreBatchAllocationsForItem(
            client,
            item.salesInvoiceItemId,
            actor.tenantId,
            invoiceItem.quantityPieces,
            item.quantityPieces,
          );
        }

        await recordStockMovement(client, {
          tenantId: actor.tenantId,
          productId: item.productId,
          type: isDamaged ? STOCK_MOVEMENT_TYPES.DAMAGE : STOCK_MOVEMENT_TYPES.SALES_RETURN,
          quantityIn: item.quantityPieces,
          quantityOut: 0,
          balanceAfter: isDamaged ? nextBalance.damagedPieces : nextBalance.stockPieces,
          referenceType: "sales_return",
          referenceId: base.id,
          note: `Sales return ${returnNumber}${isDamaged ? " (damaged)" : ""}`,
          createdById: actor.id,
          businessDate: base.returnDate,
        });
      }

      await processReturnedSerials(client, base.items, productMap, actor.tenantId);

      const originalTotalAmount = Math.max(0, Number(invoice.totalAmount || 0));
      const returnRatio = originalTotalAmount > 0 ? Math.min(1, base.totalAmount / originalTotalAmount) : 0;
      const originalEarnedPoints = normalizeLoyaltyPoints(invoice.loyaltyPointsEarned);
      const originalRedeemedPoints = normalizeLoyaltyPoints(invoice.loyaltyPointsRedeemed);
      const loyaltyPointsAdjustment = Math.round((originalRedeemedPoints - originalEarnedPoints) * returnRatio);
      if (invoice.customerId && loyaltyPointsAdjustment !== 0) {
        const customerResult = await findRetailCustomerForUpdate(client, invoice.customerId, actor.tenantId);
        assert(customerResult.rowCount > 0, "Customer not found.", 404);
        const customer = customerResult.rows[0];
        const currentBalance = Math.max(0, Number(customer.loyalty_points_balance || 0));
        const balanceAfter = Math.max(0, currentBalance + loyaltyPointsAdjustment);
        base.loyaltyPointsAdjustment = loyaltyPointsAdjustment;

        await recordLoyaltyEntry(client, {
          tenantId: actor.tenantId,
          customerId: customer.id,
          type: "RETURN",
          pointsDelta: loyaltyPointsAdjustment,
          balanceAfter,
          referenceType: "sales_return",
          referenceId: base.id,
          note: `Loyalty adjustment for sales return ${returnNumber}`,
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
          condition: item.condition,
        });
      }

      let customer = null;
      let dueAdjustmentOverflow = 0;
      if (base.customerId && base.refundMethod === "DUE_ADJUSTMENT") {
        const customerResult = await findRetailCustomerForUpdate(client, base.customerId, actor.tenantId);
        assert(customerResult.rowCount > 0, "Customer not found.", 404);
        customer = customerResult.rows[0];

        const latestEntry = await getLatestCustomerDueLedgerEntry(client, customer.id, actor.tenantId);
        const currentBalance = latestEntry ? latestEntry.balanceAfter : Math.max(0, Number(customer.opening_due || 0));
        // The return value can exceed what the customer still owes (e.g. they already part-paid
        // the original sale). Whatever doesn't fit against the due is an overpayment owed back
        // to the customer, so it's floored at 0 here and paid out as cash below instead of being
        // silently lost to a negative due that nothing ever surfaces or refunds.
        const balanceAfter = Math.max(0, currentBalance - base.totalAmount);
        dueAdjustmentOverflow = Math.max(0, base.totalAmount - currentBalance);

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

        await updateRetailCustomerCurrentDue(client, customer.id, actor.tenantId, balanceAfter);
      }

      const cashRefundAmount = base.refundMethod === "CASH" ? base.totalAmount : dueAdjustmentOverflow;
      if (cashRefundAmount > 0 && this.financeAccountService) {
        await this.financeAccountService.recordTransactionInClient(
          client,
          {
            accountType: "CASH",
            type: "WITHDRAWAL",
            amount: cashRefundAmount,
            date: base.returnDate,
            note: dueAdjustmentOverflow > 0
              ? `Cash refund (overpaid return) for sales return ${returnNumber}`
              : `Cash refund for sales return ${returnNumber}`,
          },
          actor,
        );
      }

      if (this.journalService) {
        const dueAdjustmentAmount = base.customerId && base.refundMethod === "DUE_ADJUSTMENT"
          ? base.totalAmount - dueAdjustmentOverflow
          : 0;
        const costAmount = base.items.reduce((sum, item) => sum + item.costPriceSnapshot * item.quantityPieces, 0);
        await this.journalService.postSalesReturn(client, actor, {
          returnId: base.id,
          returnDate: base.returnDate,
          returnNumber,
          totalAmount: base.totalAmount,
          costAmount,
          dueAdjustmentAmount,
          cashRefundAmount,
        });
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
          loyaltyPointsAdjustment: base.loyaltyPointsAdjustment,
        },
      });

      const fullResult = await findSalesReturnById(client, base.id, actor.tenantId);
      return mapSalesReturn(fullResult.rows[0]);
    });
  }

  async getSalesReturnReport(query = {}, actor) {
    const dateFrom = String(query.dateFrom || "").trim() || undefined;
    const dateTo = String(query.dateTo || "").trim() || undefined;
    return this.databaseManager.withClient(async (client) => {
      const rows = await getSalesReturnReport(client, { tenantId: actor.tenantId, dateFrom, dateTo });
      return { rows, dateFrom: dateFrom || null, dateTo: dateTo || null };
    });
  }
}
