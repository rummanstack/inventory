import { assert } from "../lib/errors.js";
import { diffFields } from "../lib/auditDiff.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { normalizeCustomerPayment } from "../lib/normalizers.js";
import { CUSTOMER_DUE_LEDGER_TYPES } from "../lib/customerDueLedger.js";
import { CUSTOMER_PAYMENT_ACTIONS } from "../lib/auditActions.js";
import { JOURNAL_SOURCE_TYPES } from "../lib/journalSourceTypes.js";
import { findRetailCustomerForUpdate, updateRetailCustomerCurrentDue } from "../repositories/retailCustomerRepository.js";
import { getLatestCustomerDueLedgerEntry } from "../repositories/customerDueLedgerRepository.js";
import {
  countCustomerPayments,
  countTrashedCustomerPayments,
  findCustomerPaymentById,
  findCustomerPaymentForUpdate,
  insertCustomerPayment,
  listCustomerPaymentsPage,
  listTrashedCustomerPayments,
  mapCustomerPayment,
  restoreCustomerPayment,
  softDeleteCustomerPayment,
  updateCustomerPayment,
} from "../repositories/customerPaymentRepository.js";
import { logActivity, recordCustomerDueLedgerEntry } from "./shared/inventoryHelpers.js";

const DATE_ERROR = "Payment date must be in YYYY-MM-DD format.";

export class CustomerPaymentService {
  constructor(databaseManager, { auditService, financeAccountService, journalService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.financeAccountService = financeAccountService;
    this.journalService = journalService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  async listCustomerPayments(query = {}, actor) {
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
      dateFrom,
      dateTo,
    };

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listCustomerPaymentsPage(client, { ...filters, limit, offset }),
        countCustomerPayments(client, filters),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async getCustomerPayment(paymentId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const result = await findCustomerPaymentById(client, paymentId, actor.tenantId);
      assert(result.rowCount > 0, "Customer payment not found.", 404);
      return mapCustomerPayment(result.rows[0]);
    });
  }

  async saveCustomerPayment(input, actor) {
    const base = normalizeCustomerPayment(input);
    base.tenantId = actor.tenantId;
    assert(base.customerId, "Customer is required.");
    assert(base.paymentDate, "Payment date is required.");
    base.paymentDate = normalizeIsoDate(base.paymentDate, base.paymentDate, DATE_ERROR);
    assert(base.amount > 0, "Amount must be greater than zero.");

    return this.databaseManager.withTransaction(async (client) => {
      if (input.id) {
        return this.updateCustomerPaymentRecord(client, base, input, actor);
      }

      return this.createCustomerPaymentRecord(client, base, actor);
    });
  }

  async createCustomerPaymentRecord(client, base, actor) {
    const customerResult = await findRetailCustomerForUpdate(client, base.customerId, actor.tenantId);
    assert(customerResult.rowCount > 0, "Customer not found.", 404);
    const customer = customerResult.rows[0];

    const latestEntry = await getLatestCustomerDueLedgerEntry(client, customer.id, actor.tenantId);
    const currentBalance = latestEntry ? latestEntry.balanceAfter : Math.max(0, Number(customer.opening_due || 0));
    assert(base.amount <= currentBalance, `Payment amount exceeds current due balance of ${currentBalance}.`, 400);

    const insertResult = await insertCustomerPayment(client, { ...base, createdById: actor.id });
    const balanceAfter = currentBalance - base.amount;

    await recordCustomerDueLedgerEntry(client, {
      tenantId: actor.tenantId,
      customerId: customer.id,
      type: CUSTOMER_DUE_LEDGER_TYPES.COLLECTION,
      debit: 0,
      credit: base.amount,
      balanceAfter,
      referenceType: "customer_payment",
      referenceId: base.id,
      note: base.note || `Collection from ${customer.name}`,
      createdById: actor.id,
      businessDate: base.paymentDate,
    });

    await updateRetailCustomerCurrentDue(client, customer.id, actor.tenantId, Math.max(0, balanceAfter));

    if (this.financeAccountService) {
      await this.financeAccountService.recordTransactionInClient(
        client,
        {
          accountType: "CASH",
          type: "DEPOSIT",
          amount: base.amount,
          date: base.paymentDate,
          note: base.note || `Customer payment from ${customer.name}`,
        },
        actor,
      );
    }

    if (this.journalService) {
      await this.journalService.postCustomerPayment(client, actor, {
        paymentId: base.id,
        paymentDate: base.paymentDate,
        amount: base.amount,
        memo: base.note || `Customer payment from ${customer.name}`,
      });
    }

    await this.recordActivity(client, actor, {
      actionType: CUSTOMER_PAYMENT_ACTIONS.CREATE,
      entityType: "customer_payment",
      entityId: base.id,
      description: `${actor.name} recorded due collection of ${base.amount} from ${customer.name}`,
      metadata: { customerId: customer.id, amount: base.amount },
    });

    return mapCustomerPayment(insertResult.rows[0]);
  }

