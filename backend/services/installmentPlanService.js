import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { cleanMoney, cleanInteger, normalizeSalesInvoice } from "../lib/normalizers.js";
import { normalizeIsoDate, addDays } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { nextInstallmentPlanNumber } from "../lib/installmentNumber.js";
import { CUSTOMER_DUE_LEDGER_TYPES } from "../lib/customerDueLedger.js";
import { ACCOUNTS } from "../lib/chartOfAccounts.js";
import { findTenantById } from "../repositories/tenantRepository.js";
import {
  findRetailCustomerForUpdate,
  findRetailCustomerById,
  updateRetailCustomerCurrentDue,
  updateRetailCustomerCreditSettings,
} from "../repositories/retailCustomerRepository.js";
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
  sumActiveOutstandingForCustomer,
  sumActiveOutstandingForTenant,
  countPriorDefaultsForCustomer,
  countPlansByStatus,
  applyLateFeeToPlan,
  mapInstallmentPlan,
} from "../repositories/installmentPlanRepository.js";
import {
  insertInstallmentScheduleRow,
  listScheduleByPlan,
  listUnpaidScheduleForUpdate,
  updateInstallmentScheduleRow,
  listDueSchedule,
  listOverdueSchedule,
  sumOverdueForCustomer,
  sumExpectedForRange,
  findInstallmentScheduleRowForUpdate,
  applyLateFeeToScheduleRow,
} from "../repositories/installmentScheduleRepository.js";
import {
  insertInstallmentPayment,
  insertInstallmentPaymentAllocation,
  listPaymentsByPlan,
  listPaymentsInRange,
} from "../repositories/installmentPaymentRepository.js";
import { insertInstallmentRescheduleLog, listRescheduleLogByPlan } from "../repositories/installmentRescheduleLogRepository.js";
import {
  insertInstallmentGuarantor,
  listGuarantorsByPlan,
  findInstallmentGuarantorById,
  softDeleteInstallmentGuarantor,
} from "../repositories/installmentGuarantorRepository.js";
import {
  insertDocument,
  listDocumentsForEntity,
  findDocumentById,
  softDeleteDocument,
} from "../repositories/documentRepository.js";
import {
  insertLateFeeRule,
  listLateFeeRules,
  findActiveLateFeeRule,
  findLateFeeRuleById,
  updateLateFeeRule,
} from "../repositories/installmentLateFeeRuleRepository.js";
import { calculateLateFee } from "../lib/lateFeeEngine.js";
import { recordCustomerDueLedgerEntry } from "./shared/inventoryHelpers.js";
import { JOURNAL_SOURCE_TYPES } from "../lib/journalSourceTypes.js";
import { PERMISSIONS, hasPermission } from "../lib/permissions.js";

