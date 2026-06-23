import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { normalizeSalesInvoice, cleanMoney } from "../lib/normalizers.js";
import { normalizeLoyaltySettings, calculateEarnedLoyaltyPoints, calculateRedeemAmount } from "../lib/loyalty.js";
import { STOCK_MOVEMENT_TYPES } from "../lib/stockMovements.js";
import { CUSTOMER_DUE_LEDGER_TYPES } from "../lib/customerDueLedger.js";
import { SALES_INVOICE_ACTIONS } from "../lib/auditActions.js";
import { nextInvoiceNumber } from "../lib/salesNumber.js";
import { findRetailCustomerForUpdate, updateRetailCustomerCurrentDue, updateRetailCustomerLoyaltyBalance } from "../repositories/retailCustomerRepository.js";
import { findTenantById } from "../repositories/tenantRepository.js";
import { getLatestCustomerDueLedgerEntry } from "../repositories/customerDueLedgerRepository.js";
import { listActiveRetailPromotionsForDate } from "../repositories/retailPromotionRepository.js";
import { insertRetailLoyaltyLedgerEntry } from "../repositories/retailLoyaltyLedgerRepository.js";
import { findProductSerialsForUpdate, updateProductSerial, mapProductSerial } from "../repositories/productSerialRepository.js";
import { insertSalesItemSerial, listSalesItemSerialsByInvoice } from "../repositories/salesItemSerialRepository.js";
import { PRODUCT_SERIAL_STATUSES } from "../lib/productSerials.js";
import {
  countSalesInvoices,
  countTrashedSalesInvoices,
  findSalesInvoiceById,
  findSalesInvoiceForUpdate,
  getSalesInvoiceItems,
  insertSalesInvoice,
  insertSalesInvoiceItem,
  listSalesInvoicesPage,
  listTrashedSalesInvoices,
  mapSalesInvoice,
  restoreSalesInvoice,
  softDeleteSalesInvoice,
  getDailySalesReport,
} from "../repositories/salesInvoiceRepository.js";
import {
  logActivity,
  lockProducts,
  recordStockMovement,
  recordCustomerDueLedgerEntry,
  applyStockDelta,
} from "./shared/inventoryHelpers.js";

const DATE_ERROR = "Invoice date must be in YYYY-MM-DD format.";