  async updateCustomerPaymentRecord(client, base, input, actor) {
    assert(String(input.reason || "").trim(), "Edit reason is required.", 400);

    const existingResult = await findCustomerPaymentForUpdate(client, base.id, actor.tenantId);
    assert(existingResult.rowCount > 0, "Customer payment not found.", 404);
    const previousPayment = existingResult.rows[0];

    assert(
      String(previousPayment.customer_id) === base.customerId,
      "Customer cannot be changed after the payment is recorded.",
    );

    const customerResult = await findRetailCustomerForUpdate(client, base.customerId, actor.tenantId);
    assert(customerResult.rowCount > 0, "Customer not found.", 404);
    const customer = customerResult.rows[0];

    const updateResult = await updateCustomerPayment(client, base);

    const oldAmount = Number(previousPayment.amount || 0);
    const amountDelta = base.amount - oldAmount;

    if (amountDelta !== 0) {
      const latestEntry = await getLatestCustomerDueLedgerEntry(client, customer.id, actor.tenantId);
      const currentBalance = latestEntry ? latestEntry.balanceAfter : Math.max(0, Number(customer.opening_due || 0));
      assert(amountDelta <= currentBalance, `Payment amount exceeds current due balance of ${currentBalance}.`, 400);
      const balanceAfter = currentBalance - amountDelta;

      await recordCustomerDueLedgerEntry(client, {
        tenantId: actor.tenantId,
        customerId: customer.id,
        type: CUSTOMER_DUE_LEDGER_TYPES.COLLECTION,
        debit: Math.max(0, -amountDelta),
        credit: Math.max(0, amountDelta),
        balanceAfter,
        referenceType: "customer_payment",
        referenceId: base.id,
        note: `Collection adjusted for ${customer.name}`,
        createdById: actor.id,
        businessDate: base.paymentDate,
      });

      await updateRetailCustomerCurrentDue(client, customer.id, actor.tenantId, Math.max(0, balanceAfter));

      if (this.financeAccountService) {
        await this.financeAccountService.recordTransactionInClient(
          client,
          {
            accountType: "CASH",
            type: amountDelta > 0 ? "DEPOSIT" : "WITHDRAWAL",
            amount: Math.abs(amountDelta),
            date: base.paymentDate,
            note: `Payment adjusted for ${customer.name}`,
          },
          actor,
        );
      }

      if (this.journalService) {
        await this.journalService.postCustomerPaymentAdjustment(client, actor, {
          paymentId: base.id,
          paymentDate: base.paymentDate,
          amountDelta,
          memo: `Payment adjusted for ${customer.name}`,
        });
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
      actionType: CUSTOMER_PAYMENT_ACTIONS.UPDATE,
      entityType: "customer_payment",
      entityId: base.id,
      description: `${actor.name} updated due collection from ${customer.name}`,
      metadata: { customerId: customer.id, amount: base.amount },
      before,
      after,
      reason: input.reason,
    });

    return mapCustomerPayment(updateResult.rows[0]);
  }

  async removeCustomerPayment(paymentId, actor, reason) {
    assert(String(reason || "").trim(), "Delete reason is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findCustomerPaymentForUpdate(client, paymentId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Customer payment not found.", 404);
      const payment = existingResult.rows[0];
      const amount = Number(payment.amount || 0);

      await softDeleteCustomerPayment(client, paymentId, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });

      await findRetailCustomerForUpdate(client, payment.customer_id, actor.tenantId);
      const latestEntry = await getLatestCustomerDueLedgerEntry(client, payment.customer_id, actor.tenantId);
      const currentBalance = latestEntry ? latestEntry.balanceAfter : 0;
      const balanceAfter = currentBalance + amount;

