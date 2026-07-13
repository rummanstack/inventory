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
import { recordCustomerDueLedgerEntry } from "./shared/inventoryHelpers.js";

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

      const [schedule, payments] = await Promise.all([
        listScheduleByPlan(client, planId, actor.tenantId),
        listPaymentsByPlan(client, planId, actor.tenantId),
      ]);

      return { plan: mapInstallmentPlan(result.rows[0]), schedule, payments };
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
}