function normalizeLoyaltyPoints(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function loyaltyPointsImpact(invoice, quantityRatio = 1) {
  const earned = normalizeLoyaltyPoints(invoice.loyaltyPointsEarned);
  const redeemed = normalizeLoyaltyPoints(invoice.loyaltyPointsRedeemed);
  const ratio = Math.max(0, Math.min(1, Number(quantityRatio || 0)));
  return {
    earned: Math.round(earned * ratio),
    redeemed: Math.round(redeemed * ratio),
  };
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
  const entry = {
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
  };
  await insertRetailLoyaltyLedgerEntry(client, entry);
  await updateRetailCustomerLoyaltyBalance(client, customerId, tenantId, balanceAfter);
}

function formatPromotionPrice(basePrice, promotion) {
  const price = Number(basePrice || 0);
  const discountValue = Math.max(0, Number(promotion?.discountValue || 0));
  if (!promotion || promotion.discountType === "FIXED") {
    return Math.max(0, price - discountValue);
  }

  return Math.max(0, price * (1 - Math.min(100, discountValue) / 100));
}

function matchesPromotionTarget(promotion, product) {
  if (!promotion || !product) {
    return false;
  }

  if (promotion.targetType === "ALL") {
    return true;
  }

  if (promotion.targetType === "PRODUCT") {
    return promotion.targetId === product.id;
  }

  if (promotion.targetType === "CATEGORY") {
    return promotion.targetId && promotion.targetId === product.category_id;
  }

  return false;
}

function isPromotionEligibleForSaleType(promotion, saleType) {
  if (promotion.saleType === "ALL") {
    return true;
  }

  if (saleType === "QUICK_SALE") {
    return promotion.saleType === "RETAIL" || promotion.saleType === "QUICK_SALE";
  }

  return promotion.saleType === saleType;
}

function isPromotionActiveForDate(promotion, invoiceDate) {
  const date = String(invoiceDate || "").slice(0, 10);
  const start = promotion.startDate ? String(promotion.startDate).slice(0, 10) : null;
  const end = promotion.endDate ? String(promotion.endDate).slice(0, 10) : null;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function bestPromotionForProduct(promotions, product, invoiceDate, saleType, quantityPieces = 0, lineSubtotal = 0) {
  return promotions
    .filter((promotion) =>
      promotion.active &&
      promotion.level === "LINE" &&
      isPromotionEligibleForSaleType(promotion, saleType) &&
      isPromotionActiveForDate(promotion, invoiceDate) &&
      (!promotion.minQuantity || quantityPieces >= Number(promotion.minQuantity || 0)) &&
      (!promotion.minSubtotal || lineSubtotal >= Number(promotion.minSubtotal || 0)) &&
      matchesPromotionTarget(promotion, product),
    )
    .sort((left, right) => {
      const priorityDiff = Number(left.priority || 0) - Number(right.priority || 0);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      const leftDiscount = left.discountType === "FIXED"
        ? Number(left.discountValue || 0)
        : Number(product?.retailPrice || 0) * Math.min(100, Number(left.discountValue || 0)) / 100;
      const rightDiscount = right.discountType === "FIXED"
        ? Number(right.discountValue || 0)
        : Number(product?.retailPrice || 0) * Math.min(100, Number(right.discountValue || 0)) / 100;
      return rightDiscount - leftDiscount;
    })[0] || null;
}

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

function isSerialRequired(product) {
  return product?.serial_required === true || product?.serial_required === "t";
}

function addMonthsToIsoDate(isoDate, months) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + Number(months || 0));
  return date.toISOString().slice(0, 10);
}

// Validates that every serial-required line item supplied exactly the right number of
// serial/IMEI selections, with no serial reused across two different line items.
function validateSerialSelections(items, productMap) {
  const usedSerialIds = new Set();
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!isSerialRequired(product)) {
      continue;
    }

    assert(
      item.serialIds.length === item.quantityPieces,
      `${product.name} requires selecting ${item.quantityPieces} serial/IMEI number(s), but ${item.serialIds.length} were selected.`,
    );

    for (const serialId of item.serialIds) {
      assert(!usedSerialIds.has(serialId), "The same serial/IMEI was selected more than once in this sale.");
      usedSerialIds.add(serialId);
    }
  }
}

// Locks, validates, and consumes the selected product_serials rows for every serial-required
// line item: links them to this invoice, marks them SOLD, and stamps warranty dates.
async function consumeSerialSelections(client, items, productMap, { tenantId, salesInvoiceId, invoiceDate }) {
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!isSerialRequired(product) || !item.serialIds.length) {
      continue;
    }

    const lockedResult = await findProductSerialsForUpdate(client, item.serialIds, tenantId);
    assert(lockedResult.rowCount === item.serialIds.length, "One or more selected serial/IMEI numbers could not be found.");

    for (const row of lockedResult.rows) {
      assert(row.product_id === item.productId, "A selected serial/IMEI does not belong to this product.");
      assert(row.status === PRODUCT_SERIAL_STATUSES.IN_STOCK, `Serial/IMEI "${row.serial_number || row.imei1}" is no longer in stock.`);

      const serial = mapProductSerial(row);
      await insertSalesItemSerial(client, {
        id: createId("sales-item-serial"),
        tenantId,
        salesInvoiceId,
        salesInvoiceItemId: item.id,
        productId: item.productId,
        productSerialId: serial.id,
        serialNumberSnapshot: serial.serialNumber,
        imei1Snapshot: serial.imei1,
        imei2Snapshot: serial.imei2,
      });

      await updateProductSerial(client, {
        ...serial,
        tenantId,
        status: PRODUCT_SERIAL_STATUSES.SOLD,
        salesInvoiceId,
        salesInvoiceItemId: item.id,
        warrantyStartDate: invoiceDate,
        warrantyEndDate: addMonthsToIsoDate(invoiceDate, item.warrantyMonthsSnapshot),
      });
    }
  }
}