      await recordCustomerDueLedgerEntry(client, {
        tenantId: actor.tenantId,
        customerId: payment.customer_id,
        type: CUSTOMER_DUE_LEDGER_TYPES.COLLECTION,
        debit: amount,
        credit: 0,
        balanceAfter,
        referenceType: "customer_payment",
        referenceId: paymentId,
        note: `Collection reversed — payment deleted (${reason})`,
        createdById: actor.id,
        businessDate: String(payment.payment_date).slice(0, 10),
      });

      await updateRetailCustomerCurrentDue(client, payment.customer_id, actor.tenantId, Math.max(0, balanceAfter));

      if (this.financeAccountService && amount > 0) {
        await this.financeAccountService.recordTransactionInClient(
          client,
          {
            accountType: "CASH",
            type: "WITHDRAWAL",
            amount,
            date: String(payment.payment_date).slice(0, 10),
            note: `Customer payment reversal (deleted) — ${reason}`,
          },
          actor,
        );
      }

      if (this.journalService) {
        await this.journalService.reverseAllForSource(client, {
          tenantId: actor.tenantId,
          sourceType: JOURNAL_SOURCE_TYPES.CUSTOMER_PAYMENT,
          sourceId: paymentId,
          adjustmentSourceType: JOURNAL_SOURCE_TYPES.CUSTOMER_PAYMENT_ADJUSTMENT,
          reason,
          createdById: actor.id,
        });
      }

      await this.recordActivity(client, actor, {
        actionType: CUSTOMER_PAYMENT_ACTIONS.DELETE,
        entityType: "customer_payment",
        entityId: paymentId,
        reason,
        description: `${actor.name} moved due collection to trash (${reason})`,
        metadata: { customerId: payment.customer_id, amount },
      });

      return { ok: true };
    });
  }

  async restoreCustomerPayment(paymentId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await restoreCustomerPayment(client, paymentId, actor.tenantId);
      assert(result.rowCount > 0, "Customer payment not found in trash.", 404);

      const row = result.rows[0];
      const amount = Number(row.amount || 0);

      await findRetailCustomerForUpdate(client, row.customer_id, actor.tenantId);
      const latestEntry = await getLatestCustomerDueLedgerEntry(client, row.customer_id, actor.tenantId);
      const currentBalance = latestEntry ? latestEntry.balanceAfter : 0;
      const balanceAfter = currentBalance - amount;

      await recordCustomerDueLedgerEntry(client, {
        tenantId: actor.tenantId,
        customerId: row.customer_id,
        type: CUSTOMER_DUE_LEDGER_TYPES.COLLECTION,
        debit: 0,
        credit: amount,
        balanceAfter,
        referenceType: "customer_payment",
        referenceId: paymentId,
        note: `Collection restored — payment restored from trash`,
        createdById: actor.id,
        businessDate: String(row.payment_date).slice(0, 10),
      });

      await updateRetailCustomerCurrentDue(client, row.customer_id, actor.tenantId, Math.max(0, balanceAfter));

      if (this.financeAccountService && amount > 0) {
        await this.financeAccountService.recordTransactionInClient(
          client,
          {
            accountType: "CASH",
            type: "DEPOSIT",
            amount,
            date: String(row.payment_date).slice(0, 10),
            note: `Customer payment restored from trash`,
          },
          actor,
        );
      }

      if (this.journalService) {
        await this.journalService.unreverseAllForSource(client, {
          tenantId: actor.tenantId,
          sourceType: JOURNAL_SOURCE_TYPES.CUSTOMER_PAYMENT,
          sourceId: paymentId,
          adjustmentSourceType: JOURNAL_SOURCE_TYPES.CUSTOMER_PAYMENT_ADJUSTMENT,
        });
      }

      await this.recordActivity(client, actor, {
        actionType: CUSTOMER_PAYMENT_ACTIONS.RESTORE,
        entityType: "customer_payment",
        entityId: paymentId,
        description: `${actor.name} restored due collection from trash`,
      });

      return { ok: true };
    });
  }

  async listTrashedCustomerPayments(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const tenantId = actor.tenantId;

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listTrashedCustomerPayments(client, { tenantId, limit, offset }),
        countTrashedCustomerPayments(client, tenantId),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }
}