const DATE_ERROR = "Date must be in YYYY-MM-DD format.";
const MARKUP_TYPES = ["PERCENT", "FIXED"];
const MARKUP_RECOGNITION_MODES = ["GRADUAL", "IMMEDIATE"];
const PAYMENT_METHODS = ["CASH", "BANK", "MOBILE_BANKING", "CARD", "CHEQUE", "STORE_CREDIT", "GIFT_VOUCHER"];
const CASH_MOVEMENT_METHODS = new Set(["CASH", "BANK", "MOBILE_BANKING", "CARD", "CHEQUE"]);
const DOCUMENT_ENTITY_TYPE = "installment_plan";
const LATE_FEE_TYPES = ["FIXED", "PERCENT", "DAILY", "WEEKLY", "MONTHLY"];
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
  constructor(databaseManager, { auditService, financeAccountService, salesInvoiceService, journalService, reportExportService, notificationService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.financeAccountService = financeAccountService;
    this.salesInvoiceService = salesInvoiceService;
    this.journalService = journalService;
    this.reportExportService = reportExportService;
    this.notificationService = notificationService;
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
      assert(customer.is_credit_blocked !== true, "This customer is blocked from new installment credit.", 400);

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

      // Credit check runs after the invoice exists (so finalPayableAmount is the
      // real, tax/promotion-adjusted figure, not an estimate) but everything so
      // far — stock deduction included — is inside this same transaction, so a
      // rejection here rolls all of it back, same as any other mid-transaction
      // validation failure in this codebase.
      const exposure = await this.computeCreditExposure(client, customer.id, actor.tenantId, finalPayableAmount);
      if (exposure.overLimit) {
        const canOverride = hasPermission(actor.role, PERMISSIONS.OVERRIDE_INSTALLMENT_CREDIT_LIMIT, actor.tenantId);
        assert(canOverride, `This plan would push ${customer.name}'s exposure to ${exposure.totalExposure}, over their credit limit of ${exposure.creditLimit}.`, 400);
        assert(input.overrideCreditLimit === true, "Exceeding the credit limit requires an explicit override confirmation.", 400);
      }

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
        metadata: {
          planNumber,
          customerId: customer.id,
          finalPayableAmount,
          numberOfMonths,
          creditLimitOverridden: exposure.overLimit,
          totalExposure: exposure.totalExposure,
        },
      });

      if (this.notificationService) {
        await this.notificationService.send({
          tenantId: actor.tenantId,
          channel: "SMS",
          to: customer.phone,
          template: "installment_plan_created",
          data: { planNumber, finalPayableAmount, firstPaymentDate },
        });
      }

      return { plan, schedule, invoice, creditCheck: exposure };
    });
  }

  // Shared by the standalone pre-check endpoint and createPlan's own
  // enforcement, so the two can never drift into different numbers for the
  // same customer.
  async computeCreditExposure(client, customerId, tenantId, additionalExposure = 0) {
    const customerResult = await findRetailCustomerById(client, customerId, tenantId);
    assert(customerResult.rowCount > 0, "Customer not found.", 404);
    const customer = customerResult.rows[0];

    const today = new Date().toISOString().slice(0, 10);
    const [installmentOutstanding, overdueAmount, priorDefaultCount] = await Promise.all([
      sumActiveOutstandingForCustomer(client, customerId, tenantId),
      sumOverdueForCustomer(client, customerId, tenantId, today),
      countPriorDefaultsForCustomer(client, customerId, tenantId),
    ]);

    const normalDue = Number(customer.current_due || 0);
    const creditLimit = Number(customer.credit_limit || 0);
    const totalExposure = round2(normalDue + installmentOutstanding + additionalExposure);

    return {
      customerId,
      customerName: customer.name,
      normalDue: round2(normalDue),
      installmentOutstanding: round2(installmentOutstanding),
      overdueAmount: round2(overdueAmount),
      priorDefaultCount,
      creditLimit,
      isBlocked: customer.is_credit_blocked === true,
      additionalExposure: round2(additionalExposure),
      totalExposure,
      overLimit: creditLimit > 0 && totalExposure > creditLimit + EPSILON,
    };
  }

  async getCreditCheck(query = {}, actor) {
    const customerId = String(query.customerId || "").trim();
    assert(customerId, "Customer is required.", 400);
    const additionalExposure = cleanMoney(query.additionalExposure);

    return this.databaseManager.withClient((client) => this.computeCreditExposure(client, customerId, actor.tenantId, additionalExposure));
  }

  async updateCustomerCreditSettings(input, actor) {
    const customerId = String(input.customerId || "").trim();
    assert(customerId, "Customer is required.", 400);
    const creditLimit = cleanMoney(input.creditLimit);
    assert(creditLimit >= 0, "Credit limit cannot be negative.", 400);
    const isCreditBlocked = input.isCreditBlocked === true;

    return this.databaseManager.withTransaction(async (client) => {
      const result = await updateRetailCustomerCreditSettings(client, customerId, actor.tenantId, { creditLimit, isCreditBlocked });
      assert(result.rowCount > 0, "Customer not found.", 404);

      await this.recordActivity(client, actor, {
        actionType: "installment_plan.update_credit_settings",
        entityId: customerId,
        description: `${actor.name} updated installment credit settings for customer ${customerId}`,
        metadata: { customerId, creditLimit, isCreditBlocked },
      });

      return { customerId, creditLimit, isCreditBlocked };
    });
  }

  async addGuarantor(input, actor) {
    const planId = String(input.planId || "").trim();
    assert(planId, "Plan is required.", 400);
    const name = String(input.name || "").trim();
    assert(name, "Guarantor name is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const plan = await findInstallmentPlanForUpdate(client, planId, actor.tenantId);
      assert(plan, "Installment plan not found.", 404);

      const guarantor = await insertInstallmentGuarantor(client, {
        id: createId("instguar"),
        tenantId: actor.tenantId,
        planId,
        name,
        phone: String(input.phone || "").trim(),
        address: String(input.address || "").trim(),
        nationalId: String(input.nationalId || "").trim(),
        relationship: String(input.relationship || "").trim(),
        occupation: String(input.occupation || "").trim(),
        employer: String(input.employer || "").trim(),
        monthlyIncome: cleanMoney(input.monthlyIncome),
        referenceNotes: String(input.referenceNotes || "").trim(),
        emergencyContact: String(input.emergencyContact || "").trim(),
        createdById: actor.id,
      });

      await this.recordActivity(client, actor, {
        actionType: "installment_plan.add_guarantor",
        entityId: planId,
        description: `${actor.name} added guarantor ${name} to installment plan ${plan.plan_number}`,
        metadata: { planId, guarantorId: guarantor.id },
      });

      return guarantor;
    });
  }

  async removeGuarantor(input, actor) {
    const planId = String(input.planId || "").trim();
    const guarantorId = String(input.guarantorId || "").trim();
    assert(planId && guarantorId, "Plan and guarantor are required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const plan = await findInstallmentPlanForUpdate(client, planId, actor.tenantId);
      assert(plan, "Installment plan not found.", 404);

      const existing = await findInstallmentGuarantorById(client, guarantorId, actor.tenantId);
      assert(existing.rowCount > 0 && existing.rows[0].plan_id === planId, "Guarantor not found.", 404);

      const removed = await softDeleteInstallmentGuarantor(client, guarantorId, actor.tenantId);

      await this.recordActivity(client, actor, {
        actionType: "installment_plan.remove_guarantor",
        entityId: planId,
        description: `${actor.name} removed a guarantor from installment plan ${plan.plan_number}`,
        metadata: { planId, guarantorId },
      });

      return removed;
    });
  }

  // The uploaded file itself already went through POST /api/upload/photo (or
  // whatever upload endpoint the frontend used) — this just attaches that
  // resulting URL to the plan as a categorized document record. See the build
  // spec's note on why actual cloud storage is a separate, deferred decision.
  async attachDocument(input, actor) {
    const planId = String(input.planId || "").trim();
    assert(planId, "Plan is required.", 400);
    const url = String(input.url || "").trim();
    assert(url, "A document URL is required.", 400);
    const documentType = String(input.documentType || "").trim();
    assert(documentType, "A document type is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const plan = await findInstallmentPlanForUpdate(client, planId, actor.tenantId);
      assert(plan, "Installment plan not found.", 404);

      const document = await insertDocument(client, {
        id: createId("doc"),
        tenantId: actor.tenantId,
        entityType: DOCUMENT_ENTITY_TYPE,
        entityId: planId,
        documentType,
        url,
        uploadedById: actor.id,
      });

      await this.recordActivity(client, actor, {
        actionType: "installment_plan.attach_document",
        entityId: planId,
        description: `${actor.name} attached a ${documentType} document to installment plan ${plan.plan_number}`,
        metadata: { planId, documentId: document.id, documentType },
      });

      return document;
    });
  }

  async removeDocument(input, actor) {
    const planId = String(input.planId || "").trim();
    const documentId = String(input.documentId || "").trim();
    assert(planId && documentId, "Plan and document are required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const plan = await findInstallmentPlanForUpdate(client, planId, actor.tenantId);
      assert(plan, "Installment plan not found.", 404);

      const existing = await findDocumentById(client, documentId, actor.tenantId);
      assert(
        existing.rowCount > 0 && existing.rows[0].entity_type === DOCUMENT_ENTITY_TYPE && existing.rows[0].entity_id === planId,
        "Document not found.",
        404,
      );

      const removed = await softDeleteDocument(client, documentId, actor.tenantId);

      await this.recordActivity(client, actor, {
        actionType: "installment_plan.remove_document",
        entityId: planId,
        description: `${actor.name} removed a document from installment plan ${plan.plan_number}`,
        metadata: { planId, documentId },
      });

      return removed;
    });
  }

  async getPlan(planId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const result = await findInstallmentPlanById(client, planId, actor.tenantId);
      assert(result.rowCount > 0, "Installment plan not found.", 404);

      const [schedule, payments, rescheduleLog, guarantors, documents] = await Promise.all([
        listScheduleByPlan(client, planId, actor.tenantId),
        listPaymentsByPlan(client, planId, actor.tenantId),
        listRescheduleLogByPlan(client, planId, actor.tenantId),
        listGuarantorsByPlan(client, planId, actor.tenantId),
        listDocumentsForEntity(client, actor.tenantId, DOCUMENT_ENTITY_TYPE, planId),
      ]);

      return { plan: mapInstallmentPlan(result.rows[0]), schedule, payments, rescheduleLog, guarantors, documents };
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

      if (this.notificationService) {
        const customerResult = await findRetailCustomerById(client, plan.customer_id, actor.tenantId);
        await this.notificationService.send({
          tenantId: actor.tenantId,
          channel: "SMS",
          to: customerResult.rows[0]?.phone,
          template: newStatus === "COMPLETED" ? "installment_plan_completed" : "installment_payment_received",
          data: { planNumber: plan.plan_number, amount, newOutstanding },
        });
      }

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
      const [rows, activeLateFeeRule] = await Promise.all([
        listOverdueSchedule(client, actor.tenantId, asOfDate),
        findActiveLateFeeRule(client, actor.tenantId),
      ]);
      const totalOverdue = round2(rows.reduce((sum, row) => sum + row.remainingAmount, 0));

      // previewLateFee is what applying the fee right now would charge — a
      // read-only calculation, not a stored value (that's late_fee_applied,
      // already 0 unless someone has previously called applyLateFee on the row).
      const rowsWithPreview = rows.map((row) => ({
        ...row,
        previewLateFee: activeLateFeeRule
          ? calculateLateFee(activeLateFeeRule, { remainingAmount: row.remainingAmount, daysOverdue: row.daysOverdue })
          : 0,
      }));

      return { asOfDate, rows: rowsWithPreview, totalOverdue, lateFeeRuleActive: Boolean(activeLateFeeRule) };
    });
  }

  async listLateFeeRulesForTenant(actor) {
    return this.databaseManager.withClient((client) => listLateFeeRules(client, actor.tenantId));
  }

  async saveLateFeeRule(input, actor) {
    const feeType = String(input.feeType || "").trim().toUpperCase();
    assert(LATE_FEE_TYPES.includes(feeType), `Fee type must be one of: ${LATE_FEE_TYPES.join(", ")}.`, 400);
    const feeValue = cleanMoney(input.feeValue);
    assert(feeValue >= 0, "Fee value cannot be negative.", 400);
    const gracePeriodDays = Math.max(0, cleanInteger(input.gracePeriodDays));
    const maxPenaltyAmount = Math.max(0, cleanMoney(input.maxPenaltyAmount));
    const active = input.active !== false;
    const ruleId = String(input.id || "").trim();

    return this.databaseManager.withTransaction(async (client) => {
      let rule;
      if (ruleId) {
        rule = await updateLateFeeRule(client, ruleId, actor.tenantId, { feeType, feeValue, gracePeriodDays, maxPenaltyAmount, active });
        assert(rule, "Late fee rule not found.", 404);
      } else {
        rule = await insertLateFeeRule(client, {
          id: createId("latefeerule"),
          tenantId: actor.tenantId,
          feeType,
          feeValue,
          gracePeriodDays,
          maxPenaltyAmount,
          active,
          createdById: actor.id,
        });
      }

      await this.recordActivity(client, actor, {
        actionType: ruleId ? "installment_plan.update_late_fee_rule" : "installment_plan.create_late_fee_rule",
        entityId: rule.id,
        description: `${actor.name} ${ruleId ? "updated" : "created"} a late fee rule (${feeType})`,
        metadata: { ruleId: rule.id, feeType, feeValue, gracePeriodDays, maxPenaltyAmount, active },
      });

      return rule;
    });
  }

  // Deliberately not automatic — this app has no cron/job runner, so a late
  // fee is only ever charged when explicitly triggered here (by a user, or
  // later by a scheduled job someone wires up), never silently in the
  // background. Applying twice to an already-fee-bearing row just recomputes
  // and re-applies against its current (already-widened) remaining amount —
  // callers should check previewLateFee from the Overdue Report first.
  async applyLateFee(input, actor) {
    const scheduleId = String(input.scheduleId || "").trim();
    assert(scheduleId, "Schedule row is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const row = await findInstallmentScheduleRowForUpdate(client, scheduleId, actor.tenantId);
      assert(row, "Installment schedule row not found.", 404);
      assert(["PENDING", "PARTIAL"].includes(row.status), `Cannot apply a late fee to a ${row.status.toLowerCase()} installment.`, 400);

      const plan = await findInstallmentPlanForUpdate(client, row.plan_id, actor.tenantId);
      assert(plan, "Installment plan not found.", 404);
      assert(plan.status === "ACTIVE", `Cannot apply a late fee on a ${plan.status.toLowerCase()} plan.`, 400);

      const rule = await findActiveLateFeeRule(client, actor.tenantId);
      assert(rule, "No active late fee rule is configured for this tenant.", 400);

      const today = new Date().toISOString().slice(0, 10);
      const daysOverdue = Math.max(0, Math.round((new Date(today).getTime() - new Date(row.due_date).getTime()) / 86400000));
      const remainingAmount = Number(row.remaining_amount || 0);
      const feeAmount = calculateLateFee(rule, { remainingAmount, daysOverdue });
      assert(feeAmount > 0, "This installment is not yet eligible for a late fee (still within its grace period, or nothing is overdue).", 400);

      const newDueAmount = round2(Number(row.due_amount || 0) + feeAmount);
      const newRemainingAmount = round2(remainingAmount + feeAmount);
      const newLateFeeApplied = round2(Number(row.late_fee_applied || 0) + feeAmount);

      const updatedRow = await applyLateFeeToScheduleRow(client, scheduleId, actor.tenantId, {
        dueAmount: newDueAmount,
        remainingAmount: newRemainingAmount,
        lateFeeApplied: newLateFeeApplied,
      });
      const updatedPlan = await applyLateFeeToPlan(client, row.plan_id, actor.tenantId, feeAmount);

      await this.recordActivity(client, actor, {
        actionType: "installment_plan.apply_late_fee",
        entityId: row.plan_id,
        description: `${actor.name} applied a late fee of ${feeAmount} to installment #${row.installment_no} of plan ${plan.plan_number}`,
        metadata: { scheduleId, planId: row.plan_id, feeAmount, daysOverdue },
      });

      return { schedule: updatedRow, plan: updatedPlan };
    });
  }

  async getDashboard(actor) {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = `${today.slice(0, 7)}-01`;

    return this.databaseManager.withClient(async (client) => {
      const [
        todaysDueRows,
        overdueRows,
        upcomingRows,
        planCounts,
        outstandingReceivable,
        todaysCollections,
        monthCollections,
        expectedThisMonth,
      ] = await Promise.all([
        listDueSchedule(client, actor.tenantId, { dateFrom: today, dateTo: today }),
        listOverdueSchedule(client, actor.tenantId, today),
        listDueSchedule(client, actor.tenantId, { dateFrom: today, dateTo: addDays(today, 7) }),
        countPlansByStatus(client, actor.tenantId),
        sumActiveOutstandingForTenant(client, actor.tenantId),
        listPaymentsInRange(client, actor.tenantId, { dateFrom: today, dateTo: today }),
        listPaymentsInRange(client, actor.tenantId, { dateFrom: monthStart, dateTo: today }),
        sumExpectedForRange(client, actor.tenantId, monthStart, today),
      ]);

      const todaysDueAmount = round2(todaysDueRows.reduce((sum, row) => sum + row.remainingAmount, 0));
      const overdueAmount = round2(overdueRows.reduce((sum, row) => sum + row.remainingAmount, 0));
      const upcomingDueAmount = round2(upcomingRows.reduce((sum, row) => sum + row.remainingAmount, 0));
      const todaysCollectionsAmount = round2(todaysCollections.reduce((sum, row) => sum + row.amount, 0));
      const monthCollectionsAmount = round2(monthCollections.reduce((sum, row) => sum + row.amount, 0));

      const resolvedPlans = planCounts.COMPLETED + planCounts.WRITTEN_OFF;
      const defaultRate = resolvedPlans > 0 ? round2((planCounts.WRITTEN_OFF / resolvedPlans) * 100) : 0;
      const collectionPerformance = expectedThisMonth > 0 ? round2((monthCollectionsAmount / expectedThisMonth) * 100) : 0;

      return {
        asOfDate: today,
        todaysCollections: todaysCollectionsAmount,
        todaysDue: todaysDueAmount,
        overdueAmount,
        upcomingDue: upcomingDueAmount,
        activePlans: planCounts.ACTIVE,
        completedPlans: planCounts.COMPLETED,
        writtenOffPlans: planCounts.WRITTEN_OFF,
        cancelledPlans: planCounts.CANCELLED,
        defaultRate,
        expectedMonthlyCollection: round2(expectedThisMonth),
        monthToDateCollection: monthCollectionsAmount,
        outstandingReceivable: round2(outstandingReceivable),
        collectionPerformance,
      };
    });
  }

  // Reuses the same Playwright/Chromium pipeline as reportExportService's
  // other exports (see its renderHtmlToPdf helper) but with a dedicated
  // document-style template — an installment agreement isn't a data table, it
  // needs free-text terms and signature blocks, which the generic tabular
  // report layout isn't built for.
  async generateAgreementPdf(planId, actor) {
    assert(this.reportExportService, "PDF export is not available.", 500);

    return this.databaseManager.withClient(async (client) => {
      const planResult = await findInstallmentPlanById(client, planId, actor.tenantId);
      assert(planResult.rowCount > 0, "Installment plan not found.", 404);
      const plan = mapInstallmentPlan(planResult.rows[0]);

      const [schedule, guarantors, tenant] = await Promise.all([
        listScheduleByPlan(client, planId, actor.tenantId),
        listGuarantorsByPlan(client, planId, actor.tenantId),
        findTenantById(client, actor.tenantId),
      ]);

      const buffer = await this.reportExportService.createInstallmentAgreementPdf({
        plan,
        schedule,
        guarantors,
        tenantName: tenant?.name || "StockLedger",
        tenantAddress: tenant?.address || "",
      });

      return buffer;
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
