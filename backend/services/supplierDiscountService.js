import { assert } from "../lib/errors.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { createId } from "../lib/ids.js";
import { SUPPLIER_DISCOUNT_ACTIONS } from "../lib/auditActions.js";
import { SUPPLIER_DUE_LEDGER_TYPES } from "../lib/supplierDueLedger.js";
import {
  countSupplierDiscounts,
  deleteSupplierDiscount,
  deleteSupplierDiscountByReference,
  findSupplierDiscountForUpdate,
  insertSupplierDiscount,
  listSupplierDiscountsPage,
} from "../repositories/supplierDiscountRepository.js";
import { getLatestSupplierDueLedgerEntry } from "../repositories/supplierDueLedgerRepository.js";
import { logActivity, recordSupplierDueLedgerEntry } from "./shared/inventoryHelpers.js";

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
    const DATE_ERROR = "Date must be in YYYY-MM-DD format.";
    const dateFrom = String(query.dateFrom || "").trim()
      ? normalizeIsoDate(query.dateFrom, query.dateFrom, DATE_ERROR)
      : undefined;
    const dateTo = String(query.dateTo || "").trim()
      ? normalizeIsoDate(query.dateTo, query.dateTo, DATE_ERROR)
      : undefined;
    const supplierId = String(query.supplierId || "").trim() || undefined;

    return this.databaseManager.withClient(async (client) => {
      const filters = { tenantId: actor.tenantId, dateFrom, dateTo, supplierId };
      const [items, total] = await Promise.all([
        listSupplierDiscountsPage(client, { ...filters, limit, offset }),
        countSupplierDiscounts(client, filters),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    });
  }

  // Called inside an existing transaction from settlementService.
  // previousAmount: discount value before this save (0 for creates).
  // supplierId: which supplier gave this discount (optional for settlement discounts).
  // previousSupplierId: supplier linked before this update (to reverse their due ledger if changed).
  async recordFromSettlement(
    client,
    { tenantId, settlementId, dsrName, discountDate, amount, note, previousAmount = 0, supplierId = null, previousSupplierId = null },
    actor,
  ) {
    await deleteSupplierDiscountByReference(client, "settlement", settlementId, tenantId);

    if (amount > 0) {
      await insertSupplierDiscount(client, {
        id: createId("supplier-discount"),
        tenantId,
        supplierId,
        discountDate,
        amount,
        dsrName,
        referenceType: "settlement",
        referenceId: settlementId,
        note: note || `Settlement discount — ${dsrName}`,
        createdById: actor?.id || null,
      });
    }

    // Supplier due ledger: reverse old supplier credit, apply new supplier credit.
    // Only touches the due ledger if the supplier is specified.
    if (previousSupplierId && previousAmount > 0) {
      const latestOld = await getLatestSupplierDueLedgerEntry(client, previousSupplierId, tenantId);
      const oldBalance = latestOld ? latestOld.balanceAfter : 0;
      await recordSupplierDueLedgerEntry(client, {
        tenantId,
        supplierId: previousSupplierId,
        type: SUPPLIER_DUE_LEDGER_TYPES.DISCOUNT,
        debit: previousAmount,
        credit: 0,
        balanceAfter: Number(oldBalance) + previousAmount,
        referenceType: "supplier_discount",
        referenceId: settlementId,
        note: `Discount reversed — ${dsrName}`,
        createdById: actor?.id || null,
        businessDate: discountDate,
      });
    }

    if (supplierId && amount > 0) {
      const latestNew = await getLatestSupplierDueLedgerEntry(client, supplierId, tenantId);
      const newBalance = latestNew ? latestNew.balanceAfter : 0;
      await recordSupplierDueLedgerEntry(client, {
        tenantId,
        supplierId,
        type: SUPPLIER_DUE_LEDGER_TYPES.DISCOUNT,
        debit: 0,
        credit: amount,
        balanceAfter: Number(newBalance) - amount,
        referenceType: "supplier_discount",
        referenceId: settlementId,
        note: `Supplier discount — ${dsrName}`,
        createdById: actor?.id || null,
        businessDate: discountDate,
      });
    }

    const cashDelta = amount - previousAmount;
    if (this.financeAccountService && cashDelta !== 0) {
      await this.financeAccountService.recordTransactionInClient(
        client,
        {
          accountType: "CASH",
          type: cashDelta > 0 ? "DEPOSIT" : "WITHDRAWAL",
          amount: Math.abs(cashDelta),
          date: discountDate,
          note: cashDelta > 0
            ? `Supplier discount — ${dsrName} (${discountDate})`
            : `Supplier discount adjusted — ${dsrName} (${discountDate})`,
        },
        actor,
      );
    }
  }

  async removeSupplierDiscount(discountId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findSupplierDiscountForUpdate(client, discountId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Discount not found.", 404);
      const discount = existingResult.rows[0];
      const amount = Number(discount.amount || 0);
      const supplierId = discount.supplier_id || null;

      await deleteSupplierDiscount(client, discountId, actor.tenantId);

      // Reverse supplier due ledger if linked to a supplier.
      if (supplierId && amount > 0) {
        const latest = await getLatestSupplierDueLedgerEntry(client, supplierId, actor.tenantId);
        const balance = latest ? latest.balanceAfter : 0;
        await recordSupplierDueLedgerEntry(client, {
          tenantId: actor.tenantId,
          supplierId,
          type: SUPPLIER_DUE_LEDGER_TYPES.DISCOUNT,
          debit: amount,
          credit: 0,
          balanceAfter: Number(balance) + amount,
          referenceType: "supplier_discount",
          referenceId: discountId,
          note: `Discount cleared — ${discount.dsr_name}`,
          createdById: actor.id,
          businessDate: String(discount.discount_date).slice(0, 10),
        });
      }

      if (this.financeAccountService && amount > 0) {
        await this.financeAccountService.recordTransactionInClient(
          client,
          {
            accountType: "CASH",
            type: "WITHDRAWAL",
            amount,
            date: String(discount.discount_date).slice(0, 10),
            note: `Supplier discount cleared — ${discount.dsr_name}`,
          },
          actor,
        );
      }

      await this.recordActivity(client, actor, {
        actionType: SUPPLIER_DISCOUNT_ACTIONS.DELETE,
        entityType: "supplier_discount",
        entityId: discountId,
        description: `${actor.name} cleared supplier discount of ${amount} (${discount.dsr_name})`,
        metadata: { amount },
      });

      return { ok: true };
    });
  }
}