// Flips every serial sold on this invoice between SOLD and IN_STOCK, used by trash/restore
// to keep product_serials consistent with the stock reversal those actions already perform.
async function flipInvoiceSerialStatuses(client, salesInvoiceId, tenantId, { fromStatus, toStatus }) {
  const links = await listSalesItemSerialsByInvoice(client, salesInvoiceId, tenantId);
  if (!links.length) {
    return;
  }

  const serialIds = links.map((link) => link.productSerialId);
  const lockedResult = await findProductSerialsForUpdate(client, serialIds, tenantId);
  assert(lockedResult.rowCount === serialIds.length, "One or more serial/IMEI numbers linked to this invoice could not be found.");

  for (const row of lockedResult.rows) {
    assert(row.status === fromStatus, `Serial/IMEI "${row.serial_number || row.imei1}" is not currently ${fromStatus}.`);
    const serial = mapProductSerial(row);
    await updateProductSerial(client, { ...serial, tenantId, status: toStatus });
  }
}

async function seedOpeningCustomerLedgerIfNeeded(client, customer, tenantId, actor, businessDate) {
  const existingEntry = await getLatestCustomerDueLedgerEntry(client, customer.id, tenantId);
  if (existingEntry) {
    return existingEntry.balanceAfter;
  }

  const openingDue = Math.max(0, cleanMoney(customer.opening_due));
  if (openingDue > 0) {
    await recordCustomerDueLedgerEntry(client, {
      tenantId,
      customerId: customer.id,
      type: CUSTOMER_DUE_LEDGER_TYPES.OPENING,
      debit: openingDue,
      credit: 0,
      balanceAfter: openingDue,
      referenceType: "customer_opening",
      referenceId: customer.id,
      note: `Opening due for ${customer.name}`,
      createdById: actor.id,
      businessDate,
    });
    return openingDue;
  }

  return 0;
}

export class SalesInvoiceService {
  constructor(databaseManager, { auditService, financeAccountService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.financeAccountService = financeAccountService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  async listSalesInvoices(query = {}, actor) {
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
      customerId: String(query.customerId || "").trim() || undefined,
      invoiceNumber: String(query.invoiceNumber || "").trim() || undefined,
      saleType: ["WHOLESALE", "RETAIL", "QUICK_SALE"].includes(query.saleType) ? query.saleType : undefined,
      paymentStatus: ["PAID", "PARTIAL", "DUE"].includes(query.paymentStatus) ? query.paymentStatus : undefined,
      dateFrom,
      dateTo,
    };

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listSalesInvoicesPage(client, { ...filters, limit, offset }),
        countSalesInvoices(client, filters),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async getSalesInvoice(invoiceId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const result = await findSalesInvoiceById(client, invoiceId, actor.tenantId);
      assert(result.rowCount > 0, "Sales invoice not found.", 404);
      return mapSalesInvoice(result.rows[0]);
    });
  }

