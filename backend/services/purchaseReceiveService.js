import { assert } from "../lib/errors.js";
import { diffFields } from "../lib/auditDiff.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { normalizePurchaseReceipt, normalizeProductSerial, cleanMoney } from "../lib/normalizers.js";
import { accountTypeForPaymentMethod } from "../lib/financeAccounts.js";
import { STOCK_MOVEMENT_TYPES } from "../lib/stockMovements.js";
import { SUPPLIER_DUE_LEDGER_TYPES } from "../lib/supplierDueLedger.js";
import { PURCHASE_ACTIONS } from "../lib/auditActions.js";
import { JOURNAL_SOURCE_TYPES } from "../lib/journalSourceTypes.js";
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
  deletePurchaseReceiptItemsByIds,
  getPurchaseReport,
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
  updatePurchaseReceiptItem,
} from "../repositories/purchaseReceiptRepository.js";
import {
  findDuplicateProductSerial,
  insertProductSerial,
  findProductSerialsByPurchaseReceiptId,
  softDeleteProductSerial,
  restoreProductSerial,
  deleteProductSerialById,
} from "../repositories/productSerialRepository.js";
import { PRODUCT_SERIAL_STATUSES } from "../lib/productSerials.js";
import {
  logActivity,
  lockProducts,
  recordStockMovement,
  recordSupplierDueLedgerEntry,
  applyStockDelta,
  updateProductPurchasePrice,
} from "./shared/inventoryHelpers.js";
import {
  insertDrugBatch,
  findDrugBatchByReceiptItemId,
  adjustDrugBatchQuantity,
  deductDrugBatchReceiptQuantities,
  restoreDrugBatchReceiptQuantities,
} from "../repositories/drugBatchRepository.js";
import { createId } from "../lib/ids.js";

const DATE_ERROR = "Purchase date must be in YYYY-MM-DD format.";

function applyLineItemTaxes(items, productMap, defaultTaxRate = 0, invoiceDiscount = 0) {
  const gross = items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
  const discount = Math.max(0, Number(invoiceDiscount || 0));
  const discountBase = gross > 0 ? discount : 0;

  let totalTaxAmount = 0;
  for (const item of items) {
    const product = productMap.get(item.productId);
    const taxRate = Math.min(Math.max(0, Number(product?.tax_rate ?? defaultTaxRate ?? 0)), 100);
    const discountShare = gross > 0 ? discountBase * (Number(item.lineTotal || 0) / gross) : 0;
    const taxableLine = Math.max(0, Number(item.lineTotal || 0) - discountShare);
    const taxAmount = Math.max(0, taxableLine * taxRate / 100);
    item.taxRate = taxRate;
    item.taxAmount = taxAmount;
    totalTaxAmount += taxAmount;
  }

  const taxableAmount = Math.max(0, gross - discountBase);
  const totalAmount = Math.max(0, taxableAmount + totalTaxAmount);
  return {
    taxableAmount,
    taxAmount: totalTaxAmount,
    totalAmount,
    taxRate: taxableAmount > 0 ? Math.min(Math.max(0, (totalTaxAmount / taxableAmount) * 100), 100) : 0,
  };
}

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

function isSerialRequired(product) {
  return product?.serial_required === true || product?.serial_required === "t";
}

// Enforced before any mutation: every serial-required line item must supply exactly one
// serial/IMEI per purchased piece, with no duplicates within this purchase or already in inventory.
async function validateSerialRequirements(client, items, productMap, tenantId) {
  const seen = new Set();
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!isSerialRequired(product)) {
      continue;
    }

    assert(
      item.serials.length === item.quantityPieces,
      `${product.name} requires ${item.quantityPieces} serial/IMEI number(s), but ${item.serials.length} were entered.`,
    );

    for (const serial of item.serials) {
      assert(!seen.has(serial), `Serial/IMEI "${serial}" was entered more than once in this purchase.`);
      seen.add(serial);

      const duplicate = await findDuplicateProductSerial(client, { tenantId, serialNumber: serial });
      assert(!duplicate, `Serial/IMEI "${serial}" already exists in inventory.`);
    }
  }
}

