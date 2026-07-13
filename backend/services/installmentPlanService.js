import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { cleanMoney, cleanInteger, normalizeSalesInvoice } from "../lib/normalizers.js";
import { normalizeIsoDate, addDays } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { nextInstallmentPlanNumber } from "../lib/installmentNumber.js";
import { CUSTOMER_DUE_LEDGER_TYPES } from "../lib/customerDueLedger.js";
import { ACCOUNTS } from "../lib/chartOfAccounts.js";
import { findTenantById } from "../repositories/tenantRepository.js";
import { findRetailCustomerForUpdate, findRetailCustomerById, updateRetailCustomerCurrentDue } from "../repositories/retailCustomerRepository.js";
import { getLatestCustomerDueLedgerEntry } from "../repositories/customerDueLedgerRepository.js";
import {
  insertInstallmentPlan,
  findInstallmentPlanById,
  findInstallmentPlanForUpdate,
  listInstallmentPlansPage,
  countInstallmentPlans,
  updateInstallmentPlanTotals,
  updateInstallmentPlanReschedule,
  markInstallmentPlanWrittenOff,
  markInstallmentPlanCancelled,
  listAllPlansForCustomer,
  mapInstallmentPlan,
} from "../repositories/installmentPlanRepository.js";
import {
  insertInstallmentScheduleRow,
  listScheduleByPlan,
  listUnpaidScheduleForUpdate,
  updateInstallmentScheduleRow,
  listDueSchedule,
  listOverdueSchedule,
} from "../repositories/installmentScheduleRepository.js";
import {
  insertInstallmentPayment,
  insertInstallmentPaymentAllocation,
  listPaymentsByPlan,
  listPaymentsInRange,
} from "../repositories/installmentPaymentRepository.js";
import { insertInstallmentRescheduleLog, listRescheduleLogByPlan } from "../repositories/installmentRescheduleLogRepository.js";
import { recordCustomerDueLedgerEntry } from "./shared/inventoryHelpers.js";
import { JOURNAL_SOURCE_TYPES } from "../lib/journalSourceTypes.js";

const DATE_ERROR = "Date must be in YYYY-MM-DD format.";
const MARKUP_TYPES = ["PERCENT", "FIXED"];
const MARKUP_RECOGNITION_MODES = ["GRADUAL", "IMMEDIATE"];
const PAYMENT_METHODS = ["CASH", "BANK", "MOBILE_BANKING", "CARD", "CHEQUE", "STORE_CREDIT", "GIFT_VOUCHER"];
const CASH_MOVEMENT_METHODS = new Set(["CASH", "BANK", "MOBILE_BANKING", "CARD", "CHEQUE"]);
const EPSILON = 0.004;

