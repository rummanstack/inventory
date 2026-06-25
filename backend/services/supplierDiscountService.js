import { assert } from "../lib/errors.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { normalizeSupplierDiscount } from "../lib/normalizers.js";
import { SUPPLIER_DUE_LEDGER_TYPES } from "../lib/supplierDueLedger.js";
import { SUPPLIER_DISCOUNT_ACTIONS } from "../lib/auditActions.js";
import { findSupplierForUpdate, updateSupplierCurrentDue } from "../repositories/supplierRepository.js";
import { getLatestSupplierDueLedgerEntry } from "../repositories/supplierDueLedgerRepository.js";
import {
  countSupplierDiscounts,
  deleteSupplierDiscount,
  findSupplierDiscountForUpdate,
  insertSupplierDiscount,
  listSupplierDiscountsPage,
  mapSupplierDiscount,
} from "../repositories/supplierDiscountRepository.js";
import { logActivity, recordSupplierDueLedgerEntry } from "./shared/inventoryHelpers.js";

const DATE_ERROR = "Discount date must be in YYYY-MM-DD format.";

export class SupplierDiscountService {
  constructor(databaseManager, { auditService, financeAccountService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.financeAccountService = financeAccountService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  async listSupplierDiscounts(query = {}, actor) {
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
        listSupplierDiscountsPage(client, { ...filters, limit, offset }),
        countSupplierDiscounts(client, filters),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async saveSupplierDiscount(input, actor) {
    const base = normalizeSupplierDiscount(input);
    base.tenantId = actor.tenantId;
    assert(base.supplierId, "Supplier is required.");
    assert(base.discountDate, "Discount date is required.");
    base.discountDate = normalizeIsoDate(base.discountDate, base.discountDate, DATE_ERROR);
    assert(base.amount > 0, "Amount must be greater than zero.");

    return this.databaseManager.withTransaction(async (client) => {
      const supplierResult = await findSupplierForUpdate(client, base.supplierId, actor.tenantId);
      assert(supplierResult.rowCount > 0, "Supplier not found.", 404);
      const supplier = supplierResult.rows[0];

      const latestEntry = await getLatestSupplierDueLedgerEntry(client, supplier.id, actor.tenantId);
      const currentBalance = latestEntry ? latestEntry.balanceAfter : Math.max(0, Number(supplier.opening_due || 0));

      assert(base.amount <= currentBalance, `Discount amount exceeds current due balance of ${currentBalance}.`, 400);

      const insertResult = await insertSupplierDiscount(client, { ...base, createdById: actor.id });
      const balanceAfter = currentBalance - base.amount;

      await recordSupplierDueLedgerEntry(client, {
        tenantId: actor.tenantId,
        supplierId: supplier.id,
        type: SUPPLIER_DUE_LEDGER_TYPES.DISCOUNT,
        debit: 0,
        credit: base.amount,
        balanceAfter,
        referenceType: "supplier_discount",
        referenceId: base.id,
        note: base.note || `Discount from ${supplier.name}`,
        createdById: actor.id,
        businessDate: base.discountDate,
      });

      await updateSupplierCurrentDue(client, supplier.id, actor.tenantId, Math.max(0, balanceAfter));

      if (this.financeAccountService) {
        await this.financeAccountService.recordTransactionInClient(
          client,
          {
            accountType: "CASH",
            type: "DEPOSIT",
            amount: base.amount,
            date: base.discountDate,
            note: base.note || `Supplier discount — ${supplier.name}`,
          },
          actor,
        );
      }

      await this.recordActivity(client, actor, {
        actionType: SUPPLIER_DISCOUNT_ACTIONS.CREATE,
        entityType: "supplier_discount",
        entityId: base.id,
        description: `${actor.name} recorded discount of ${base.amount} from ${supplier.name}`,
        metadata: { supplierId: supplier.id, amount: base.amount },
      });

      return mapSupplierDiscount({ ...insertResult.rows[0], supplier_name: supplier.name });
    });
  }

  async removeSupplierDiscount(discountId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findSupplierDiscountForUpdate(client, discountId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Supplier discount not found.", 404);
      const discount = existingResult.rows[0];
      const amount = Number(discount.amount || 0);

      await deleteSupplierDiscount(client, discountId, actor.tenantId);

      await findSupplierForUpdate(client, discount.supplier_id, actor.tenantId);
      const latestEntry = await getLatestSupplierDueLedgerEntry(client, discount.supplier_id, actor.tenantId);
      const currentBalance = latestEntry ? latestEntry.balanceAfter : 0;
      const balanceAfter = currentBalance + amount;

      await recordSupplierDueLedgerEntry(client, {
        tenantId: actor.tenantId,
        supplierId: discount.supplier_id,
        type: SUPPLIER_DUE_LEDGER_TYPES.DISCOUNT,
        debit: amount,
        credit: 0,
        balanceAfter,
        referenceType: "supplier_discount",
        referenceId: discountId,
        note: `Discount reversed — supplier discount deleted`,
        createdById: actor.id,
        businessDate: String(discount.discount_date).slice(0, 10),
      });

      await updateSupplierCurrentDue(client, discount.supplier_id, actor.tenantId, Math.max(0, balanceAfter));

      if (this.financeAccountService && amount > 0) {
        await this.financeAccountService.recordTransactionInClient(
          client,
          {
            accountType: "CASH",
            type: "WITHDRAWAL",
            amount,
            date: String(discount.discount_date).slice(0, 10),
            note: `Supplier discount reversed — deleted`,
          },
          actor,
        );
      }

      await this.recordActivity(client, actor, {
        actionType: SUPPLIER_DISCOUNT_ACTIONS.DELETE,
        entityType: "supplier_discount",
        entityId: discountId,
        description: `${actor.name} deleted supplier discount of ${amount}`,
        metadata: { supplierId: discount.supplier_id, amount },
      });

      return { ok: true };
    });
  }
}
