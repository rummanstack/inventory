import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { cleanMoney, normalizeQuotationItem } from "../lib/normalizers.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { QUOTATION_STATUSES, QUOTATION_STATUS_VALUES, QUOTATION_CONVERTIBLE_STATUSES, QUOTATION_CLOSED_STATUSES } from "../lib/quotations.js";
import { QUOTATION_ACTIONS } from "../lib/auditActions.js";
import { STOCK_MOVEMENT_TYPES } from "../lib/stockMovements.js";
import { CUSTOMER_DUE_LEDGER_TYPES } from "../lib/customerDueLedger.js";
import { nextQuotationNumber } from "../lib/quotationNumber.js";
import { nextInvoiceNumber } from "../lib/salesNumber.js";
import {
  countQuotations,
  countTrashedQuotations,
  deleteQuotationItems,
  findQuotationById,
  findQuotationForUpdate,
  insertQuotation,
  insertQuotationItem,
  listQuotationItems,
  listQuotationsPage,
  listTrashedQuotations,
  mapQuotation,
  markQuotationConverted,
  permanentlyDeleteQuotation,
  restoreQuotation,
  softDeleteQuotation,
  updateQuotation,
} from "../repositories/quotationRepository.js";
import {
  insertSalesInvoice,
  insertSalesInvoiceItem,
} from "../repositories/salesInvoiceRepository.js";
import {
  logActivity,
  lockProducts,
  recordStockMovement,
  applyStockDelta,
  recordCustomerDueLedgerEntry,
} from "./shared/inventoryHelpers.js";
import { getLatestCustomerDueLedgerEntry } from "../repositories/customerDueLedgerRepository.js";
import { findRetailCustomerForUpdate } from "../repositories/retailCustomerRepository.js";

const DATE_ERROR = "Date must be in YYYY-MM-DD format.";

function calcTotals(items, discountAmount, taxRate) {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const afterDiscount = Math.max(0, subtotal - Math.max(0, discountAmount));
  const taxAmount = Math.round(afterDiscount * Math.max(0, taxRate) / 100 * 100) / 100;
  const totalAmount = afterDiscount + taxAmount;
  return { subtotal, taxAmount, totalAmount };
}

