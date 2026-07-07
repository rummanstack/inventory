import { assert } from "../lib/errors.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { normalizePurchaseReturn } from "../lib/normalizers.js";
import { STOCK_MOVEMENT_TYPES } from "../lib/stockMovements.js";
import { SUPPLIER_DUE_LEDGER_TYPES } from "../lib/supplierDueLedger.js";
import { PURCHASE_RETURN_ACTIONS } from "../lib/auditActions.js";
import { nextPurchaseReturnNumber } from "../lib/purchaseNumber.js";
import { findSupplierForUpdate, updateSupplierCurrentDue } from "../repositories/supplierRepository.js";
import { getLatestSupplierDueLedgerEntry } from "../repositories/supplierDueLedgerRepository.js";
import {
  countPurchaseReturns,
  findPurchaseReturnById,
  findPurchaseReturnForUpdate,
  getPurchaseReturnItems,
  insertPurchaseReturn,
  insertPurchaseReturnItem,
  listPurchaseReturnsPage,
  mapPurchaseReturn,
  softDeletePurchaseReturn,
} from "../repositories/purchaseReturnRepository.js";
import {
  logActivity,
  lockProducts,
  recordStockMovement,
  recordSupplierDueLedgerEntry,
  applyStockDelta,
  sumPiecesByProduct,
} from "./shared/inventoryHelpers.js";

const DATE_ERROR = "Return date must be in YYYY-MM-DD format.";

