import { assert } from "../lib/errors.js";
import { diffFields } from "../lib/auditDiff.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { normalizePurchaseReceipt, cleanMoney } from "../lib/normalizers.js";
import { STOCK_MOVEMENT_TYPES } from "../lib/stockMovements.js";
import { SUPPLIER_DUE_LEDGER_TYPES } from "../lib/supplierDueLedger.js";
import { PURCHASE_ACTIONS } from "../lib/auditActions.js";
import { nextPurchaseNumber } from "../lib/purchaseNumber.js";
import { findSupplierForUpdate, updateSupplierCurrentDue } from "../repositories/supplierRepository.js";
import {
  getLatestSupplierDueLedgerEntry,
  getFirstSupplierDueLedgerEntryForReference,
} from "../repositories/supplierDueLedgerRepository.js";
import { findTenantById } from "../repositories/tenantRepository.js";
import {
  countPurchaseReceipts,
  countTrashedPurchaseReceipts,
  deletePurchaseReceiptItems,
  findPurchaseReceiptById,
  findPurchaseReceiptForUpdate,
  getPurchaseReceiptItems,
  insertPurchaseReceipt,
  insertPurchaseReceiptItem,
  listPurchaseReceiptsPage,
  listTrashedPurchaseReceipts,
  mapPurchaseReceipt,
  restorePurchaseReceipt,
  softDeletePurchaseReceipt,
  updatePurchaseReceipt,
} from "../repositories/purchaseReceiptRepository.js";
import {
  logActivity,
  lockProducts,
  recordStockMovement,
  recordSupplierDueLedgerEntry,
  applyStockDelta,
  updateProductPurchasePrice,
} from "./shared/inventoryHelpers.js";

const DATE_ERROR = "Purchase date must be in YYYY-MM-DD format.";

function sumPurchasePiecesByProduct(items) {
  return items.reduce((map, item) => {
    const current = map.get(item.productId) || 0;
    map.set(item.productId, current + Number(item.quantityPieces || 0));
    return map;
  }, new Map());
}

async function applyPurchaseInventoryDelta(client, previousItems, nextItems, tenantId, movementContext = {}) {
  const previousTotals = sumPurchasePiecesByProduct(previousItems);
  const nextTotals = sumPurchasePiecesByProduct(nextItems);
  const productIds = [...new Set([...previousTotals.keys(), ...nextTotals.keys()].filter(Boolean))];

  if (!productIds.length) {
    return;
  }

  const productMap = await lockProducts(client, productIds, tenantId);

  for (const productId of productIds) {
    const previousQty = previousTotals.get(productId) || 0;
    const nextQty = nextTotals.get(productId) || 0;
    const difference = nextQty - previousQty;
    const product = productMap.get(productId);

    if (difference < 0) {
      assert(
        Number(product.stock_pieces || 0) >= Math.abs(difference),
        `${product.name} does not have enough available stock for this purchase change.`,
      );
    }

    if (difference !== 0) {
      const nextBalance = await applyStockDelta(client, productId, tenantId, difference, 0);
      await recordStockMovement(client, {
        tenantId,
        productId,
        type: STOCK_MOVEMENT_TYPES.PURCHASE_RECEIVE,
        quantityIn: difference > 0 ? difference : 0,
        quantityOut: difference < 0 ? Math.abs(difference) : 0,
        balanceAfter: nextBalance.stockPieces,
        referenceType: "purchase_receipt",
        referenceId: movementContext.referenceId,
        note: movementContext.note || "Purchase receive stock movement",
        createdById: movementContext.createdById,
        businessDate: movementContext.businessDate,
      });
    }

    // Always update purchase price to the latest cost for products present in the new items.
    const nextItem = nextItems.find((item) => item.productId === productId);
    if (nextItem) {
      await updateProductPurchasePrice(client, productId, tenantId, nextItem.purchasePrice);
    }
  }
}

function getDueLedgerChange(entry) {
  return Number(entry.debit || 0) - Number(entry.credit || 0);
}