async function insertSerialsForItems(client, items, productMap, { tenantId, purchaseReceiptId }) {
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!isSerialRequired(product) || !item.serials.length) {
      continue;
    }

    for (const serial of item.serials) {
      const serialRecord = normalizeProductSerial({
        productId: item.productId,
        serialNumber: serial,
        purchaseReceiptId,
        purchaseReceiptItemId: item.id,
      });
      serialRecord.tenantId = tenantId;
      await insertProductSerial(client, serialRecord);
    }
  }
}

// Soft-deletes (or restores) every serial received on this purchase, used by trash/restore
// to keep product_serials consistent with the stock reversal those actions already perform.
async function softDeletePurchaseSerials(client, purchaseReceiptId, tenantId, actor, deleteReason) {
  const lockedResult = await findProductSerialsByPurchaseReceiptId(client, purchaseReceiptId, tenantId);
  for (const row of lockedResult.rows) {
    assert(
      row.status === PRODUCT_SERIAL_STATUSES.IN_STOCK,
      `Cannot delete this purchase — serial/IMEI "${row.serial_number || row.imei1}" from this purchase has already been sold or used.`,
    );
  }

  for (const row of lockedResult.rows) {
    await softDeleteProductSerial(client, row.id, tenantId, { deletedById: actor.id, deleteReason });
  }
}

async function restorePurchaseSerials(client, purchaseReceiptId, tenantId) {
  const lockedResult = await findProductSerialsByPurchaseReceiptId(client, purchaseReceiptId, tenantId, { includeDeleted: true });
  for (const row of lockedResult.rows) {
    await restoreProductSerial(client, row.id, tenantId);
  }
}

// Creates or adjusts drug_batches rows to match the purchase receipt items.
// previousItemMap: Map<itemId, { quantityPieces }> — empty Map for new receipts.
// Only creates a batch when the item has a batchNumber, lotNumber, expiryDate, or
// manufactureDate — non-pharmacy products with none of these fields are silently skipped.
async function syncDrugBatchesForItems(client, items, previousItemMap, { tenantId, purchaseReceiptId, createdBy }) {
  for (const item of items) {
    const hasBatchInfo = item.batchNumber || item.lotNumber || item.expiryDate || item.manufactureDate;
    if (!hasBatchInfo) continue;

    const prevQty = previousItemMap.get(item.id)?.quantityPieces ?? 0;
    const delta = item.quantityPieces - prevQty;

    if (prevQty === 0) {
      // New item — insert a fresh batch row.
      await insertDrugBatch(client, {
        id: createId("drugbatch"),
        tenantId,
        productId: item.productId,
        purchaseReceiptId,
        purchaseReceiptItemId: item.id,
        batchNumber: item.batchNumber || '',
        lotNumber: item.lotNumber || '',
        expiryDate: item.expiryDate || null,
        manufactureDate: item.manufactureDate || null,
        quantityReceived: item.quantityPieces,
        quantityRemaining: item.quantityPieces,
        purchasePrice: item.purchasePrice || 0,
        createdBy: createdBy || null,
      });
    } else if (delta !== 0) {
      // Existing item — adjust the linked batch by the quantity delta.
      const existing = await findDrugBatchByReceiptItemId(client, item.id, tenantId);
      if (existing) {
        await adjustDrugBatchQuantity(client, existing.id, delta);
      }
    }
  }
}

