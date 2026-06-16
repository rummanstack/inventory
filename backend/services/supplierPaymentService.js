import { assert } from "../lib/errors.js";
import { diffFields } from "../lib/auditDiff.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { normalizeSupplierPayment } from "../lib/normalizers.js";
import { SUPPLIER_DUE_LEDGER_TYPES } from "../lib/supplierDueLedger.js";
import { SUPPLIER_PAYMENT_ACTIONS } from "../lib/auditActions.js";
import { findSupplierById, updateSupplierCurrentDue } from "../repositories/supplierRepository.js";
import { getLatestSupplierDueLedgerEntry } from "../repositories/supplierDueLedgerRepository.js";
import {
  countSupplierPayments,
  countTrashedSupplierPayments,
  findSupplierPaymentById,
  findSupplierPaymentForUpdate,
  insertSupplierPayment,
  listSupplierPaymentsPage,
  listTrashedSupplierPayments,
  mapSupplierPayment,
  restoreSupplierPayment,
  softDeleteSupplierPayment,
  updateSupplierPayment,
} from "../repositories/supplierPaymentRepository.js";
import { logActivity, recordSupplierDueLedgerEntry } from "./shared/inventoryHelpers.js";

const DATE_ERROR = "Payment date must be in YYYY-MM-DD format.";

