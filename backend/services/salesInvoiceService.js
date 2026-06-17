import { assert } from "../lib/errors.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { normalizeSalesInvoice, cleanMoney } from "../lib/normalizers.js";
import { STOCK_MOVEMENT_TYPES } from "../lib/stockMovements.js";
import { CUSTOMER_DUE_LEDGER_TYPES } from "../lib/customerDueLedger.js";
import { SALES_INVOICE_ACTIONS } from "../lib/auditActions.js";
import { nextInvoiceNumber } from "../lib/salesNumber.js";
import { findRetailCustomerById, updateRetailCustomerCurrentDue } from "../repositories/retailCustomerRepository.js";
import { getLatestCustomerDueLedgerEntry } from "../repositories/customerDueLedgerRepository.js";
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
  getProfitReport,
} from "../repositories/salesInvoiceRepository.js";
import { getProfitAdjustmentsByDate } from "../repositories/salesReturnRepository.js";
import {
  logActivity,
  lockProducts,
  recordStockMovement,
  recordCustomerDueLedgerEntry,
  applyStockDelta,
} from "./shared/inventoryHelpers.js";

const DATE_ERROR = "Invoice date must be in YYYY-MM-DD format.";

async function seedOpeningCustomerLedgerIfNeeded(client, customer, tenantId, actor) {
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
    const base = normalizeSalesInvoice(input);
    base.tenantId = actor.tenantId;
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

    return this.databaseManager.withTransaction(async (client) => {
      return this.createSalesInvoiceRecord(client, base, actor);
    });
  }

  async createSalesInvoiceRecord(client, base, actor) {
    const productIds = base.items.map((item) => item.productId);
    const productMap = await lockProducts(client, productIds, actor.tenantId);

    let totalProfit = -base.discount;
    for (const item of base.items) {
      const product = productMap.get(item.productId);
      assert(
        Number(product.stock_pieces || 0) >= item.quantityPieces,
        `${product.name} does not have enough available stock for this sale.`,
      );
      const costPriceSnapshot = Number(product.purchase_price || 0);
      item.productName = item.productName || product.name;
      item.costPriceSnapshot = costPriceSnapshot;
      totalProfit += item.lineTotal - costPriceSnapshot * item.quantityPieces;
    }

    const year = new Date(base.invoiceDate).getUTCFullYear();
    const invoiceNumber = await nextInvoiceNumber(client, actor.tenantId, year);

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
      });
    }

    let customer = null;
    if (base.customerId) {
      const customerResult = await findRetailCustomerById(client, base.customerId, actor.tenantId);
      assert(customerResult.rowCount > 0, "Customer not found.", 404);
      customer = customerResult.rows[0];

      let currentBalance = await seedOpeningCustomerLedgerIfNeeded(client, customer, actor.tenantId, actor);

      if (base.dueAmount > 0) {
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
        });

        await updateRetailCustomerCurrentDue(client, customer.id, actor.tenantId, Math.max(0, currentBalance));
      }
    }

    await this.recordActivity(client, actor, {
      actionType: SALES_INVOICE_ACTIONS.CREATE,
      entityType: "sales_invoice",
      entityId: base.id,
      description: `${actor.name} recorded sale ${invoiceNumber}${customer ? ` to ${customer.name}` : ""}`,
      metadata: {
        invoiceNumber,
        saleType: base.saleType,
        customerId: base.customerId,
        totalAmount: base.totalAmount,
        dueAmount: base.dueAmount,
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
        });
      }

      await softDeleteSalesInvoice(client, invoiceId, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });

      const dueAmount = Number(invoice.due_amount || 0);
      if (invoice.customer_id && dueAmount > 0) {
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
            date: String(invoice.invoice_date).slice(0, 10),
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
        });
      }

      const dueAmount = Number(invoice.due_amount || 0);
      if (invoice.customer_id && dueAmount > 0) {
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
            date: String(invoice.invoice_date).slice(0, 10),
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

  async getProfitReport(query = {}, actor) {
    const dateFrom = String(query.dateFrom || "").trim()
      ? normalizeIsoDate(query.dateFrom, query.dateFrom, DATE_ERROR)
      : undefined;
    const dateTo = String(query.dateTo || "").trim()
      ? normalizeIsoDate(query.dateTo, query.dateTo, DATE_ERROR)
      : undefined;
    const saleType = ["WHOLESALE", "RETAIL", "QUICK_SALE"].includes(query.saleType) ? query.saleType : undefined;

    return this.databaseManager.withClient(async (client) => {
      const [rows, adjustments] = await Promise.all([
        getProfitReport(client, { tenantId: actor.tenantId, dateFrom, dateTo, saleType }),
        getProfitAdjustmentsByDate(client, { tenantId: actor.tenantId, dateFrom, dateTo }),
      ]);

      const adjustmentByDate = new Map(adjustments.map((entry) => [String(entry.date), entry.adjustment]));
      const merged = rows.map((row) => {
        const adjustment = adjustmentByDate.get(String(row.date)) || 0;
        return { ...row, totalProfit: row.totalProfit + adjustment };
      });

      const totals = merged.reduce(
        (acc, row) => {
          acc.totalSales += row.totalSales;
          acc.totalProfit += row.totalProfit;
          acc.invoiceCount += row.invoiceCount;
          return acc;
        },
        { totalSales: 0, totalProfit: 0, invoiceCount: 0 },
      );

      return { rows: merged, totals, dateFrom: dateFrom || null, dateTo: dateTo || null, saleType: saleType || null };
    });
  }
}