// On update, reconciles product_serials against the new item list directly (matched by
// purchase_receipt_item id) instead of relying on delete-all-then-reinsert-all item
// persistence, which would otherwise orphan every existing serial via
// purchase_receipt_item_id's ON DELETE SET NULL — even for lines nobody touched.
async function reconcilePurchaseItemSerials(client, { tenantId, purchaseReceiptId, previousItems, nextItems, productMap }) {
  const lockedResult = await findProductSerialsByPurchaseReceiptId(client, purchaseReceiptId, tenantId);
  const serialsByItemId = new Map();
  for (const row of lockedResult.rows) {
    const list = serialsByItemId.get(row.purchase_receipt_item_id) || [];
    list.push(row);
    serialsByItemId.set(row.purchase_receipt_item_id, list);
  }

  const previousById = new Map(previousItems.map((item) => [item.id, item]));
  const matchedPreviousIds = new Set();
  const toRemove = [];
  const toAdd = [];

  for (const item of nextItems) {
    const product = productMap.get(item.productId);
    const previous = previousById.get(item.id) || null;
    const sameProduct = Boolean(previous) && previous.productId === item.productId;
    if (previous) {
      matchedPreviousIds.add(previous.id);
    }

    const existingSerialsForItemId = serialsByItemId.get(item.id) || [];

    if (!sameProduct) {
      // New line, or this line's product changed — none of the serials currently tied to
      // this item id can carry over to a different product.
      toRemove.push(...existingSerialsForItemId);
    }

    const previousSerials = sameProduct ? existingSerialsForItemId : [];
    const previousValues = new Set(previousSerials.map((serial) => serial.serial_number));
    const nextValues = new Set(item.serials);

    toRemove.push(...previousSerials.filter((serial) => !nextValues.has(serial.serial_number)));

    if (isSerialRequired(product)) {
      assert(
        item.serials.length === item.quantityPieces,
        `${product.name} requires ${item.quantityPieces} serial/IMEI number(s), but ${item.serials.length} were entered.`,
      );

      const seenInItem = new Set();
      for (const value of item.serials) {
        assert(!seenInItem.has(value), `Serial/IMEI "${value}" was entered more than once in this purchase.`);
        seenInItem.add(value);
        if (!previousValues.has(value)) {
          toAdd.push({ item, serialNumber: value });
        }
      }
    }
  }

  for (const previous of previousItems) {
    if (!matchedPreviousIds.has(previous.id)) {
      toRemove.push(...(serialsByItemId.get(previous.id) || []));
    }
  }

  for (const row of toRemove) {
    assert(
      row.status === PRODUCT_SERIAL_STATUSES.IN_STOCK,
      `Cannot remove serial/IMEI "${row.serial_number || row.imei1}" — it has already been sold or used.`,
    );
  }

  for (const row of toRemove) {
    await deleteProductSerialById(client, row.id, tenantId);
  }

  for (const { item, serialNumber } of toAdd) {
    const duplicate = await findDuplicateProductSerial(client, { tenantId, serialNumber });
    assert(!duplicate, `Serial/IMEI "${serialNumber}" already exists in inventory.`);

    const serialRecord = normalizeProductSerial({
      productId: item.productId,
      serialNumber,
      purchaseReceiptId,
      purchaseReceiptItemId: item.id,
    });
    serialRecord.tenantId = tenantId;
    await insertProductSerial(client, serialRecord);
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
  constructor(databaseManager, { auditService, financeAccountService, journalService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.financeAccountService = financeAccountService;
    this.journalService = journalService;
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
    const productIds = base.items.map((item) => item.productId);
    const productMap = await lockProducts(client, productIds, actor.tenantId);
    await validateSerialRequirements(client, base.items, productMap, actor.tenantId);
    const taxSummary = applyLineItemTaxes(base.items, productMap, 0, base.discount);
    base.taxableAmount = taxSummary.taxableAmount;
    base.taxAmount = taxSummary.taxAmount;
    base.totalAmount = taxSummary.totalAmount;
    base.taxRate = taxSummary.taxRate;
    base.paidAmount = Math.max(0, Math.min(base.paidAmount, base.totalAmount));
    base.dueAmount = base.totalAmount - base.paidAmount;

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
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        batchNumber: item.batchNumber || '',
        lotNumber: item.lotNumber || '',
        expiryDate: item.expiryDate || null,
        manufactureDate: item.manufactureDate || null,
      });
    }

    await syncDrugBatchesForItems(client, base.items, new Map(), {
      tenantId: actor.tenantId,
      purchaseReceiptId: base.id,
      createdBy: actor.id,
    });

    await insertSerialsForItems(client, base.items, productMap, {
      tenantId: actor.tenantId,
      purchaseReceiptId: base.id,
    });

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
          accountType: accountTypeForPaymentMethod(base.paymentMethod),
          type: "WITHDRAWAL",
          amount: base.paidAmount,
          date: base.purchaseDate,
          note: `Purchase ${purchaseNumber} — ${supplier.name}`,
        },
        actor,
      );
    }

    if (this.journalService) {
      await this.journalService.postPurchaseReceipt(client, actor, {
        receiptId: base.id,
        purchaseDate: base.purchaseDate,
        purchaseNumber,
        paymentMethod: base.paymentMethod,
        paidAmount: base.paidAmount,
        dueAmount: base.dueAmount,
        totalAmount: base.totalAmount,
      });
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
    const productIds = base.items.map((item) => item.productId);
    const productMap = await lockProducts(client, productIds, actor.tenantId);
    const taxSummary = applyLineItemTaxes(base.items, productMap, 0, base.discount);
    base.taxableAmount = taxSummary.taxableAmount;
    base.taxAmount = taxSummary.taxAmount;
    base.totalAmount = taxSummary.totalAmount;
    base.taxRate = taxSummary.taxRate;
    base.paidAmount = Math.max(0, Math.min(base.paidAmount, base.totalAmount));
    base.dueAmount = base.totalAmount - base.paidAmount;

    const itemsResult = await client.query(
      `SELECT id, product_id, quantity_pieces, purchase_price, line_discount, line_total, tax_rate, tax_amount FROM purchase_receipt_items WHERE purchase_receipt_id = $1`,
      [base.id],
    );
    const previousItems = itemsResult.rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      quantityPieces: Number(row.quantity_pieces || 0),
      purchasePrice: Number(row.purchase_price || 0),
      lineDiscount: Number(row.line_discount || 0),
      lineTotal: Number(row.line_total || 0),
      taxRate: Number(row.tax_rate || 0),
      taxAmount: Number(row.tax_amount || 0),
    }));

    await reconcilePurchaseItemSerials(client, {
      tenantId: actor.tenantId,
      purchaseReceiptId: base.id,
      previousItems,
      nextItems: base.items,
      productMap,
    });

    await applyPurchaseInventoryDelta(client, previousItems, base.items, actor.tenantId, {
      referenceId: base.id,
      createdById: actor.id,
      note: `Purchase receive ${previousPurchase.purchase_number} updated`,
      businessDate: base.purchaseDate,
    });

    const previousIds = new Set(previousItems.map((item) => item.id));
    const previousItemMap = new Map(previousItems.map((item) => [item.id, item]));
    const nextIds = new Set(base.items.map((item) => item.id));
    const removedItemIds = previousItems.filter((item) => !nextIds.has(item.id)).map((item) => item.id);
    await deletePurchaseReceiptItemsByIds(client, removedItemIds);

    for (const item of base.items) {
      const itemPayload = {
        id: item.id,
        tenantId: actor.tenantId,
        purchaseReceiptId: base.id,
        productId: item.productId,
        quantityPieces: item.quantityPieces,
        purchasePrice: item.purchasePrice,
        lineDiscount: item.lineDiscount,
        lineTotal: item.lineTotal,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        batchNumber: item.batchNumber || '',
        lotNumber: item.lotNumber || '',
        expiryDate: item.expiryDate || null,
        manufactureDate: item.manufactureDate || null,
      };

      if (previousIds.has(item.id)) {
        await updatePurchaseReceiptItem(client, itemPayload);
      } else {
        await insertPurchaseReceiptItem(client, itemPayload);
      }
    }

    await syncDrugBatchesForItems(client, base.items, previousItemMap, {
      tenantId: actor.tenantId,
      purchaseReceiptId: base.id,
      createdBy: actor.id,
    });

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
            accountType: accountTypeForPaymentMethod(base.paymentMethod),
            type: paidDelta > 0 ? "WITHDRAWAL" : "DEPOSIT",
            amount: Math.abs(paidDelta),
            date: base.purchaseDate,
            note: `Purchase ${previousPurchase.purchase_number} payment adjusted — ${supplier.name}`,
          },
          actor,
        );
      }
    }

    if (this.journalService && (totalDelta !== 0 || paidDelta !== 0)) {
      await this.journalService.postPurchaseReceiptAdjustment(client, actor, {
        receiptId: base.id,
        purchaseDate: base.purchaseDate,
        purchaseNumber: previousPurchase.purchase_number,
        paymentMethod: base.paymentMethod,
        totalDelta,
        paidDelta,
      });
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

      await softDeletePurchaseSerials(client, purchaseId, actor.tenantId, actor, reason);

      await applyPurchaseInventoryDelta(client, purchaseItems, [], actor.tenantId, {
        referenceId: purchaseId,
        createdById: actor.id,
        note: `Purchase ${purchase.purchase_number} deleted — stock reversed`,
        businessDate: purchaseDate,
      });

      await deductDrugBatchReceiptQuantities(client, purchaseId, actor.tenantId);

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
            accountType: accountTypeForPaymentMethod(purchase.payment_method),
            type: "DEPOSIT",
            amount: paidAmount,
            date: purchaseDate,
            note: `Purchase ${purchase.purchase_number} deleted — cash restored`,
          },
          actor,
        );
      }

      if (this.journalService) {
        await this.journalService.reverseAllForSource(client, {
          tenantId: actor.tenantId,
          sourceType: JOURNAL_SOURCE_TYPES.PURCHASE_RECEIPT,
          sourceId: purchaseId,
          adjustmentSourceType: JOURNAL_SOURCE_TYPES.PURCHASE_RECEIPT_ADJUSTMENT,
          reason,
          createdById: actor.id,
        });
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

      await restorePurchaseSerials(client, purchaseId, actor.tenantId);

      await applyPurchaseInventoryDelta(client, [], purchaseItems, actor.tenantId, {
        referenceId: purchaseId,
        createdById: actor.id,
        note: `Purchase ${purchase.purchase_number} restored — stock re-applied`,
        businessDate: purchaseDate,
      });

      await restoreDrugBatchReceiptQuantities(client, purchaseId, actor.tenantId);

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
            accountType: accountTypeForPaymentMethod(purchase.payment_method),
            type: "WITHDRAWAL",
            amount: paidAmount,
            date: purchaseDate,
            note: `Purchase ${purchase.purchase_number} restored — cash re-applied`,
          },
          actor,
        );
      }

      if (this.journalService) {
        await this.journalService.unreverseAllForSource(client, {
          tenantId: actor.tenantId,
          sourceType: JOURNAL_SOURCE_TYPES.PURCHASE_RECEIPT,
          sourceId: purchaseId,
          adjustmentSourceType: JOURNAL_SOURCE_TYPES.PURCHASE_RECEIPT_ADJUSTMENT,
        });
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

  async getPurchaseReport(query = {}, actor) {
    const dateFrom = String(query.dateFrom || "").trim() || undefined;
    const dateTo = String(query.dateTo || "").trim() || undefined;
    const supplierId = String(query.supplierId || "").trim() || undefined;
    return this.databaseManager.withClient(async (client) => {
      const rows = await getPurchaseReport(client, { tenantId: actor.tenantId, dateFrom, dateTo, supplierId });
      return { rows, dateFrom: dateFrom || null, dateTo: dateTo || null };
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