export class SupplierPaymentService {
  constructor(databaseManager, { auditService, financeAccountService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.financeAccountService = financeAccountService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  async listSupplierPayments(query = {}, actor) {
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
        listSupplierPaymentsPage(client, { ...filters, limit, offset }),
        countSupplierPayments(client, filters),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async getSupplierPayment(paymentId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const result = await findSupplierPaymentById(client, paymentId, actor.tenantId);
      assert(result.rowCount > 0, "Supplier payment not found.", 404);
      return mapSupplierPayment(result.rows[0]);
    });
  }

  async saveSupplierPayment(input, actor) {
    const base = normalizeSupplierPayment(input);
    base.tenantId = actor.tenantId;
    assert(base.supplierId, "Supplier is required.");
    assert(base.paymentDate, "Payment date is required.");
    base.paymentDate = normalizeIsoDate(base.paymentDate, base.paymentDate, DATE_ERROR);
    assert(base.amount > 0, "Amount must be greater than zero.");

    return this.databaseManager.withTransaction(async (client) => {
      if (input.id) {
        return this.updateSupplierPaymentRecord(client, base, input, actor);
      }

      return this.createSupplierPaymentRecord(client, base, actor);
    });
  }

  async createSupplierPaymentRecord(client, base, actor) {
    const supplierResult = await findSupplierById(client, base.supplierId, actor.tenantId);
    assert(supplierResult.rowCount > 0, "Supplier not found.", 404);
    const supplier = supplierResult.rows[0];

    const insertResult = await insertSupplierPayment(client, { ...base, createdById: actor.id });

    const latestEntry = await getLatestSupplierDueLedgerEntry(client, supplier.id, actor.tenantId);
    const currentBalance = latestEntry ? latestEntry.balanceAfter : Math.max(0, Number(supplier.opening_due || 0));
    const balanceAfter = currentBalance - base.amount;

    await recordSupplierDueLedgerEntry(client, {
      tenantId: actor.tenantId,
      supplierId: supplier.id,
      type: SUPPLIER_DUE_LEDGER_TYPES.PAYMENT,
      debit: 0,
      credit: base.amount,
      balanceAfter,
      referenceType: "supplier_payment",
      referenceId: base.id,
      note: base.note || `Payment to ${supplier.name}`,
      createdById: actor.id,
    });

    await updateSupplierCurrentDue(client, supplier.id, actor.tenantId, Math.max(0, balanceAfter));

    if (this.financeAccountService) {
      await this.financeAccountService.recordTransactionInClient(
        client,
        {
          accountType: "CASH",
          type: "WITHDRAWAL",
          amount: base.amount,
          date: base.paymentDate,
          note: base.note || `Payment to ${supplier.name}`,
        },
        actor,
      );
    }

    await this.recordActivity(client, actor, {
      actionType: SUPPLIER_PAYMENT_ACTIONS.CREATE,
      entityType: "supplier_payment",
      entityId: base.id,
      description: `${actor.name} recorded payment of ${base.amount} to ${supplier.name}`,
      metadata: { supplierId: supplier.id, amount: base.amount },
    });

    return mapSupplierPayment(insertResult.rows[0]);
  }

  async updateSupplierPaymentRecord(client, base, input, actor) {
    assert(String(input.reason || "").trim(), "Edit reason is required.", 400);

    const existingResult = await findSupplierPaymentForUpdate(client, base.id, actor.tenantId);
    assert(existingResult.rowCount > 0, "Supplier payment not found.", 404);
    const previousPayment = existingResult.rows[0];

    assert(
      String(previousPayment.supplier_id) === base.supplierId,
      "Supplier cannot be changed after the payment is recorded.",
    );

    const supplierResult = await findSupplierById(client, base.supplierId, actor.tenantId);
    assert(supplierResult.rowCount > 0, "Supplier not found.", 404);
    const supplier = supplierResult.rows[0];

    const updateResult = await updateSupplierPayment(client, base);

    const oldAmount = Number(previousPayment.amount || 0);
    const amountDelta = base.amount - oldAmount;

    if (amountDelta !== 0) {
      const latestEntry = await getLatestSupplierDueLedgerEntry(client, supplier.id, actor.tenantId);
      const currentBalance = latestEntry ? latestEntry.balanceAfter : Math.max(0, Number(supplier.opening_due || 0));
      const balanceAfter = currentBalance - amountDelta;

      await recordSupplierDueLedgerEntry(client, {
        tenantId: actor.tenantId,
        supplierId: supplier.id,
        type: SUPPLIER_DUE_LEDGER_TYPES.PAYMENT,
        debit: Math.max(0, amountDelta),
        credit: Math.max(0, -amountDelta),
        balanceAfter,
        referenceType: "supplier_payment",
        referenceId: base.id,
        note: `Payment adjusted for ${supplier.name}`,
        createdById: actor.id,
      });

      await updateSupplierCurrentDue(client, supplier.id, actor.tenantId, Math.max(0, balanceAfter));

      if (this.financeAccountService) {
        await this.financeAccountService.recordTransactionInClient(
          client,
          {
            accountType: "CASH",
            type: amountDelta > 0 ? "WITHDRAWAL" : "DEPOSIT",
            amount: Math.abs(amountDelta),
            date: base.paymentDate,
            note: `Payment adjusted for ${supplier.name}`,
          },
          actor,
        );
      }
    }

    const { before, after } = diffFields(
      {
        paymentDate: String(previousPayment.payment_date).slice(0, 10),
        amount: oldAmount,
        paymentMethod: previousPayment.payment_method,
        note: previousPayment.note,
      },
      {
        paymentDate: base.paymentDate,
        amount: base.amount,
        paymentMethod: base.paymentMethod,
        note: base.note,
      },
      ["paymentDate", "amount", "paymentMethod", "note"],
    );

    await this.recordActivity(client, actor, {
      actionType: SUPPLIER_PAYMENT_ACTIONS.UPDATE,
      entityType: "supplier_payment",
      entityId: base.id,
      description: `${actor.name} updated payment to ${supplier.name}`,
      metadata: { supplierId: supplier.id, amount: base.amount },
      before,
      after,
      reason: input.reason,
    });

    return mapSupplierPayment(updateResult.rows[0]);
  }

  async removeSupplierPayment(paymentId, actor, reason) {
    assert(String(reason || "").trim(), "Delete reason is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findSupplierPaymentForUpdate(client, paymentId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Supplier payment not found.", 404);
      const payment = existingResult.rows[0];

      await softDeleteSupplierPayment(client, paymentId, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });

      await this.recordActivity(client, actor, {
        actionType: SUPPLIER_PAYMENT_ACTIONS.DELETE,
        entityType: "supplier_payment",
        entityId: paymentId,
        reason,
        description: `${actor.name} moved supplier payment to trash (${reason})`,
        metadata: { supplierId: payment.supplier_id, amount: Number(payment.amount || 0) },
      });

      return { ok: true };
    });
  }

  async restoreSupplierPayment(paymentId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await restoreSupplierPayment(client, paymentId, actor.tenantId);
      assert(result.rowCount > 0, "Supplier payment not found in trash.", 404);

      await this.recordActivity(client, actor, {
        actionType: SUPPLIER_PAYMENT_ACTIONS.RESTORE,
        entityType: "supplier_payment",
        entityId: paymentId,
        description: `${actor.name} restored supplier payment from trash`,
      });

      return { ok: true };
    });
  }

  async listTrashedSupplierPayments(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const tenantId = actor.tenantId;

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listTrashedSupplierPayments(client, { tenantId, limit, offset }),
        countTrashedSupplierPayments(client, tenantId),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }
}