export class QuotationService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  async listQuotations(query, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const filters = {
      tenantId: actor.tenantId,
      status: String(query.status || "").trim().toUpperCase() || null,
      customerId: String(query.customerId || "").trim() || null,
      search: String(query.search || "").trim() || null,
      dateFrom: String(query.dateFrom || "").trim() || null,
      dateTo: String(query.dateTo || "").trim() || null,
    };

    return this.databaseManager.withClient(async (client) => {
      const [total, items] = await Promise.all([
        countQuotations(client, filters),
        listQuotationsPage(client, { ...filters, limit, offset }),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async getQuotation(id, actor) {
    return this.databaseManager.withClient(async (client) => {
      const result = await findQuotationById(client, id, actor.tenantId);
      assert(result.rowCount > 0, "Quotation not found.", 404);
      return mapQuotation(result.rows[0]);
    });
  }

  async createQuotation(input, actor) {
    const rawItems = Array.isArray(input.items) ? input.items : [];
    assert(rawItems.length > 0, "At least one line item is required.");

    const items = rawItems.map(normalizeQuotationItem);
    const discountAmount = Math.max(0, cleanMoney(input.discountAmount));
    const taxRate = Math.max(0, cleanMoney(input.taxRate));
    const { subtotal, taxAmount, totalAmount } = calcTotals(items, discountAmount, taxRate);

    const quoteDate = normalizeIsoDate(input.quoteDate, new Date().toISOString().slice(0, 10), DATE_ERROR);
    const validityDays = Math.max(1, Math.round(Number(input.validityDays || 7)));
    const validUntilDate = new Date(quoteDate);
    validUntilDate.setDate(validUntilDate.getDate() + validityDays);
    const validUntil = validUntilDate.toISOString().slice(0, 10);

    const quotation = {
      id: createId("quotation"),
      tenantId: actor.tenantId,
      customerId: String(input.customerId || "").trim() || null,
      customerName: String(input.customerName || "").trim(),
      customerPhone: String(input.customerPhone || "").trim(),
      customerEmail: String(input.customerEmail || "").trim(),
      status: QUOTATION_STATUSES.DRAFT,
      validityDays,
      validUntil,
      quoteDate,
      taxRate,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      notes: String(input.notes || "").trim(),
      createdById: actor.id,
    };

    return this.databaseManager.withTransaction(async (client) => {
      const year = new Date(quoteDate).getUTCFullYear();
      quotation.quoteNumber = await nextQuotationNumber(client, actor.tenantId, year);

      await insertQuotation(client, quotation);
      for (const item of items) {
        await insertQuotationItem(client, item, quotation.id, actor.tenantId);
      }

      await this.recordActivity(client, actor, {
        actionType: QUOTATION_ACTIONS.CREATE,
        entityType: "quotation",
        entityId: quotation.id,
        description: `${actor.name} created quotation ${quotation.quoteNumber}`,
        metadata: { quoteNumber: quotation.quoteNumber, totalAmount },
      });

      const result = await findQuotationById(client, quotation.id, actor.tenantId);
      return mapQuotation(result.rows[0]);
    });
  }

  async updateQuotation(id, input, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findQuotationForUpdate(client, id, actor.tenantId);
      assert(existingResult.rowCount > 0, "Quotation not found.", 404);
      const existing = existingResult.rows[0];

      assert(!QUOTATION_CLOSED_STATUSES.includes(existing.status), "This quotation is closed and cannot be edited.");

      const status = QUOTATION_STATUS_VALUES.includes(String(input.status || "").trim().toUpperCase())
        ? String(input.status).trim().toUpperCase()
        : existing.status;

      const rawItems = Array.isArray(input.items) ? input.items : null;
      let items;
      let subtotal = Number(existing.subtotal);
      let taxAmount = Number(existing.tax_amount);
      let totalAmount = Number(existing.total_amount);
      const discountAmount = input.discountAmount !== undefined ? Math.max(0, cleanMoney(input.discountAmount)) : Number(existing.discount_amount);
      const taxRate = input.taxRate !== undefined ? Math.max(0, cleanMoney(input.taxRate)) : Number(existing.tax_rate);

      if (rawItems) {
        items = rawItems.map(normalizeQuotationItem);
        assert(items.length > 0, "At least one line item is required.");
        ({ subtotal, taxAmount, totalAmount } = calcTotals(items, discountAmount, taxRate));
      }

      const quoteDate = input.quoteDate
        ? normalizeIsoDate(input.quoteDate, existing.quote_date, DATE_ERROR)
        : String(existing.quote_date).slice(0, 10);
      const validityDays = input.validityDays !== undefined ? Math.max(1, Math.round(Number(input.validityDays))) : Number(existing.validity_days);
      const validUntilDate = new Date(quoteDate);
      validUntilDate.setDate(validUntilDate.getDate() + validityDays);
      const validUntil = validUntilDate.toISOString().slice(0, 10);

      const patch = {
        id,
        tenantId: actor.tenantId,
        status,
        customerId: input.customerId !== undefined ? (String(input.customerId || "").trim() || null) : (existing.customer_id || null),
        customerName: input.customerName !== undefined ? String(input.customerName || "").trim() : (existing.customer_name || ""),
        customerPhone: input.customerPhone !== undefined ? String(input.customerPhone || "").trim() : (existing.customer_phone || ""),
        customerEmail: input.customerEmail !== undefined ? String(input.customerEmail || "").trim() : (existing.customer_email || ""),
        validityDays,
        validUntil,
        quoteDate,
        taxRate,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        notes: input.notes !== undefined ? String(input.notes || "").trim() : (existing.notes || ""),
      };

      await updateQuotation(client, patch);

      if (items) {
        await deleteQuotationItems(client, id);
        for (const item of items) {
          await insertQuotationItem(client, item, id, actor.tenantId);
        }
      }

      await this.recordActivity(client, actor, {
        actionType: QUOTATION_ACTIONS.UPDATE,
        entityType: "quotation",
        entityId: id,
        description: `${actor.name} updated quotation ${existing.quote_number} to ${status}`,
        metadata: { quoteNumber: existing.quote_number, status },
      });

      const result = await findQuotationById(client, id, actor.tenantId);
      return mapQuotation(result.rows[0]);
    });
  }

  async convertToInvoice(id, input, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findQuotationForUpdate(client, id, actor.tenantId);
      assert(existingResult.rowCount > 0, "Quotation not found.", 404);
      const existing = existingResult.rows[0];

      assert(
        QUOTATION_CONVERTIBLE_STATUSES.includes(existing.status),
        `Cannot convert a quotation with status ${existing.status}.`,
        400,
      );

      const quotationItems = await listQuotationItems(client, id);
      assert(quotationItems.length > 0, "Quotation has no items.", 400);

      const paymentMethod = String(input.paymentMethod || "CASH").trim().toUpperCase();
      const paidAmount = Math.max(0, cleanMoney(input.paidAmount));
      const invoiceDate = normalizeIsoDate(input.invoiceDate, new Date().toISOString().slice(0, 10), DATE_ERROR);
      const invoiceNote = String(input.note || existing.notes || "").trim();
      const customerId = existing.customer_id || null;
      const totalAmount = Number(existing.total_amount);
      const dueAmount = Math.max(0, totalAmount - paidAmount);

      // Lock and validate stock for all product items
      const productIds = quotationItems.filter((item) => item.product_id).map((item) => item.product_id);
      const productMap = productIds.length > 0 ? await lockProducts(client, productIds, actor.tenantId) : new Map();

      for (const item of quotationItems) {
        if (!item.product_id) continue;
        const product = productMap.get(item.product_id);
        assert(product, `Product not found: ${item.product_name}.`, 404);
        assert(
          Number(product.stock_pieces) >= Number(item.quantity),
          `Insufficient stock for "${item.product_name}". Available: ${product.stock_pieces}, required: ${item.quantity}.`,
          400,
        );
      }

      // Generate invoice number
      const year = new Date(invoiceDate).getUTCFullYear();
      const invoiceNumber = await nextInvoiceNumber(client, actor.tenantId, year);
      const invoiceId = createId("invoice");

      // Resolve customer for snapshot
      let customerNameSnapshot = existing.customer_name || "";
      let customerPhoneSnapshot = existing.customer_phone || "";
      let customerCurrentDue = 0;
      if (customerId) {
        const customerResult = await findRetailCustomerForUpdate(client, customerId, actor.tenantId);
        if (customerResult.rowCount > 0) {
          const cust = customerResult.rows[0];
          customerNameSnapshot = cust.name || customerNameSnapshot;
          customerPhoneSnapshot = cust.phone || customerPhoneSnapshot;
          customerCurrentDue = Number(cust.current_due || 0);
        }
      }

      // Insert sales invoice
      await insertSalesInvoice(client, {
        id: invoiceId,
        tenantId: actor.tenantId,
        invoiceNumber,
        invoiceDate,
        customerId,
        customerType: customerId ? "REGISTERED" : "WALK_IN",
        saleType: "RETAIL",
        subtotal: Number(existing.subtotal),
        discount: Number(existing.discount_amount),
        taxRate: Number(existing.tax_rate),
        taxAmount: Number(existing.tax_amount),
        totalAmount,
        paidAmount,
        dueAmount,
        paymentMethod,
        totalProfit: 0,
        note: invoiceNote,
        createdById: actor.id,
        loyaltyPointsEarned: 0,
        loyaltyPointsRedeemed: 0,
        loyaltyRedeemAmount: 0,
        customerNameSnapshot,
        customerPhoneSnapshot,
      });

      // Insert invoice items and deduct stock
      for (const item of quotationItems) {
        const invoiceItemId = createId("inv-item");
        const product = item.product_id ? productMap.get(item.product_id) : null;
        await insertSalesInvoiceItem(client, {
          id: invoiceItemId,
          tenantId: actor.tenantId,
          salesInvoiceId: invoiceId,
          productId: item.product_id || null,
          productName: item.product_name,
          quantityPieces: Number(item.quantity),
          actualSalePrice: Number(item.unit_price),
          costPriceSnapshot: product ? Number(product.cost_price || 0) : 0,
          lineDiscount: Number(item.discount_amount),
          lineTotal: Number(item.line_total),
          taxRate: 0,
          taxAmount: 0,
          brandSnapshot: product?.brand || "",
          modelSnapshot: product?.model || "",
          barcodeSnapshot: product?.barcode || "",
          warrantyMonthsSnapshot: product?.warranty_months || 0,
        });

        if (item.product_id) {
          const { stockPieces } = await applyStockDelta(client, item.product_id, actor.tenantId, -Number(item.quantity), 0);
          await recordStockMovement(client, {
            tenantId: actor.tenantId,
            productId: item.product_id,
            type: STOCK_MOVEMENT_TYPES.SALE,
            quantityIn: 0,
            quantityOut: Number(item.quantity),
            balanceAfter: stockPieces,
            referenceType: "sales_invoice",
            referenceId: invoiceId,
            note: `Converted from quotation ${existing.quote_number}`,
            createdById: actor.id,
            businessDate: invoiceDate,
          });
        }
      }

      // Record customer due ledger if there's a due amount
      if (dueAmount > 0 && customerId) {
        const latestDueEntry = await getLatestCustomerDueLedgerEntry(client, customerId, actor.tenantId);
        const prevBalance = latestDueEntry ? Number(latestDueEntry.balance_after) : customerCurrentDue;
        const newBalance = prevBalance + dueAmount;

        await recordCustomerDueLedgerEntry(client, {
          tenantId: actor.tenantId,
          customerId,
          type: CUSTOMER_DUE_LEDGER_TYPES.SALE,
          debit: dueAmount,
          credit: 0,
          balanceAfter: newBalance,
          referenceType: "sales_invoice",
          referenceId: invoiceId,
          note: `From quotation ${existing.quote_number}`,
          createdById: actor.id,
          businessDate: invoiceDate,
        });

        await client.query(
          `UPDATE retail_customers SET current_due = current_due + $3 WHERE id = $1 AND tenant_id = $2`,
          [customerId, actor.tenantId, dueAmount],
        );
      }

      // Mark quotation converted
      await markQuotationConverted(client, id, actor.tenantId, invoiceId);

      await this.recordActivity(client, actor, {
        actionType: QUOTATION_ACTIONS.CONVERT,
        entityType: "quotation",
        entityId: id,
        description: `${actor.name} converted quotation ${existing.quote_number} to invoice ${invoiceNumber}`,
        metadata: { quoteNumber: existing.quote_number, invoiceNumber, invoiceId },
      });

      return { ok: true, invoiceId, invoiceNumber };
    });
  }

  async removeQuotation(id, actor, reason) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await softDeleteQuotation(client, id, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });
      assert(result.rowCount > 0, "Quotation not found.", 404);

      await this.recordActivity(client, actor, {
        actionType: QUOTATION_ACTIONS.DELETE,
        entityType: "quotation",
        entityId: id,
        description: `${actor.name} deleted quotation ${id}${reason ? ` (${reason})` : ""}`,
      });

      return { ok: true };
    });
  }

  async listTrashed(query, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    return this.databaseManager.withClient(async (client) => {
      const [total, items] = await Promise.all([
        countTrashedQuotations(client, actor.tenantId),
        listTrashedQuotations(client, { tenantId: actor.tenantId, limit, offset }),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    });
  }
}