export class PurchaseReturnService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  async listPurchaseReturns(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const dateFrom = String(query.dateFrom || "").trim()
      ? normalizeIsoDate(query.dateFrom, query.dateFrom, DATE_ERROR)
      : undefined;
    const dateTo = String(query.dateTo || "").trim()
      ? normalizeIsoDate(query.dateTo, query.dateTo, DATE_ERROR)
      : undefined;

    const filters = {
      tenantId: actor.tenantId,
      supplierId: String(query.supplierId || "").trim() || undefined,
      dateFrom,
      dateTo,
    };

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listPurchaseReturnsPage(client, { ...filters, limit, offset }),
        countPurchaseReturns(client, filters),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async getPurchaseReturn(returnId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const result = await findPurchaseReturnById(client, returnId, actor.tenantId);
      assert(result.rowCount > 0, "Purchase return not found.", 404);
      return mapPurchaseReturn(result.rows[0]);
    });
  }

  async savePurchaseReturn(input, actor) {
    const base = normalizePurchaseReturn(input);
    base.tenantId = actor.tenantId;
    assert(base.supplierId, "Supplier is required.");
    assert(base.returnDate, "Return date is required.");
    assert(base.items.length > 0, "At least one product line item is required.");
    base.returnDate = normalizeIsoDate(base.returnDate, base.returnDate, DATE_ERROR);

    return this.databaseManager.withTransaction(async (client) => {
      const supplierResult = await findSupplierForUpdate(client, base.supplierId, actor.tenantId);
      assert(supplierResult.rowCount > 0, "Supplier not found.", 404);
      const supplier = supplierResult.rows[0];

      const productIds = base.items.map((item) => item.productId);
      const productMap = await lockProducts(client, productIds, actor.tenantId);

      // Returned quantities come out of sellable stock — a return can never
      // exceed what is physically on hand, summed across duplicate lines.
      const outByProduct = sumPiecesByProduct(base.items, "quantityPieces");
      for (const [productId, quantity] of outByProduct) {
        const product = productMap.get(productId);
        const available = Number(product.stock_pieces || 0);
        assert(
          quantity <= available,
          `${product.name} does not have enough stock to return (requested ${quantity}, in stock ${available}).`,
          400,
        );
      }

      for (const item of base.items) {
        const product = productMap.get(item.productId);
        item.productName = product.name;
        if (item.unitPrice === null) {
          item.unitPrice = Number(product.purchase_price || 0);
        }
        item.lineTotal = item.quantityPieces * item.unitPrice;
      }
      base.totalAmount = base.items.reduce((sum, item) => sum + item.lineTotal, 0);

      const year = new Date(base.returnDate).getUTCFullYear();
      const returnNumber = await nextPurchaseReturnNumber(client, actor.tenantId, year);

      await insertPurchaseReturn(client, {
        ...base,
        returnNumber,
        createdById: actor.id,
      });

      for (const item of base.items) {
        await insertPurchaseReturnItem(client, {
          id: item.id,
          tenantId: actor.tenantId,
          purchaseReturnId: base.id,
          productId: item.productId,
          productName: item.productName,
          quantityPieces: item.quantityPieces,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        });
      }

      for (const [productId, quantity] of outByProduct) {
        const nextBalance = await applyStockDelta(client, productId, actor.tenantId, -quantity, 0);
        await recordStockMovement(client, {
          tenantId: actor.tenantId,
          productId,
          type: STOCK_MOVEMENT_TYPES.PURCHASE_RETURN,
          quantityIn: 0,
          quantityOut: quantity,
          balanceAfter: nextBalance.stockPieces,
          referenceType: "purchase_return",
          referenceId: base.id,
          note: `Purchase return ${returnNumber} to ${supplier.name}`,
          createdById: actor.id,
          businessDate: base.returnDate,
        });
      }

      // Credit the supplier ledger. The balance is allowed to go negative:
      // a negative payable is an advance the supplier now holds for us.
      const latestEntry = await getLatestSupplierDueLedgerEntry(client, supplier.id, actor.tenantId);
      const currentBalance = latestEntry ? latestEntry.balanceAfter : Math.max(0, Number(supplier.opening_due || 0));
      const balanceAfter = currentBalance - base.totalAmount;

      await recordSupplierDueLedgerEntry(client, {
        tenantId: actor.tenantId,
        supplierId: supplier.id,
        type: SUPPLIER_DUE_LEDGER_TYPES.RETURN,
        debit: 0,
        credit: base.totalAmount,
        balanceAfter,
        referenceType: "purchase_return",
        referenceId: base.id,
        note: base.note || `Purchase return ${returnNumber}`,
        createdById: actor.id,
        businessDate: base.returnDate,
      });

      await updateSupplierCurrentDue(client, supplier.id, actor.tenantId, Math.max(0, balanceAfter));

      await this.recordActivity(client, actor, {
        actionType: PURCHASE_RETURN_ACTIONS.CREATE,
        entityType: "purchase_return",
        entityId: base.id,
        description: `${actor.name} recorded purchase return ${returnNumber} to ${supplier.name}`,
        metadata: {
          returnNumber,
          supplierId: supplier.id,
          totalAmount: base.totalAmount,
          balanceAfter,
        },
      });

      const fullResult = await findPurchaseReturnById(client, base.id, actor.tenantId);
      return mapPurchaseReturn(fullResult.rows[0]);
    });
  }

  async removePurchaseReturn(returnId, actor, reason) {
    assert(String(reason || "").trim(), "Delete reason is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findPurchaseReturnForUpdate(client, returnId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Purchase return not found.", 404);
      const purchaseReturn = existingResult.rows[0];
      const totalAmount = Number(purchaseReturn.total_amount || 0);

      const itemsResult = await getPurchaseReturnItems(client, returnId, actor.tenantId);
      const items = itemsResult.rows.map((row) => ({
        productId: row.product_id,
        productName: row.product_name,
        quantityPieces: Number(row.quantity_pieces || 0),
      }));

      await softDeletePurchaseReturn(client, returnId, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });

      // Reversal: the stock comes back in, and the supplier ledger is debited back.
      const inByProduct = sumPiecesByProduct(items, "quantityPieces");
      await lockProducts(client, [...inByProduct.keys()], actor.tenantId);
      for (const [productId, quantity] of inByProduct) {
        const nextBalance = await applyStockDelta(client, productId, actor.tenantId, quantity, 0);
        await recordStockMovement(client, {
          tenantId: actor.tenantId,
          productId,
          type: STOCK_MOVEMENT_TYPES.PURCHASE_RETURN,
          quantityIn: quantity,
          quantityOut: 0,
          balanceAfter: nextBalance.stockPieces,
          referenceType: "purchase_return",
          referenceId: returnId,
          note: `Purchase return ${purchaseReturn.return_number} reversed (${reason})`,
          createdById: actor.id,
          businessDate: String(purchaseReturn.return_date).slice(0, 10),
        });
      }

      await findSupplierForUpdate(client, purchaseReturn.supplier_id, actor.tenantId);
      const latestEntry = await getLatestSupplierDueLedgerEntry(client, purchaseReturn.supplier_id, actor.tenantId);
      const currentBalance = latestEntry ? latestEntry.balanceAfter : 0;
      const balanceAfter = currentBalance + totalAmount;

      await recordSupplierDueLedgerEntry(client, {
        tenantId: actor.tenantId,
        supplierId: purchaseReturn.supplier_id,
        type: SUPPLIER_DUE_LEDGER_TYPES.RETURN,
        debit: totalAmount,
        credit: 0,
        balanceAfter,
        referenceType: "purchase_return",
        referenceId: returnId,
        note: `Purchase return ${purchaseReturn.return_number} reversed — deleted (${reason})`,
        createdById: actor.id,
        businessDate: String(purchaseReturn.return_date).slice(0, 10),
      });

      await updateSupplierCurrentDue(client, purchaseReturn.supplier_id, actor.tenantId, Math.max(0, balanceAfter));

      await this.recordActivity(client, actor, {
        actionType: PURCHASE_RETURN_ACTIONS.DELETE,
        entityType: "purchase_return",
        entityId: returnId,
        reason,
        description: `${actor.name} deleted purchase return ${purchaseReturn.return_number} (${reason})`,
        metadata: { supplierId: purchaseReturn.supplier_id, totalAmount },
      });

      return { ok: true };
    });
  }
}