// Advances an ISO date by N calendar months, clamping to the shorter month's
// last day (e.g. Jan 31 + 1 month -> Feb 28/29) rather than overflowing into
// the following month the way naive day-arithmetic would.
function addCalendarMonths(isoDate, months) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const targetMonthIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, daysInTargetMonth);
  const result = new Date(Date.UTC(targetYear, targetMonth, clampedDay));
  return result.toISOString().slice(0, 10);
}

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export class InstallmentPlanService {
  constructor(databaseManager, { auditService, financeAccountService, salesInvoiceService, journalService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.financeAccountService = financeAccountService;
    this.salesInvoiceService = salesInvoiceService;
    this.journalService = journalService;
  }

  async recordActivity(client, actor, payload) {
    if (!this.auditService || !actor) return;
    await this.auditService.record(client, {
      tenantId: actor.tenantId,
      userId: actor.id,
      actionType: payload.actionType,
      entityType: "installment_plan",
      entityId: payload.entityId,
      module: "installment-sales",
      description: payload.description,
      reason: payload.reason,
      metadata: { actorName: actor.name, actorRole: actor.role, ...payload.metadata },
    });
  }

  async createPlan(input, actor) {
    const customerId = String(input.customerId || "").trim();
    assert(customerId, "Customer is required.", 400);

    const downPaymentRaw = cleanMoney(input.downPayment);
    const markupType = MARKUP_TYPES.includes(String(input.markupType || "").trim().toUpperCase())
      ? String(input.markupType).trim().toUpperCase()
      : "PERCENT";
    const markupValue = cleanMoney(input.markupValue);
    assert(markupValue >= 0, "Markup cannot be negative.", 400);

    const numberOfMonths = cleanInteger(input.numberOfMonths);
    assert(numberOfMonths > 0, "Number of months must be greater than zero.", 400);

    const firstPaymentDate = normalizeIsoDate(input.firstPaymentDate, "", DATE_ERROR);
    assert(firstPaymentDate, "First payment date is required.", 400);

    const paymentDayOfMonth = cleanInteger(input.paymentDayOfMonth) || Number(firstPaymentDate.split("-")[2]);

    const markupRecognitionMode = MARKUP_RECOGNITION_MODES.includes(String(input.markupRecognitionMode || "").trim().toUpperCase())
      ? String(input.markupRecognitionMode).trim().toUpperCase()
      : "GRADUAL";

    return this.databaseManager.withTransaction(async (client) => {
      const tenant = await findTenantById(client, actor.tenantId);

      const customerResult = await findRetailCustomerForUpdate(client, customerId, actor.tenantId);
      assert(customerResult.rowCount > 0, "Customer not found.", 404);
      const customer = customerResult.rows[0];

      const base = normalizeSalesInvoice({
        ...input,
        customerId,
        customerType: "REGISTERED", // installment sales never allow a walk-in customer
        saleType: "RETAIL",
        invoiceDate: input.saleDate,
        paidAmount: downPaymentRaw,
        taxRate: tenant?.taxRate ?? 0,
      });
      base.tenantId = actor.tenantId;
      base.loyaltyRedeemPoints = 0;

      assert(base.items.length > 0, "At least one product line item is required.", 400);
      assert(base.invoiceDate, "Sale date is required.", 400);
      base.invoiceDate = normalizeIsoDate(base.invoiceDate, base.invoiceDate, DATE_ERROR);

      // normalizeSalesInvoice silently clamps an over-large paidAmount down to the
      // total rather than rejecting it — check the raw requested down payment
      // against the actual sale total ourselves so an oversized down payment is a
      // hard validation error, not a silent clamp.
      assert(downPaymentRaw <= base.totalAmount + EPSILON, "Down payment cannot exceed the sale total.", 400);

      const invoice = await this.salesInvoiceService.createSalesInvoiceRecord(client, base, actor, tenant);

      const financeAmount = round2(invoice.dueAmount);
      const markupAmount = markupType === "PERCENT" ? round2((financeAmount * markupValue) / 100) : round2(markupValue);
      const finalPayableAmount = round2(financeAmount + markupAmount);

      const year = new Date(`${base.invoiceDate}T00:00:00Z`).getUTCFullYear();
      const planNumber = await nextInstallmentPlanNumber(client, actor.tenantId, year);

      // The financed portion (financeAmount) was just posted to the customer's
      // normal due ledger by createSalesInvoiceRecord above. From here on, the
      // installment schedule below is the single source of truth for that debt
      // (plus markup) — so immediately reverse it out of the general customer
      // due ledger to avoid double-tracking the same receivable in two places.
      if (financeAmount > 0) {
        const latestEntry = await getLatestCustomerDueLedgerEntry(client, customer.id, actor.tenantId);
        const currentBalance = latestEntry ? latestEntry.balanceAfter : Number(customer.opening_due || 0);
        const balanceAfter = Math.max(0, currentBalance - financeAmount);
        await recordCustomerDueLedgerEntry(client, {
          tenantId: actor.tenantId,
          customerId: customer.id,
          type: CUSTOMER_DUE_LEDGER_TYPES.MANUAL_ADJUSTMENT,
          debit: 0,
          credit: financeAmount,
          balanceAfter,
          referenceType: "installment_plan",
          referenceId: planNumber,
          note: `Financed via installment plan ${planNumber} — tracked on the installment schedule, not the general due ledger`,
          createdById: actor.id,
          businessDate: base.invoiceDate,
        });
        await updateRetailCustomerCurrentDue(client, customer.id, actor.tenantId, balanceAfter);
      }

      const plan = await insertInstallmentPlan(client, {
        id: createId("instplan"),
        tenantId: actor.tenantId,
        planNumber,
        customerId: customer.id,
        salesInvoiceId: invoice.id,
        saleDate: base.invoiceDate,
        productTotal: base.subtotal,
        discountAmount: base.discount,
        netSaleAmount: base.totalAmount,
        downPayment: base.paidAmount,
        financeAmount,
        markupType,
        markupValue,
        markupAmount,
        finalPayableAmount,
        numberOfMonths,
        firstPaymentDate,
        paymentDayOfMonth,
        monthlyInstallmentAmount: round2(finalPayableAmount / numberOfMonths),
        totalPaid: 0,
        outstandingAmount: finalPayableAmount,
        overdueAmount: 0,
        status: "ACTIVE",
        note: String(input.note || "").trim(),
        markupRecognitionMode,
        createdById: actor.id,
      });

      if (this.journalService) {
        await this.journalService.postInstallmentPlan(client, actor, {
          planId: plan.id,
          planNumber,
          saleDate: base.invoiceDate,
          financeAmount,
          markupAmount,
          markupRecognitionMode,
        });
      }

      const baseInstallment = Math.floor((finalPayableAmount / numberOfMonths) * 100) / 100;
      const schedule = [];
      let allocatedSoFar = 0;
      for (let i = 1; i <= numberOfMonths; i += 1) {
        const isLast = i === numberOfMonths;
        const dueAmount = isLast ? round2(finalPayableAmount - allocatedSoFar) : baseInstallment;
        allocatedSoFar = round2(allocatedSoFar + dueAmount);
        const dueDate = i === 1 ? firstPaymentDate : addCalendarMonths(firstPaymentDate, i - 1);
        const row = await insertInstallmentScheduleRow(client, {
          id: createId("instsch"),
          tenantId: actor.tenantId,
          planId: plan.id,
          installmentNo: i,
          dueDate,
          dueAmount,
        });
        schedule.push(row);
      }

      await this.recordActivity(client, actor, {
        actionType: "installment_plan.create",
        entityId: plan.id,
        description: `${actor.name} created installment plan ${planNumber} for ${customer.name}`,
        metadata: { planNumber, customerId: customer.id, finalPayableAmount, numberOfMonths },
      });

      return { plan, schedule, invoice };
    });
  }

  async getPlan(planId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const result = await findInstallmentPlanById(client, planId, actor.tenantId);
      assert(result.rowCount > 0, "Installment plan not found.", 404);

      const [schedule, payments, rescheduleLog] = await Promise.all([
        listScheduleByPlan(client, planId, actor.tenantId),
        listPaymentsByPlan(client, planId, actor.tenantId),
        listRescheduleLogByPlan(client, planId, actor.tenantId),
      ]);

      return { plan: mapInstallmentPlan(result.rows[0]), schedule, payments, rescheduleLog };
    });
  }

  async listPlans(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const customerId = String(query.customerId || "").trim() || undefined;
    const status = String(query.status || "").trim() || undefined;

    return this.databaseManager.withClient(async (client) => {
      const filters = { tenantId: actor.tenantId, customerId, status };
      const [items, total] = await Promise.all([
        listInstallmentPlansPage(client, { ...filters, limit, offset }),
        countInstallmentPlans(client, filters),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async collectPayment(input, actor) {
    const planId = String(input.planId || "").trim();
    assert(planId, "Plan is required.", 400);
    const amount = cleanMoney(input.amount);
    assert(amount > 0, "Amount must be greater than zero.", 400);
    const paymentDate = normalizeIsoDate(input.paymentDate, new Date().toISOString().slice(0, 10), DATE_ERROR);
    const paymentMethod = PAYMENT_METHODS.includes(String(input.paymentMethod || "").trim().toUpperCase())
      ? String(input.paymentMethod).trim().toUpperCase()
      : "CASH";
    const note = String(input.note || "").trim();

    return this.databaseManager.withTransaction(async (client) => {
      const plan = await findInstallmentPlanForUpdate(client, planId, actor.tenantId);
      assert(plan, "Installment plan not found.", 404);
      assert(plan.status === "ACTIVE", `Cannot collect a payment against a ${plan.status.toLowerCase()} plan.`, 400);

      const currentOutstanding = Number(plan.outstanding_amount || 0);
      assert(amount <= currentOutstanding + EPSILON, `Payment (${amount}) exceeds the plan's outstanding balance of ${currentOutstanding}.`, 400);

      const paymentId = createId("instpay");
      const payment = await insertInstallmentPayment(client, {
        id: paymentId,
        tenantId: actor.tenantId,
        planId,
        customerId: plan.customer_id,
        paymentDate,
        amount,
        paymentMethod,
        note,
        createdById: actor.id,
      });

      const unpaidRows = await listUnpaidScheduleForUpdate(client, planId, actor.tenantId);
      let remaining = amount;
      for (const row of unpaidRows) {
        if (remaining <= EPSILON) break;
        const portion = Math.min(row.remainingAmount, remaining);
        if (portion <= 0) continue;

        const newPaidAmount = round2(row.paidAmount + portion);
        const newRemainingAmount = round2(row.dueAmount - newPaidAmount);
        const status = newRemainingAmount <= EPSILON ? "PAID" : "PARTIAL";

        await updateInstallmentScheduleRow(client, row.id, actor.tenantId, {
          paidAmount: newPaidAmount,
          remainingAmount: Math.max(0, newRemainingAmount),
          status,
          paidDate: status === "PAID" ? paymentDate : row.paidDate,
        });

        await insertInstallmentPaymentAllocation(client, {
          id: createId("installoc"),
          tenantId: actor.tenantId,
          paymentId,
          scheduleId: row.id,
          allocatedAmount: round2(portion),
        });

        remaining = round2(remaining - portion);
      }

      const newTotalPaid = round2(Number(plan.total_paid || 0) + amount);
      const newOutstanding = Math.max(0, round2(currentOutstanding - amount));
      const newStatus = newOutstanding <= EPSILON ? "COMPLETED" : "ACTIVE";

      const updatedPlan = await updateInstallmentPlanTotals(client, planId, actor.tenantId, {
        totalPaid: newTotalPaid,
        outstandingAmount: newOutstanding,
        status: newStatus,
      });

      if (CASH_MOVEMENT_METHODS.has(paymentMethod)) {
        if (this.financeAccountService) {
          await this.financeAccountService.recordTransactionInClient(
            client,
            {
              accountType: paymentMethod === "CASH" ? "CASH" : "BANK",
              type: "DEPOSIT",
              amount,
              date: paymentDate,
              note: `Installment payment — plan ${plan.plan_number}`,
            },
            actor,
          );
        }

        if (this.journalService) {
          const finalPayableAmount = Number(plan.final_payable_amount || 0);
          const markupRecognized = plan.markup_recognition_mode === "GRADUAL" && finalPayableAmount > 0
            ? round2((amount * Number(plan.markup_amount || 0)) / finalPayableAmount)
            : 0;

          await this.journalService.postInstallmentPayment(client, actor, {
            paymentId,
            planNumber: plan.plan_number,
            paymentDate,
            accountCode: paymentMethod === "CASH" ? ACCOUNTS.CASH : ACCOUNTS.BANK,
            amount,
            markupRecognized,
          });
        }
      }
      // STORE_CREDIT/GIFT_VOUCHER payments touch neither a cash/bank account nor
      // the journal yet — full voucher-system integration (Section F/voucherService)
      // is deferred past this phase; the schedule/plan totals still update correctly.

      await this.recordActivity(client, actor, {
        actionType: "installment_plan.collect_payment",
        entityId: planId,
        description: `${actor.name} collected ${amount} against installment plan ${plan.plan_number}`,
        metadata: { planId, amount, paymentMethod, newTotalPaid, newOutstanding, newStatus },
      });

      const schedule = await listScheduleByPlan(client, planId, actor.tenantId);
      return { plan: updatedPlan, schedule, payment };
    });
  }

  // Covers both "Today's Due" (call with no params) and "Upcoming Due" (call
  // with dateTo a week/two out) from a single query — the underlying report is
  // identical, only the range differs.
  async getDueScheduleReport(query = {}, actor) {
    const today = new Date().toISOString().slice(0, 10);
    const dateFrom = normalizeIsoDate(query.dateFrom, today, DATE_ERROR);
    const dateTo = normalizeIsoDate(query.dateTo, dateFrom, DATE_ERROR);
    assert(dateFrom <= dateTo, "Start date must be before or equal to end date.", 400);

    return this.databaseManager.withClient(async (client) => {
      const rows = await listDueSchedule(client, actor.tenantId, { dateFrom, dateTo });
      const totalDue = round2(rows.reduce((sum, row) => sum + row.remainingAmount, 0));
      return { dateFrom, dateTo, rows, totalDue };
    });
  }

  async getOverdueReport(actor) {
    const asOfDate = new Date().toISOString().slice(0, 10);
    return this.databaseManager.withClient(async (client) => {
      const rows = await listOverdueSchedule(client, actor.tenantId, asOfDate);
      const totalOverdue = round2(rows.reduce((sum, row) => sum + row.remainingAmount, 0));
      return { asOfDate, rows, totalOverdue };
    });
  }

  async getCollectionReport(query = {}, actor) {
    const today = new Date().toISOString().slice(0, 10);
    const dateTo = normalizeIsoDate(query.dateTo, today, DATE_ERROR);
    const dateFrom = normalizeIsoDate(query.dateFrom, addDays(dateTo, -29), DATE_ERROR);
    assert(dateFrom <= dateTo, "Start date must be before or equal to end date.", 400);

    return this.databaseManager.withClient(async (client) => {
      const rows = await listPaymentsInRange(client, actor.tenantId, { dateFrom, dateTo });
      const totalCollected = round2(rows.reduce((sum, row) => sum + row.amount, 0));
      return { dateFrom, dateTo, rows, totalCollected, paymentCount: rows.length };
    });
  }

  async getCustomerStatement(query = {}, actor) {
    const customerId = String(query.customerId || "").trim();
    assert(customerId, "Customer is required.", 400);

    return this.databaseManager.withClient(async (client) => {
      const customerResult = await findRetailCustomerById(client, customerId, actor.tenantId);
      assert(customerResult.rowCount > 0, "Customer not found.", 404);
      const customer = customerResult.rows[0];

      const plans = await listAllPlansForCustomer(client, customerId, actor.tenantId);
      const plansWithSchedule = await Promise.all(
        plans.map(async (plan) => ({
          plan,
          schedule: await listScheduleByPlan(client, plan.id, actor.tenantId),
        })),
      );

      const totals = plans.reduce(
        (sum, plan) => ({
          finalPayableAmount: round2(sum.finalPayableAmount + plan.finalPayableAmount),
          totalPaid: round2(sum.totalPaid + plan.totalPaid),
          outstandingAmount: round2(sum.outstandingAmount + plan.outstandingAmount),
        }),
        { finalPayableAmount: 0, totalPaid: 0, outstandingAmount: 0 },
      );

      return {
        customer: { id: customer.id, name: customer.name, phone: customer.phone },
        plans: plansWithSchedule,
        totals,
      };
    });
  }

  // Never overwrites history: every remaining (PENDING/PARTIAL) row becomes
  // RESTRUCTURED — not deleted — and a fresh set of rows is generated for the
  // remaining balance under the new month count/cadence. installment_reschedule_log
  // keeps a full before/after snapshot. The financed total is unchanged; only
  // its shape over time is, so no journal entry is needed here.
  async reschedulePlan(input, actor) {
    const planId = String(input.planId || "").trim();
    assert(planId, "Plan is required.", 400);
    const reason = String(input.reason || "").trim();
    assert(reason, "A reason is required to reschedule a plan.", 400);

    const numberOfMonths = cleanInteger(input.numberOfMonths);
    assert(numberOfMonths > 0, "Number of months must be greater than zero.", 400);

    const firstPaymentDate = normalizeIsoDate(input.firstPaymentDate, "", DATE_ERROR);
    assert(firstPaymentDate, "First payment date is required.", 400);

    const paymentDayOfMonth = cleanInteger(input.paymentDayOfMonth) || Number(firstPaymentDate.split("-")[2]);

    return this.databaseManager.withTransaction(async (client) => {
      const plan = await findInstallmentPlanForUpdate(client, planId, actor.tenantId);
      assert(plan, "Installment plan not found.", 404);
      assert(plan.status === "ACTIVE", `Cannot reschedule a ${plan.status.toLowerCase()} plan.`, 400);

      const oldRows = await listUnpaidScheduleForUpdate(client, planId, actor.tenantId);
      assert(oldRows.length > 0, "There are no remaining installments to reschedule.", 400);

      const remainingAmount = round2(oldRows.reduce((sum, row) => sum + row.remainingAmount, 0));
      const lastInstallmentNo = Math.max(...oldRows.map((row) => row.installmentNo));

      for (const row of oldRows) {
        await updateInstallmentScheduleRow(client, row.id, actor.tenantId, {
          paidAmount: row.paidAmount,
          remainingAmount: 0,
          status: "RESTRUCTURED",
          paidDate: row.paidDate,
        });
      }

      const baseInstallment = Math.floor((remainingAmount / numberOfMonths) * 100) / 100;
      const newRows = [];
      let allocatedSoFar = 0;
      for (let i = 1; i <= numberOfMonths; i += 1) {
        const isLast = i === numberOfMonths;
        const dueAmount = isLast ? round2(remainingAmount - allocatedSoFar) : baseInstallment;
        allocatedSoFar = round2(allocatedSoFar + dueAmount);
        const dueDate = i === 1 ? firstPaymentDate : addCalendarMonths(firstPaymentDate, i - 1);
        const row = await insertInstallmentScheduleRow(client, {
          id: createId("instsch"),
          tenantId: actor.tenantId,
          planId,
          installmentNo: lastInstallmentNo + i,
          dueDate,
          dueAmount,
        });
        newRows.push(row);
      }

      await insertInstallmentRescheduleLog(client, {
        id: createId("instresch"),
        tenantId: actor.tenantId,
        planId,
        reason,
        oldSchedule: oldRows,
        newSchedule: newRows,
        createdById: actor.id,
      });

      const updatedPlan = await updateInstallmentPlanReschedule(client, planId, actor.tenantId, {
        numberOfMonths,
        firstPaymentDate,
        paymentDayOfMonth,
        monthlyInstallmentAmount: round2(remainingAmount / numberOfMonths),
      });

      await this.recordActivity(client, actor, {
        actionType: "installment_plan.reschedule",
        entityId: planId,
        reason,
        description: `${actor.name} rescheduled installment plan ${plan.plan_number}`,
        metadata: { planId, numberOfMonths, firstPaymentDate, remainingAmount },
      });

      const schedule = await listScheduleByPlan(client, planId, actor.tenantId);
      return { plan: updatedPlan, schedule };
    });
  }

  // Pays off (or waives) the entire remaining balance in one shot. An optional
  // discount writes down remaining principal; waiveMarkup additionally writes
  // off whatever markup hasn't been recognized yet (GRADUAL) or reverses what
  // was already recognized (IMMEDIATE) — see postInstallmentClosure for why
  // these always sum to exactly outstandingAmount.
  async settlePlan(input, actor) {
    const planId = String(input.planId || "").trim();
    assert(planId, "Plan is required.", 400);
    const settlementDate = normalizeIsoDate(input.settlementDate, new Date().toISOString().slice(0, 10), DATE_ERROR);
    const discount = cleanMoney(input.discount);
    assert(discount >= 0, "Discount cannot be negative.", 400);
    const waiveMarkup = input.waiveMarkup === true;
    // Unlike a regular collectPayment call, settlement is scoped to CASH/BANK
    // only for now — the journal entry always clears the receivable regardless
    // of how (or whether) cash actually moves, and STORE_CREDIT/GIFT_VOUCHER
    // would need the same deferred voucher-system integration noted in
    // collectPayment before that combination can be booked correctly.
    const paymentMethod = ["CASH", "BANK"].includes(String(input.paymentMethod || "").trim().toUpperCase())
      ? String(input.paymentMethod).trim().toUpperCase()
      : "CASH";

    return this.databaseManager.withTransaction(async (client) => {
      const plan = await findInstallmentPlanForUpdate(client, planId, actor.tenantId);
      assert(plan, "Installment plan not found.", 404);
      assert(plan.status === "ACTIVE", `Cannot settle a ${plan.status.toLowerCase()} plan.`, 400);

      const outstandingAmount = Number(plan.outstanding_amount || 0);
      assert(outstandingAmount > 0, "This plan has no remaining balance to settle.", 400);

      const finalPayableAmount = Number(plan.final_payable_amount || 0);
      const remainingMarkup = finalPayableAmount > 0
        ? round2((outstandingAmount * Number(plan.markup_amount || 0)) / finalPayableAmount)
        : 0;
      const waivedMarkup = waiveMarkup ? remainingMarkup : 0;
      // If the markup isn't waived, it's being collected in cashAmount below —
      // under GRADUAL recognition that slice needs to move from unearned to
      // earned income now, same as a normal payment would. Under IMMEDIATE
      // recognition it was already booked as revenue at plan creation, so
      // there's nothing left to recognize here.
      const recognizedMarkup = !waiveMarkup && plan.markup_recognition_mode === "GRADUAL" ? remainingMarkup : 0;

      assert(discount + waivedMarkup <= outstandingAmount + EPSILON, "Discount and waived markup cannot exceed the outstanding balance.", 400);
      const cashAmount = round2(outstandingAmount - waivedMarkup - discount);

      const unpaidRows = await listUnpaidScheduleForUpdate(client, planId, actor.tenantId);
      for (const row of unpaidRows) {
        await updateInstallmentScheduleRow(client, row.id, actor.tenantId, {
          paidAmount: row.dueAmount,
          remainingAmount: 0,
          status: "PAID",
          paidDate: settlementDate,
        });
      }

      let payment = null;
      if (cashAmount > 0) {
        payment = await insertInstallmentPayment(client, {
          id: createId("instpay"),
          tenantId: actor.tenantId,
          planId,
          customerId: plan.customer_id,
          paymentDate: settlementDate,
          amount: cashAmount,
          paymentMethod,
          note: "Early settlement",
          createdById: actor.id,
        });

        if (this.financeAccountService) {
          await this.financeAccountService.recordTransactionInClient(
            client,
            {
              accountType: paymentMethod === "CASH" ? "CASH" : "BANK",
              type: "DEPOSIT",
              amount: cashAmount,
              date: settlementDate,
              note: `Early settlement — plan ${plan.plan_number}`,
            },
            actor,
          );
        }
      }

      const updatedPlan = await updateInstallmentPlanTotals(client, planId, actor.tenantId, {
        totalPaid: round2(Number(plan.total_paid || 0) + cashAmount),
        outstandingAmount: 0,
        status: "COMPLETED",
      });

      if (this.journalService) {
        await this.journalService.postInstallmentSettlement(client, actor, {
          planId,
          planNumber: plan.plan_number,
          date: settlementDate,
          outstandingAmount,
          accountCode: paymentMethod === "CASH" ? ACCOUNTS.CASH : ACCOUNTS.BANK,
          cashAmount,
          waivedMarkup,
          recognizedMarkup,
          discount,
          markupRecognitionMode: plan.markup_recognition_mode,
        });
      }

      await this.recordActivity(client, actor, {
        actionType: "installment_plan.settle",
        entityId: planId,
        description: `${actor.name} early-settled installment plan ${plan.plan_number}`,
        metadata: { planId, outstandingAmount, cashAmount, waivedMarkup, discount },
      });

      const schedule = await listScheduleByPlan(client, planId, actor.tenantId);
      return { plan: updatedPlan, schedule, payment };
    });
  }

  // Write-off is a settlement with $0 collected and the remaining markup
  // always reversed — the remaining principal becomes a Bad Debt Expense
  // instead of being collected or discounted. Unpaid rows become WAIVED (never
  // PAID — they genuinely weren't), preserving the distinction for reporting.
  async writeOffPlan(input, actor) {
    const planId = String(input.planId || "").trim();
    assert(planId, "Plan is required.", 400);
    const reason = String(input.reason || "").trim();
    assert(reason, "A reason is required to write off a plan.", 400);
    const writeOffDate = normalizeIsoDate(input.writeOffDate, new Date().toISOString().slice(0, 10), DATE_ERROR);

    return this.databaseManager.withTransaction(async (client) => {
      const plan = await findInstallmentPlanForUpdate(client, planId, actor.tenantId);
      assert(plan, "Installment plan not found.", 404);
      assert(plan.status === "ACTIVE", `Cannot write off a ${plan.status.toLowerCase()} plan.`, 400);

      const outstandingAmount = Number(plan.outstanding_amount || 0);
      assert(outstandingAmount > 0, "This plan has no remaining balance to write off.", 400);

      const finalPayableAmount = Number(plan.final_payable_amount || 0);
      const remainingMarkup = finalPayableAmount > 0
        ? round2((outstandingAmount * Number(plan.markup_amount || 0)) / finalPayableAmount)
        : 0;
      const badDebtAmount = round2(outstandingAmount - remainingMarkup);

      const unpaidRows = await listUnpaidScheduleForUpdate(client, planId, actor.tenantId);
      for (const row of unpaidRows) {
        await updateInstallmentScheduleRow(client, row.id, actor.tenantId, {
          paidAmount: row.paidAmount,
          remainingAmount: 0,
          status: "WAIVED",
          paidDate: row.paidDate,
        });
      }

      const updatedPlan = await markInstallmentPlanWrittenOff(client, planId, actor.tenantId, {
        writtenOffById: actor.id,
        writeOffReason: reason,
      });

      if (this.journalService) {
        await this.journalService.postInstallmentWriteOff(client, actor, {
          planId,
          planNumber: plan.plan_number,
          date: writeOffDate,
          outstandingAmount,
          reason,
          waivedMarkup: remainingMarkup,
          badDebtAmount,
          markupRecognitionMode: plan.markup_recognition_mode,
        });
      }

      await this.recordActivity(client, actor, {
        actionType: "installment_plan.write_off",
        entityId: planId,
        reason,
        description: `${actor.name} wrote off installment plan ${plan.plan_number}`,
        metadata: { planId, outstandingAmount, badDebtAmount, remainingMarkup },
      });

      const schedule = await listScheduleByPlan(client, planId, actor.tenantId);
      return { plan: updatedPlan, schedule };
    });
  }

  // Only allowed before any installment payment has been collected (down
  // payment only) — per the spec's own v1 recommendation, anything further
  // goes through write-off instead so a real collection history is never
  // silently discarded. Reverses both the plan's own journal entry (which
  // hands the financed amount back to generic Accounts Receivable) and the
  // Phase 1 compensating due-ledger entry (which restores it as an ordinary
  // due-ledger receivable) — cancelling an installment plan converts the sale
  // back into a normal credit sale, it does not touch stock or the invoice.
  async cancelPlan(input, actor) {
    const planId = String(input.planId || "").trim();
    assert(planId, "Plan is required.", 400);
    const reason = String(input.reason || "").trim();
    assert(reason, "A reason is required to cancel a plan.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const plan = await findInstallmentPlanForUpdate(client, planId, actor.tenantId);
      assert(plan, "Installment plan not found.", 404);
      assert(plan.status === "ACTIVE", `Cannot cancel a ${plan.status.toLowerCase()} plan.`, 400);
      assert(
        Number(plan.total_paid || 0) <= EPSILON,
        "This plan already has collected payments — cancel is only for plans with no installment payments yet. Use write-off instead.",
        400,
      );

      const unpaidRows = await listUnpaidScheduleForUpdate(client, planId, actor.tenantId);
      for (const row of unpaidRows) {
        await updateInstallmentScheduleRow(client, row.id, actor.tenantId, {
          paidAmount: row.paidAmount,
          remainingAmount: 0,
          status: "WAIVED",
          paidDate: row.paidDate,
        });
      }

      const updatedPlan = await markInstallmentPlanCancelled(client, planId, actor.tenantId, {
        cancelledById: actor.id,
        cancelReason: reason,
      });

      if (this.journalService) {
        await this.journalService.reverse(client, {
          tenantId: actor.tenantId,
          sourceType: JOURNAL_SOURCE_TYPES.INSTALLMENT_PLAN,
          sourceId: planId,
          reason,
          createdById: actor.id,
        });
      }

      const financeAmount = Number(plan.finance_amount || 0);
      if (financeAmount > 0) {
        const latestEntry = await getLatestCustomerDueLedgerEntry(client, plan.customer_id, actor.tenantId);
        const customerResult = await findRetailCustomerForUpdate(client, plan.customer_id, actor.tenantId);
        const currentBalance = latestEntry ? latestEntry.balanceAfter : Number(customerResult.rows[0]?.opening_due || 0);
        const balanceAfter = currentBalance + financeAmount;
        await recordCustomerDueLedgerEntry(client, {
          tenantId: actor.tenantId,
          customerId: plan.customer_id,
          type: CUSTOMER_DUE_LEDGER_TYPES.MANUAL_ADJUSTMENT,
          debit: financeAmount,
          credit: 0,
          balanceAfter,
          referenceType: "installment_plan",
          referenceId: plan.plan_number,
          note: `Installment plan ${plan.plan_number} cancelled — restored to the general due ledger`,
          createdById: actor.id,
          businessDate: new Date().toISOString().slice(0, 10),
        });
        await updateRetailCustomerCurrentDue(client, plan.customer_id, actor.tenantId, balanceAfter);
      }

      await this.recordActivity(client, actor, {
        actionType: "installment_plan.cancel",
        entityId: planId,
        reason,
        description: `${actor.name} cancelled installment plan ${plan.plan_number}`,
        metadata: { planId, financeAmount },
      });

      const schedule = await listScheduleByPlan(client, planId, actor.tenantId);
      return { plan: updatedPlan, schedule };
    });
  }
}