  async saveSalesInvoice(input, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const tenant = await findTenantById(client, actor.tenantId);
      const base = normalizeSalesInvoice({ ...input, taxRate: tenant?.taxRate ?? 0 });
      base.tenantId = actor.tenantId;
      base.loyaltyRedeemPoints = normalizeLoyaltyPoints(input.loyaltyRedeemPoints);
      assert(base.items.length > 0, "At least one product line item is required.");
      assert(base.invoiceDate, "Invoice date is required.");
      base.invoiceDate = normalizeIsoDate(base.invoiceDate, base.invoiceDate, DATE_ERROR);

      if (base.customerType === "WALK_IN") {
        assert(base.dueAmount === 0, "Walk-in sales must be fully paid.");
      }

      if (base.dueAmount > 0) {
        assert(
          base.customerType === "REGISTERED" && base.customerId,
          "Due amount requires a registered customer.",
        );
      }

      return this.createSalesInvoiceRecord(client, base, actor, tenant);
    });
  }

  async createSalesInvoiceRecord(client, base, actor, tenant) {
    const productIds = base.items.map((item) => item.productId);
    const productMap = await lockProducts(client, productIds, actor.tenantId);
    const promotions = await listActiveRetailPromotionsForDate(client, actor.tenantId, base.invoiceDate);

    let totalProfit = -base.discount;
    for (const item of base.items) {
      const product = productMap.get(item.productId);
      assert(
        Number(product.stock_pieces || 0) >= item.quantityPieces,
        `${product.name} does not have enough available stock for this sale.`,
      );
      const costPriceSnapshot = Number(product.purchase_price || 0);
      item.productName = item.productName || product.name;
      item.brandSnapshot = product.brand || '';
      item.modelSnapshot = product.model || '';
      item.barcodeSnapshot = product.barcode || '';
      item.warrantyMonthsSnapshot = Number(product.warranty_months || 0);
      if (base.saleType !== "WHOLESALE") {
        const promotion = bestPromotionForProduct(
          promotions,
          product,
          base.invoiceDate,
          base.saleType,
          item.quantityPieces,
          Number(item.actualSalePrice || product.retail_price || 0) * item.quantityPieces,
        );
        if (promotion) {
          const promoPrice = formatPromotionPrice(product.retail_price, promotion);
          item.actualSalePrice = Math.min(Number(item.actualSalePrice || 0), promoPrice);
        }
      }
      item.lineTotal = Math.max(0, Number(item.actualSalePrice || 0) * item.quantityPieces - Number(item.lineDiscount || 0));
      item.costPriceSnapshot = costPriceSnapshot;
      totalProfit += item.lineTotal - costPriceSnapshot * item.quantityPieces;
    }

    validateSerialSelections(base.items, productMap);

    const taxSummary = applyLineItemTaxes(base.items, productMap, 0, base.discount);
    base.taxableAmount = taxSummary.taxableAmount;
    base.taxAmount = taxSummary.taxAmount;
    base.totalAmount = taxSummary.totalAmount;
    base.taxRate = taxSummary.taxRate;
    base.loyaltyPointsEarned = 0;
    base.loyaltyPointsRedeemed = 0;
    base.loyaltyRedeemAmount = 0;

    const year = new Date(base.invoiceDate).getUTCFullYear();
    const invoiceNumber = await nextInvoiceNumber(client, actor.tenantId, year);

    const loyalty = normalizeLoyaltySettings(tenant);
    let customer = null;
    let loyaltyBalanceAfter = null;

    if (base.customerId && loyalty.enabled && base.saleType !== "WHOLESALE") {
      const customerResult = await findRetailCustomerForUpdate(client, base.customerId, actor.tenantId);
      assert(customerResult.rowCount > 0, "Customer not found.", 404);
      customer = customerResult.rows[0];
      const currentLoyaltyBalance = Math.max(0, Number(customer.loyalty_points_balance || 0));
      const requestedRedeemPoints = normalizeLoyaltyPoints(base.loyaltyRedeemPoints);
      const redeemPoints = Math.min(requestedRedeemPoints, currentLoyaltyBalance);
      const redeemAmount = Math.min(base.totalAmount, calculateRedeemAmount(redeemPoints, loyalty.pointValue));
      const netTotal = Math.max(0, base.totalAmount - redeemAmount);
      const paidAmount = Math.max(0, Math.min(base.paidAmount, netTotal));
      const dueAmount = netTotal - paidAmount;
      const earnedPoints = calculateEarnedLoyaltyPoints(paidAmount, loyalty.pointsPer100);

      base.loyaltyPointsRedeemed = redeemPoints;
      base.loyaltyRedeemAmount = redeemAmount;
      base.loyaltyPointsEarned = earnedPoints;
      base.totalAmount = netTotal;
      base.paidAmount = paidAmount;
      base.dueAmount = dueAmount;
      totalProfit -= redeemAmount;
      loyaltyBalanceAfter = currentLoyaltyBalance + earnedPoints - redeemPoints;
    } else {
      base.paidAmount = Math.max(0, Math.min(base.paidAmount, base.totalAmount));
      base.dueAmount = base.totalAmount - base.paidAmount;
    }

    if (customer && loyaltyBalanceAfter !== null) {
      await recordLoyaltyEntry(client, {
        tenantId: actor.tenantId,
        customerId: customer.id,
        type: "SALE",
        pointsDelta: base.loyaltyPointsEarned - base.loyaltyPointsRedeemed,
        balanceAfter: Math.max(0, loyaltyBalanceAfter),
        referenceType: "sales_invoice",
        referenceId: base.id,
        note: `Loyalty update for sale ${invoiceNumber}`,
        createdById: actor.id,
        businessDate: base.invoiceDate,
      });
    }

    if (base.customerId && base.dueAmount > 0) {
      if (!customer) {
        const customerResult = await findRetailCustomerForUpdate(client, base.customerId, actor.tenantId);
        assert(customerResult.rowCount > 0, "Customer not found.", 404);
        customer = customerResult.rows[0];
      }
      let currentBalance = await seedOpeningCustomerLedgerIfNeeded(client, customer, actor.tenantId, actor, base.invoiceDate);

      currentBalance += base.dueAmount;
      await recordCustomerDueLedgerEntry(client, {
        tenantId: actor.tenantId,
        customerId: customer.id,
        type: CUSTOMER_DUE_LEDGER_TYPES.SALE_DUE,
        debit: base.dueAmount,
        credit: 0,
        balanceAfter: currentBalance,
        referenceType: "sales_invoice",
        referenceId: base.id,
        note: `Sale due for ${invoiceNumber}`,
        createdById: actor.id,
        businessDate: base.invoiceDate,
      });

      await updateRetailCustomerCurrentDue(client, customer.id, actor.tenantId, Math.max(0, currentBalance));
    }

    for (const item of base.items) {
      const nextBalance = await applyStockDelta(client, item.productId, actor.tenantId, -item.quantityPieces, 0);
      await recordStockMovement(client, {
        tenantId: actor.tenantId,
        productId: item.productId,
        type: STOCK_MOVEMENT_TYPES.SALE,
        quantityIn: 0,
        quantityOut: item.quantityPieces,
        balanceAfter: nextBalance.stockPieces,
        referenceType: "sales_invoice",
        referenceId: base.id,
        note: `Sales invoice ${invoiceNumber}`,
        createdById: actor.id,
        businessDate: base.invoiceDate,
      });
    }

    await insertSalesInvoice(client, {
      ...base,
      invoiceNumber,
      totalProfit,
      createdById: actor.id,
    });

    if (this.financeAccountService && base.paidAmount > 0) {
      await this.financeAccountService.recordTransactionInClient(
        client,
        {
          accountType: "CASH",
          type: "DEPOSIT",
          amount: base.paidAmount,
          date: base.invoiceDate,
          note: `Sales invoice ${invoiceNumber}`,
        },
        actor,
      );
    }

    for (const item of base.items) {
      await insertSalesInvoiceItem(client, {
        id: item.id,
        tenantId: actor.tenantId,
        salesInvoiceId: base.id,
        productId: item.productId,
        productName: item.productName,
        quantityPieces: item.quantityPieces,
        actualSalePrice: item.actualSalePrice,
        costPriceSnapshot: item.costPriceSnapshot,
        lineDiscount: item.lineDiscount,
        lineTotal: item.lineTotal,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        brandSnapshot: item.brandSnapshot,
        modelSnapshot: item.modelSnapshot,
        barcodeSnapshot: item.barcodeSnapshot,
        warrantyMonthsSnapshot: item.warrantyMonthsSnapshot,
      });
    }

    await consumeSerialSelections(client, base.items, productMap, {
      tenantId: actor.tenantId,
      salesInvoiceId: base.id,
      invoiceDate: base.invoiceDate,
    });

    await this.recordActivity(client, actor, {
      actionType: SALES_INVOICE_ACTIONS.CREATE,
      entityType: "sales_invoice",
      entityId: base.id,
      description: `${actor.name} recorded sale ${invoiceNumber}${customer ? ` to ${customer.name}` : ""}`,
      metadata: {
        invoiceNumber,
        saleType: base.saleType,
        customerId: base.customerId,
        taxRate: base.taxRate,
        taxAmount: base.taxAmount,
        totalAmount: base.totalAmount,
        dueAmount: base.dueAmount,
        loyaltyPointsEarned: base.loyaltyPointsEarned,
        loyaltyPointsRedeemed: base.loyaltyPointsRedeemed,
        loyaltyRedeemAmount: base.loyaltyRedeemAmount,
        totalProfit,
      },
    });

    const fullResult = await findSalesInvoiceById(client, base.id, actor.tenantId);
    return mapSalesInvoice(fullResult.rows[0]);
  }

  async removeSalesInvoice(invoiceId, actor, reason) {
    assert(String(reason || "").trim(), "Delete reason is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findSalesInvoiceForUpdate(client, invoiceId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Sales invoice not found.", 404);
      const invoice = existingResult.rows[0];

      const itemsResult = await getSalesInvoiceItems(client, invoiceId);
      const invoiceDate = String(invoice.invoice_date).slice(0, 10);

      // Void: a deleted sale must give back the stock it took, reverse any due it created,
      // and reverse any cash it recorded — exactly the effects createSalesInvoiceRecord applied.
      for (const item of itemsResult.rows) {
        const quantity = Number(item.quantity_pieces || 0);
        const nextBalance = await applyStockDelta(client, item.product_id, actor.tenantId, quantity, 0);
        await recordStockMovement(client, {
          tenantId: actor.tenantId,
          productId: item.product_id,
          type: STOCK_MOVEMENT_TYPES.SALE,
          quantityIn: quantity,
          quantityOut: 0,
          balanceAfter: nextBalance.stockPieces,
          referenceType: "sales_invoice",
          referenceId: invoiceId,
          note: `Sale ${invoice.invoice_number} deleted — stock reversed`,
          createdById: actor.id,
          businessDate: invoiceDate,
        });
      }

      await flipInvoiceSerialStatuses(client, invoiceId, actor.tenantId, {
        fromStatus: PRODUCT_SERIAL_STATUSES.SOLD,
        toStatus: PRODUCT_SERIAL_STATUSES.IN_STOCK,
      });

      await softDeleteSalesInvoice(client, invoiceId, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });

      const loyaltyPointsEarned = normalizeLoyaltyPoints(invoice.loyalty_points_earned);
      const loyaltyPointsRedeemed = normalizeLoyaltyPoints(invoice.loyalty_points_redeemed);
      const loyaltyPointsDelta = loyaltyPointsEarned - loyaltyPointsRedeemed;
      if (invoice.customer_id && loyaltyPointsDelta !== 0) {
        const customerResult = await findRetailCustomerForUpdate(client, invoice.customer_id, actor.tenantId);
        assert(customerResult.rowCount > 0, "Customer not found.", 404);
        const customer = customerResult.rows[0];
        const currentBalance = Math.max(0, Number(customer.loyalty_points_balance || 0));
        const balanceAfter = Math.max(0, currentBalance - loyaltyPointsDelta);
        await recordLoyaltyEntry(client, {
          tenantId: actor.tenantId,
          customerId: customer.id,
          type: "SALE_DELETE",
          pointsDelta: -loyaltyPointsDelta,
          balanceAfter,
          referenceType: "sales_invoice",
          referenceId: invoiceId,
          note: `Loyalty reversed for deleted sale ${invoice.invoice_number}`,
          createdById: actor.id,
          businessDate: invoiceDate,
        });
      }

      const dueAmount = Number(invoice.due_amount || 0);
      if (invoice.customer_id && dueAmount > 0) {
        await findRetailCustomerForUpdate(client, invoice.customer_id, actor.tenantId);
        const latestEntry = await getLatestCustomerDueLedgerEntry(client, invoice.customer_id, actor.tenantId);
        const currentBalance = latestEntry ? latestEntry.balanceAfter : 0;
        const balanceAfter = currentBalance - dueAmount;

        await recordCustomerDueLedgerEntry(client, {
          tenantId: actor.tenantId,
          customerId: invoice.customer_id,
          type: CUSTOMER_DUE_LEDGER_TYPES.SALE_DUE,
          debit: 0,
          credit: dueAmount,
          balanceAfter,
          referenceType: "sales_invoice",
          referenceId: invoiceId,
          note: `Sale due reversed — ${invoice.invoice_number} deleted (${reason})`,
          createdById: actor.id,
          businessDate: invoiceDate,
        });

        await updateRetailCustomerCurrentDue(client, invoice.customer_id, actor.tenantId, Math.max(0, balanceAfter));
      }

      const paidAmount = Number(invoice.paid_amount || 0);
      if (this.financeAccountService && paidAmount > 0) {
        await this.financeAccountService.recordTransactionInClient(
          client,
          {
            accountType: "CASH",
            type: "WITHDRAWAL",
            amount: paidAmount,
            date: invoiceDate,
            note: `Sale ${invoice.invoice_number} deleted — cash reversed`,
          },
          actor,
        );
      }

      await this.recordActivity(client, actor, {
        actionType: SALES_INVOICE_ACTIONS.DELETE,
        entityType: "sales_invoice",
        entityId: invoiceId,
        reason,
        description: `${actor.name} moved sale ${invoice.invoice_number} to trash (${reason})`,
      });

      return { ok: true };
    });
  }

  async restoreSalesInvoice(invoiceId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await restoreSalesInvoice(client, invoiceId, actor.tenantId);
      assert(result.rowCount > 0, "Sales invoice not found in trash.", 404);
      const invoice = result.rows[0];

      const itemsResult = await getSalesInvoiceItems(client, invoiceId);
      const invoiceDate = String(invoice.invoice_date).slice(0, 10);
      const productIds = itemsResult.rows.map((item) => item.product_id);
      const productMap = await lockProducts(client, productIds, actor.tenantId);

      for (const item of itemsResult.rows) {
        const product = productMap.get(item.product_id);
        const quantity = Number(item.quantity_pieces || 0);
        assert(
          Number(product.stock_pieces || 0) >= quantity,
          `${product.name} does not have enough available stock to restore sale ${invoice.invoice_number}.`,
        );
      }

      await flipInvoiceSerialStatuses(client, invoiceId, actor.tenantId, {
        fromStatus: PRODUCT_SERIAL_STATUSES.IN_STOCK,
        toStatus: PRODUCT_SERIAL_STATUSES.SOLD,
      });

      // Restore: re-apply the same effects a fresh sale would — stock out, due back on the
      // ledger, cash back in — now that we know the stock is actually available to support it.
      for (const item of itemsResult.rows) {
        const quantity = Number(item.quantity_pieces || 0);
        const nextBalance = await applyStockDelta(client, item.product_id, actor.tenantId, -quantity, 0);
        await recordStockMovement(client, {
          tenantId: actor.tenantId,
          productId: item.product_id,
          type: STOCK_MOVEMENT_TYPES.SALE,
          quantityIn: 0,
          quantityOut: quantity,
          balanceAfter: nextBalance.stockPieces,
          referenceType: "sales_invoice",
          referenceId: invoiceId,
          note: `Sale ${invoice.invoice_number} restored from trash — stock re-applied`,
          createdById: actor.id,
          businessDate: invoiceDate,
        });
      }

      const loyaltyPointsEarned = normalizeLoyaltyPoints(invoice.loyalty_points_earned);
      const loyaltyPointsRedeemed = normalizeLoyaltyPoints(invoice.loyalty_points_redeemed);
      const loyaltyPointsDelta = loyaltyPointsEarned - loyaltyPointsRedeemed;
      if (invoice.customer_id && loyaltyPointsDelta !== 0) {
        const customerResult = await findRetailCustomerForUpdate(client, invoice.customer_id, actor.tenantId);
        assert(customerResult.rowCount > 0, "Customer not found.", 404);
        const customer = customerResult.rows[0];
        const currentBalance = Math.max(0, Number(customer.loyalty_points_balance || 0));
        const balanceAfter = Math.max(0, currentBalance + loyaltyPointsDelta);
        await recordLoyaltyEntry(client, {
          tenantId: actor.tenantId,
          customerId: customer.id,
          type: "SALE_RESTORE",
          pointsDelta: loyaltyPointsDelta,
          balanceAfter,
          referenceType: "sales_invoice",
          referenceId: invoiceId,
          note: `Loyalty restored for sale ${invoice.invoice_number}`,
          createdById: actor.id,
          businessDate: invoiceDate,
        });
      }

      const dueAmount = Number(invoice.due_amount || 0);
      if (invoice.customer_id && dueAmount > 0) {
        await findRetailCustomerForUpdate(client, invoice.customer_id, actor.tenantId);
        const latestEntry = await getLatestCustomerDueLedgerEntry(client, invoice.customer_id, actor.tenantId);
        const currentBalance = latestEntry ? latestEntry.balanceAfter : 0;
        const balanceAfter = currentBalance + dueAmount;

        await recordCustomerDueLedgerEntry(client, {
          tenantId: actor.tenantId,
          customerId: invoice.customer_id,
          type: CUSTOMER_DUE_LEDGER_TYPES.SALE_DUE,
          debit: dueAmount,
          credit: 0,
          balanceAfter,
          referenceType: "sales_invoice",
          referenceId: invoiceId,
          note: `Sale due restored — ${invoice.invoice_number} restored from trash`,
          createdById: actor.id,
          businessDate: invoiceDate,
        });

        await updateRetailCustomerCurrentDue(client, invoice.customer_id, actor.tenantId, Math.max(0, balanceAfter));
      }

      const paidAmount = Number(invoice.paid_amount || 0);
      if (this.financeAccountService && paidAmount > 0) {
        await this.financeAccountService.recordTransactionInClient(
          client,
          {
            accountType: "CASH",
            type: "DEPOSIT",
            amount: paidAmount,
            date: invoiceDate,
            note: `Sale ${invoice.invoice_number} restored from trash — cash re-applied`,
          },
          actor,
        );
      }

      await this.recordActivity(client, actor, {
        actionType: SALES_INVOICE_ACTIONS.RESTORE,
        entityType: "sales_invoice",
        entityId: invoiceId,
        description: `${actor.name} restored sale ${invoice.invoice_number} from trash`,
      });

      return { ok: true };
    });
  }

  async listTrashedSalesInvoices(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const tenantId = actor.tenantId;

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listTrashedSalesInvoices(client, { tenantId, limit, offset }),
        countTrashedSalesInvoices(client, tenantId),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async getDailySalesReport(query = {}, actor) {
    const dateFrom = String(query.dateFrom || "").trim()
      ? normalizeIsoDate(query.dateFrom, query.dateFrom, DATE_ERROR)
      : undefined;
    const dateTo = String(query.dateTo || "").trim()
      ? normalizeIsoDate(query.dateTo, query.dateTo, DATE_ERROR)
      : undefined;
    const saleType = ["WHOLESALE", "RETAIL", "QUICK_SALE"].includes(query.saleType) ? query.saleType : undefined;

    return this.databaseManager.withClient(async (client) => {
      const rows = await getDailySalesReport(client, { tenantId: actor.tenantId, dateFrom, dateTo, saleType });
      return { rows, dateFrom: dateFrom || null, dateTo: dateTo || null, saleType: saleType || null };
    });
  }
}