async function getSupplierBaselineBeforePurchase(client, previousPurchase, tenantId) {
  const firstEntry = await getFirstSupplierDueLedgerEntryForReference(client, {
    tenantId,
    supplierId: previousPurchase.supplier_id,
    referenceType: "purchase_receipt",
    referenceId: previousPurchase.id,
  });

  if (!firstEntry) {
    return null;
  }

  return Math.max(0, cleanMoney(firstEntry.balanceAfter) - getDueLedgerChange(firstEntry));
}

async function seedOpeningSupplierLedgerIfNeeded(client, supplier, tenantId, actor, businessDate) {
  const existingEntry = await getLatestSupplierDueLedgerEntry(client, supplier.id, tenantId);
  if (existingEntry) {
    return existingEntry.balanceAfter;
  }

  const openingDue = Math.max(0, cleanMoney(supplier.opening_due));
  if (openingDue > 0) {
    await recordSupplierDueLedgerEntry(client, {
      tenantId,
      supplierId: supplier.id,
      type: SUPPLIER_DUE_LEDGER_TYPES.OPENING,
      debit: openingDue,
      credit: 0,
      balanceAfter: openingDue,
      referenceType: "supplier_opening",
      referenceId: supplier.id,
      note: `Opening due for ${supplier.name}`,
      createdById: actor.id,
      businessDate,
    });
    return openingDue;
  }

  return 0;
}

export class PurchaseReceiveService {
  constructor(databaseManager, { auditService, financeAccountService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.financeAccountService = financeAccountService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  async listPurchaseReceipts(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const dateFrom = String(query.dateFrom || "").trim()
      ? normalizeIsoDate(query.dateFrom, query.dateFrom, DATE_ERROR)
      : undefined;
    const dateTo = String(query.dateTo || "").trim()
      ? normalizeIsoDate(query.dateTo, query.dateTo, DATE_ERROR)
      : undefined;

    const filters = {
      tenantId: actor.tenantId,
      search: String(query.search || "").trim() || undefined,
      supplierId: String(query.supplierId || "").trim() || undefined,
      purchaseNumber: String(query.purchaseNumber || "").trim() || undefined,
      supplierInvoiceNo: String(query.supplierInvoiceNo || "").trim() || undefined,
      paymentStatus: ["PAID", "PARTIAL", "DUE"].includes(query.paymentStatus) ? query.paymentStatus : undefined,
      dateFrom,
      dateTo,
    };

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listPurchaseReceiptsPage(client, { ...filters, limit, offset }),
        countPurchaseReceipts(client, filters),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async getPurchaseReceipt(purchaseId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const result = await findPurchaseReceiptById(client, purchaseId, actor.tenantId);
      assert(result.rowCount > 0, "Purchase receipt not found.", 404);
      return mapPurchaseReceipt(result.rows[0]);
    });
  }

  async savePurchaseReceipt(input, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const taxRate = input.id
        ? input.taxRate
        : ((await findTenantById(client, actor.tenantId))?.taxRate ?? 0);
      const base = normalizePurchaseReceipt({ ...input, taxRate });
      base.tenantId = actor.tenantId;
      assert(base.supplierId, "Supplier is required.");
      assert(base.purchaseDate, "Purchase date is required.");
      base.purchaseDate = normalizeIsoDate(base.purchaseDate, base.purchaseDate, DATE_ERROR);
      assert(base.items.length > 0, "At least one product line item is required.");

      if (input.id) {
        return this.updatePurchaseReceiptRecord(client, base, input, actor);
      }

      return this.createPurchaseReceiptRecord(client, base, actor);
    });
  }

  async createPurchaseReceiptRecord(client, base, actor) {
    const supplierResult = await findSupplierForUpdate(client, base.supplierId, actor.tenantId);
    assert(supplierResult.rowCount > 0, "Supplier not found.", 404);
    const supplier = supplierResult.rows[0];

    const year = new Date(base.purchaseDate).getUTCFullYear();
    const purchaseNumber = await nextPurchaseNumber(client, actor.tenantId, year);

    await applyPurchaseInventoryDelta(client, [], base.items, actor.tenantId, {
      referenceId: base.id,
      createdById: actor.id,
      note: `Purchase receive ${purchaseNumber} created`,
      businessDate: base.purchaseDate,
    });

    const insertResult = await insertPurchaseReceipt(client, {
      ...base,
      purchaseNumber,
      createdById: actor.id,
    });

    for (const item of base.items) {
      await insertPurchaseReceiptItem(client, {
        id: item.id,
        tenantId: actor.tenantId,
        purchaseReceiptId: base.id,
        productId: item.productId,
        quantityPieces: item.quantityPieces,
        purchasePrice: item.purchasePrice,
        lineDiscount: item.lineDiscount,
        lineTotal: item.lineTotal,
      });
    }

    // Seed OPENING ledger entry on first-ever entry for this supplier.
    let currentBalance = await seedOpeningSupplierLedgerIfNeeded(client, supplier, actor.tenantId, actor, base.purchaseDate);

    if (base.totalAmount > 0) {
      currentBalance += base.totalAmount;
      await recordSupplierDueLedgerEntry(client, {
        tenantId: actor.tenantId,
        supplierId: supplier.id,
        type: SUPPLIER_DUE_LEDGER_TYPES.PURCHASE_DUE,
        debit: base.totalAmount,
        credit: 0,
        balanceAfter: currentBalance,
        referenceType: "purchase_receipt",
        referenceId: base.id,
        note: `Purchase due for ${purchaseNumber}`,
        createdById: actor.id,
        businessDate: base.purchaseDate,
      });
    }

    if (base.paidAmount > 0) {
      currentBalance -= base.paidAmount;
      await recordSupplierDueLedgerEntry(client, {
        tenantId: actor.tenantId,
        supplierId: supplier.id,
        type: SUPPLIER_DUE_LEDGER_TYPES.PAYMENT,
        debit: 0,
        credit: base.paidAmount,
        balanceAfter: currentBalance,
        referenceType: "purchase_receipt",
        referenceId: base.id,
        note: `Payment made with purchase ${purchaseNumber}`,
        createdById: actor.id,
        businessDate: base.purchaseDate,
      });
    }

    await updateSupplierCurrentDue(client, supplier.id, actor.tenantId, Math.max(0, currentBalance));

    if (this.financeAccountService && base.paidAmount > 0) {
      await this.financeAccountService.recordTransactionInClient(
        client,
        {
          accountType: "CASH",
          type: "WITHDRAWAL",
          amount: base.paidAmount,
          date: base.purchaseDate,
          note: `Purchase ${purchaseNumber} — ${supplier.name}`,
        },
        actor,
      );
    }

    await this.recordActivity(client, actor, {
      actionType: PURCHASE_ACTIONS.CREATE,
      entityType: "purchase_receipt",
      entityId: base.id,
      description: `${actor.name} recorded purchase ${purchaseNumber} from ${supplier.name}`,
      metadata: {
        purchaseNumber,
        supplierId: supplier.id,
        taxRate: base.taxRate,
        taxAmount: base.taxAmount,
        totalAmount: base.totalAmount,
        dueAmount: base.dueAmount,
      },
    });

    const fullResult = await findPurchaseReceiptById(client, base.id, actor.tenantId);
    return mapPurchaseReceipt(fullResult.rows[0]);
  }

  async updatePurchaseReceiptRecord(client, base, input, actor) {
    assert(String(input.reason || "").trim(), "Edit reason is required.", 400);

    const existingResult = await findPurchaseReceiptForUpdate(client, base.id, actor.tenantId);
    assert(existingResult.rowCount > 0, "Purchase receipt not found.", 404);
    const previousPurchase = existingResult.rows[0];

    assert(
      String(previousPurchase.supplier_id) === base.supplierId,
      "Supplier cannot be changed after the purchase is recorded.",
    );

    const supplierResult = await findSupplierForUpdate(client, base.supplierId, actor.tenantId);
    assert(supplierResult.rowCount > 0, "Supplier not found.", 404);
    const supplier = supplierResult.rows[0];

    const itemsResult = await client.query(
      `SELECT product_id, quantity_pieces, purchase_price, line_discount, line_total FROM purchase_receipt_items WHERE purchase_receipt_id = $1`,
      [base.id],
    );
    const previousItems = itemsResult.rows.map((row) => ({
      productId: row.product_id,
      quantityPieces: Number(row.quantity_pieces || 0),
      purchasePrice: Number(row.purchase_price || 0),
      lineDiscount: Number(row.line_discount || 0),
      lineTotal: Number(row.line_total || 0),
    }));

    await applyPurchaseInventoryDelta(client, previousItems, base.items, actor.tenantId, {
      referenceId: base.id,
      createdById: actor.id,
      note: `Purchase receive ${previousPurchase.purchase_number} updated`,
      businessDate: base.purchaseDate,
    });

    await deletePurchaseReceiptItems(client, base.id);
    for (const item of base.items) {
      await insertPurchaseReceiptItem(client, {
        id: item.id,
        tenantId: actor.tenantId,
        purchaseReceiptId: base.id,
        productId: item.productId,
        quantityPieces: item.quantityPieces,
        purchasePrice: item.purchasePrice,
        lineDiscount: item.lineDiscount,
        lineTotal: item.lineTotal,
      });
    }

    const updateResult = await updatePurchaseReceipt(client, { ...base, purchaseNumber: previousPurchase.purchase_number });

    // Compute delta-based ledger changes.
    const oldTotal = Number(previousPurchase.total_amount || 0);
    const oldPaid = Number(previousPurchase.paid_amount || 0);
    const oldDue = Number(previousPurchase.due_amount || 0);
    const newTotal = base.totalAmount;
    const newPaid = base.paidAmount;
    const newDue = base.dueAmount;

    const previousBaseline = await getSupplierBaselineBeforePurchase(client, previousPurchase, actor.tenantId);
    const latestEntry = await getLatestSupplierDueLedgerEntry(client, supplier.id, actor.tenantId);
    let currentBalance;
    if (latestEntry) {
      currentBalance = latestEntry.balanceAfter;
    } else if (previousBaseline !== null) {
      currentBalance = previousBaseline + oldTotal - oldPaid;
    } else {
      currentBalance = Math.max(0, cleanMoney(supplier.opening_due));
    }

    const totalDelta = newTotal - oldTotal;
    const paidDelta = newPaid - oldPaid;

    if (totalDelta !== 0) {
      currentBalance += totalDelta;
      await recordSupplierDueLedgerEntry(client, {
        tenantId: actor.tenantId,
        supplierId: supplier.id,
        type: SUPPLIER_DUE_LEDGER_TYPES.PURCHASE_DUE,
        debit: Math.max(0, totalDelta),
        credit: Math.max(0, -totalDelta),
        balanceAfter: currentBalance,
        referenceType: "purchase_receipt",
        referenceId: base.id,
        note: `Purchase due adjusted for ${previousPurchase.purchase_number}`,
        createdById: actor.id,
        businessDate: base.purchaseDate,
      });
    }

    if (paidDelta !== 0) {
      currentBalance -= paidDelta;
      await recordSupplierDueLedgerEntry(client, {
        tenantId: actor.tenantId,
        supplierId: supplier.id,
        type: SUPPLIER_DUE_LEDGER_TYPES.PAYMENT,
        debit: Math.max(0, -paidDelta),
        credit: Math.max(0, paidDelta),
        balanceAfter: currentBalance,
        referenceType: "purchase_receipt",
        referenceId: base.id,
        note: `Payment adjusted for ${previousPurchase.purchase_number}`,
        createdById: actor.id,
        businessDate: base.purchaseDate,
      });

      if (this.financeAccountService) {
        await this.financeAccountService.recordTransactionInClient(
          client,
          {
            accountType: "CASH",
            type: paidDelta > 0 ? "WITHDRAWAL" : "DEPOSIT",
            amount: Math.abs(paidDelta),
            date: base.purchaseDate,
            note: `Purchase ${previousPurchase.purchase_number} payment adjusted — ${supplier.name}`,
          },
          actor,
        );
      }
    }

    await updateSupplierCurrentDue(client, supplier.id, actor.tenantId, Math.max(0, currentBalance));

    const { before, after } = diffFields(
      {
        supplierInvoiceNo: previousPurchase.supplier_invoice_no,
        purchaseDate: String(previousPurchase.purchase_date).slice(0, 10),
        discount: Number(previousPurchase.discount || 0),
        totalAmount: Number(previousPurchase.total_amount || 0),
        paidAmount: oldPaid,
        dueAmount: oldDue,
        paymentMethod: previousPurchase.payment_method,
        note: previousPurchase.note,
      },
      {
        supplierInvoiceNo: base.supplierInvoiceNo,
        purchaseDate: base.purchaseDate,
        discount: base.discount,
        totalAmount: base.totalAmount,
        paidAmount: newPaid,
        dueAmount: newDue,
        paymentMethod: base.paymentMethod,
        note: base.note,
      },
      ["supplierInvoiceNo", "purchaseDate", "discount", "totalAmount", "paidAmount", "dueAmount", "paymentMethod", "note"],
    );

    await this.recordActivity(client, actor, {
      actionType: PURCHASE_ACTIONS.UPDATE,
      entityType: "purchase_receipt",
      entityId: base.id,
      description: `${actor.name} updated purchase ${previousPurchase.purchase_number}`,
      metadata: { purchaseNumber: previousPurchase.purchase_number, supplierId: supplier.id },
      before,
      after,
      reason: input.reason,
    });

    const fullResult = await findPurchaseReceiptById(client, base.id, actor.tenantId);
    return mapPurchaseReceipt(fullResult.rows[0]);
  }

  async removePurchaseReceipt(purchaseId, actor, reason) {
    assert(String(reason || "").trim(), "Delete reason is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findPurchaseReceiptForUpdate(client, purchaseId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Purchase receipt not found.", 404);
      const purchase = existingResult.rows[0];

      const itemsResult = await getPurchaseReceiptItems(client, purchaseId);
      const purchaseItems = itemsResult.rows.map((row) => ({
        productId: row.product_id,
        quantityPieces: Number(row.quantity_pieces || 0),
        purchasePrice: Number(row.purchase_price || 0),
        lineDiscount: Number(row.line_discount || 0),
        lineTotal: Number(row.line_total || 0),
      }));
      const purchaseDate = String(purchase.purchase_date).slice(0, 10);

      await findSupplierForUpdate(client, purchase.supplier_id, actor.tenantId);

      await applyPurchaseInventoryDelta(client, purchaseItems, [], actor.tenantId, {
        referenceId: purchaseId,
        createdById: actor.id,
        note: `Purchase ${purchase.purchase_number} deleted — stock reversed`,
        businessDate: purchaseDate,
      });

      await softDeletePurchaseReceipt(client, purchaseId, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });

      const totalAmount = Number(purchase.total_amount || 0);
      const paidAmount = Number(purchase.paid_amount || 0);

      const latestEntry = await getLatestSupplierDueLedgerEntry(client, purchase.supplier_id, actor.tenantId);
      let currentBalance = latestEntry ? latestEntry.balanceAfter : 0;

      if (paidAmount > 0) {
        currentBalance += paidAmount;
        await recordSupplierDueLedgerEntry(client, {
          tenantId: actor.tenantId,
          supplierId: purchase.supplier_id,
          type: SUPPLIER_DUE_LEDGER_TYPES.PAYMENT,
          debit: paidAmount,
          credit: 0,
          balanceAfter: currentBalance,
          referenceType: "purchase_receipt",
          referenceId: purchaseId,
          note: `Payment reversed — ${purchase.purchase_number} deleted (${reason})`,
          createdById: actor.id,
          businessDate: purchaseDate,
        });
      }

      if (totalAmount > 0) {
        currentBalance -= totalAmount;
        await recordSupplierDueLedgerEntry(client, {
          tenantId: actor.tenantId,
          supplierId: purchase.supplier_id,
          type: SUPPLIER_DUE_LEDGER_TYPES.PURCHASE_DUE,
          debit: 0,
          credit: totalAmount,
          balanceAfter: currentBalance,
          referenceType: "purchase_receipt",
          referenceId: purchaseId,
          note: `Purchase due reversed — ${purchase.purchase_number} deleted (${reason})`,
          createdById: actor.id,
          businessDate: purchaseDate,
        });
      }

      await updateSupplierCurrentDue(client, purchase.supplier_id, actor.tenantId, Math.max(0, currentBalance));

      if (this.financeAccountService && paidAmount > 0) {
        await this.financeAccountService.recordTransactionInClient(
          client,
          {
            accountType: "CASH",
            type: "DEPOSIT",
            amount: paidAmount,
            date: purchaseDate,
            note: `Purchase ${purchase.purchase_number} deleted — cash restored`,
          },
          actor,
        );
      }

      await this.recordActivity(client, actor, {
        actionType: PURCHASE_ACTIONS.DELETE,
        entityType: "purchase_receipt",
        entityId: purchaseId,
        reason,
        description: `${actor.name} moved purchase ${purchase.purchase_number} to trash (${reason})`,
      });

      return { ok: true };
    });
  }

  async restorePurchaseReceipt(purchaseId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await restorePurchaseReceipt(client, purchaseId, actor.tenantId);
      assert(result.rowCount > 0, "Purchase receipt not found in trash.", 404);
      const purchase = result.rows[0];

      const itemsResult = await getPurchaseReceiptItems(client, purchaseId);
      const purchaseItems = itemsResult.rows.map((row) => ({
        productId: row.product_id,
        quantityPieces: Number(row.quantity_pieces || 0),
        purchasePrice: Number(row.purchase_price || 0),
        lineDiscount: Number(row.line_discount || 0),
        lineTotal: Number(row.line_total || 0),
      }));
      const purchaseDate = String(purchase.purchase_date).slice(0, 10);

      await findSupplierForUpdate(client, purchase.supplier_id, actor.tenantId);

      await applyPurchaseInventoryDelta(client, [], purchaseItems, actor.tenantId, {
        referenceId: purchaseId,
        createdById: actor.id,
        note: `Purchase ${purchase.purchase_number} restored — stock re-applied`,
        businessDate: purchaseDate,
      });

      const totalAmount = Number(purchase.total_amount || 0);
      const paidAmount = Number(purchase.paid_amount || 0);

      const latestEntry = await getLatestSupplierDueLedgerEntry(client, purchase.supplier_id, actor.tenantId);
      let currentBalance = latestEntry ? latestEntry.balanceAfter : 0;

      if (totalAmount > 0) {
        currentBalance += totalAmount;
        await recordSupplierDueLedgerEntry(client, {
          tenantId: actor.tenantId,
          supplierId: purchase.supplier_id,
          type: SUPPLIER_DUE_LEDGER_TYPES.PURCHASE_DUE,
          debit: totalAmount,
          credit: 0,
          balanceAfter: currentBalance,
          referenceType: "purchase_receipt",
          referenceId: purchaseId,
          note: `Purchase due restored — ${purchase.purchase_number} restored from trash`,
          createdById: actor.id,
          businessDate: purchaseDate,
        });
      }

      if (paidAmount > 0) {
        currentBalance -= paidAmount;
        await recordSupplierDueLedgerEntry(client, {
          tenantId: actor.tenantId,
          supplierId: purchase.supplier_id,
          type: SUPPLIER_DUE_LEDGER_TYPES.PAYMENT,
          debit: 0,
          credit: paidAmount,
          balanceAfter: currentBalance,
          referenceType: "purchase_receipt",
          referenceId: purchaseId,
          note: `Payment restored — ${purchase.purchase_number} restored from trash`,
          createdById: actor.id,
          businessDate: purchaseDate,
        });
      }

      await updateSupplierCurrentDue(client, purchase.supplier_id, actor.tenantId, Math.max(0, currentBalance));

      if (this.financeAccountService && paidAmount > 0) {
        await this.financeAccountService.recordTransactionInClient(
          client,
          {
            accountType: "CASH",
            type: "WITHDRAWAL",
            amount: paidAmount,
            date: purchaseDate,
            note: `Purchase ${purchase.purchase_number} restored — cash re-applied`,
          },
          actor,
        );
      }

      await this.recordActivity(client, actor, {
        actionType: PURCHASE_ACTIONS.RESTORE,
        entityType: "purchase_receipt",
        entityId: purchaseId,
        description: `${actor.name} restored purchase ${purchase.purchase_number} from trash`,
      });

      return { ok: true };
    });
  }

  async listTrashedPurchaseReceipts(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const tenantId = actor.tenantId;

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listTrashedPurchaseReceipts(client, { tenantId, limit, offset }),
        countTrashedPurchaseReceipts(client, tenantId),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }
}
