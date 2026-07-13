import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { ACCOUNTS, accountForFinanceType } from "../lib/chartOfAccounts.js";
import { JOURNAL_SOURCE_TYPES } from "../lib/journalSourceTypes.js";
import { accountTypeForPaymentMethod } from "../lib/financeAccounts.js";
import {
  listChartOfAccounts,
  insertJournalEntry,
  insertJournalLine,
  findJournalEntryById,
  findLiveJournalEntry,
  findReversalEntry,
  listJournalLinesForEntry,
  listLiveJournalEntriesBySourceIdPrefix,
  markJournalEntryReversed,
  clearJournalEntryReversed,
  deleteJournalEntry,
  listGeneralLedgerLines,
  getTrialBalance,
} from "../repositories/journalRepository.js";
import { AccountingValidationService } from "./accountingValidationService.js";

const BALANCE_TOLERANCE = 0.0001;

// Builds one line for a signed delta: a positive delta lands on `positiveSide`
// ('debit' or 'credit'), a negative delta lands on the opposite side with the
// absolute amount. Used for update-time adjustment postings, where the sum of
// deltas across accounts is guaranteed to balance by construction (the
// original create-time posting was balanced, and total = sum of its parts).
function signedLine(accountCode, delta, positiveSide) {
  const negativeSide = positiveSide === "debit" ? "credit" : "debit";
  return delta >= 0 ? { accountCode, [positiveSide]: delta } : { accountCode, [negativeSide]: -delta };
}

// Every existing module (sales, purchases, payments, expenses, finance
// accounts) keeps its own tables as the source of truth for its own pages.
// This service is a purely additive posting layer: it never reads business
// tables and nothing else in the app reads the journal back. It exists only
// to feed General Ledger / Trial Balance reports.
export class JournalService {
  constructor(databaseManager, { accountingValidationService } = {}) {
    this.databaseManager = databaseManager;
    this.accountingValidationService = accountingValidationService || new AccountingValidationService(databaseManager);
  }

  async assertPostingAllowed(client, tenantId, entryDate, purpose = "Posting") {
    return this.accountingValidationService.assertPostingAllowed(client, { tenantId, entryDate, purpose });
  }

  // -- Core primitives --------------------------------------------------

  // lines: [{ accountCode, debit?, credit? }, ...]. Throws if unbalanced;
  // deliberately fails the whole calling transaction so a bug in a posting
  // mapping can never leave inconsistent business + accounting state.
  async post(client, { tenantId, entryDate, sourceType, sourceId, memo, createdById, reversalOfEntryId, lines, allowInactiveAccounts = false }) {
    const cleanLines = (lines || []).filter((line) => (line.debit || 0) > 0 || (line.credit || 0) > 0);
    await this.accountingValidationService.validatePosting(client, {
      tenantId,
      entryDate,
      lines: cleanLines,
      purpose: `Posting ${sourceType}:${sourceId}`,
      allowInactiveAccounts,
      context: `Journal entry for ${sourceType}:${sourceId}`,
    });

    const entry = await insertJournalEntry(client, {
      id: createId("journal"),
      tenantId,
      entryDate,
      sourceType,
      sourceId,
      memo: memo || "",
      createdById,
      reversalOfEntryId,
    });

    for (const line of cleanLines) {
      await insertJournalLine(client, {
        id: createId("journal-line"),
        tenantId,
        journalEntryId: entry.id,
        accountCode: line.accountCode,
        debit: line.debit || 0,
        credit: line.credit || 0,
      });
    }

    return entry;
  }

  // Mirrors whatever was actually posted (swap debit/credit) rather than
  // recomputing business amounts; guarantees an exact cancel even if the
  // posting logic for this source type changes later. No-op if the source
  // was never posted.
  async reverse(client, { tenantId, sourceType, sourceId, reason, createdById }) {
    const original = await findLiveJournalEntry(client, tenantId, sourceType, sourceId);
    if (!original) {
      return null;
    }
    assert(!original.reversedAt, `Journal entry for ${sourceType}:${sourceId} is already reversed.`, 400);

    const originalLines = await listJournalLinesForEntry(client, tenantId, original.id);
    const reversalEntry = await this.post(client, {
      tenantId,
      entryDate: new Date().toISOString().slice(0, 10),
      sourceType,
      sourceId: `${sourceId}:reversal:${createId("r")}`,
      memo: reason ? `Reversal - ${reason}` : "Reversal",
      createdById,
      reversalOfEntryId: original.id,
      lines: originalLines.map((line) => ({
        accountCode: line.accountCode,
        debit: line.credit,
        credit: line.debit,
      })),
      allowInactiveAccounts: true,
    });

    await markJournalEntryReversed(client, tenantId, original.id);
    return reversalEntry;
  }

  async reverseEntryById(client, { tenantId, entryId, reason, createdById }) {
    const original = await findJournalEntryById(client, tenantId, entryId);
    assert(original, "Journal entry not found.", 404);
    assert(!original.reversalOfEntryId, "Reversal journals cannot be reversed directly.", 400);
    assert(!original.reversedAt, "Journal entry is already reversed.", 400);

    const originalLines = await listJournalLinesForEntry(client, tenantId, original.id);
    const reversalEntry = await this.post(client, {
      tenantId,
      entryDate: new Date().toISOString().slice(0, 10),
      sourceType: original.sourceType,
      sourceId: `${original.sourceId}:reversal:${createId("r")}`,
      memo: reason ? `Reversal - ${reason}` : "Reversal",
      createdById,
      reversalOfEntryId: original.id,
      lines: originalLines.map((line) => ({
        accountCode: line.accountCode,
        debit: line.credit,
        credit: line.debit,
      })),
      allowInactiveAccounts: true,
    });

    await markJournalEntryReversed(client, tenantId, original.id);
    return { original, reversalEntry };
  }

  // Undoes a reverse() - used when a soft-deleted record is restored from
  // trash. Deletes the reversal entry outright rather than posting a second
  // mirror, so a restore leaves the ledger exactly as if the delete never
  // happened. No-op if the source was never reversed.
  async unreverse(client, { tenantId, sourceType, sourceId }) {
    const original = await findLiveJournalEntry(client, tenantId, sourceType, sourceId);
    if (!original || !original.reversedAt) {
      return;
    }

    const reversalEntry = await findReversalEntry(client, tenantId, original.id);
    if (reversalEntry) {
      await deleteJournalEntry(client, tenantId, reversalEntry.id);
    }
    await clearJournalEntryReversed(client, tenantId, original.id);
  }

  // Reverses the original entry and every adjustment posted against it since.
  async reverseAllForSource(client, { tenantId, sourceType, sourceId, adjustmentSourceType, reason, createdById }) {
    await this.reverse(client, { tenantId, sourceType, sourceId, reason, createdById });
    if (!adjustmentSourceType) return;
    const adjustments = await listLiveJournalEntriesBySourceIdPrefix(client, tenantId, adjustmentSourceType, `${sourceId}:`);
    for (const adjustment of adjustments) {
      await this.reverse(client, {
        tenantId,
        sourceType: adjustmentSourceType,
        sourceId: adjustment.sourceId,
        reason,
        createdById,
      });
    }
  }

  async unreverseAllForSource(client, { tenantId, sourceType, sourceId, adjustmentSourceType }) {
    await this.unreverse(client, { tenantId, sourceType, sourceId });
    if (!adjustmentSourceType) return;
    const adjustments = await listLiveJournalEntriesBySourceIdPrefix(client, tenantId, adjustmentSourceType, `${sourceId}:`);
    for (const adjustment of adjustments) {
      await this.unreverse(client, { tenantId, sourceType: adjustmentSourceType, sourceId: adjustment.sourceId });
    }
  }
  // For entities with create+update but no delete (morning issue, evening
  // settlement): hard-deletes whatever is currently live for this sourceId and
  // posts the freshly computed full state in its place. Unlike an adjustment
  // posting (which posts only the delta), this lets the caller always compute
  // from the current record's total state rather than tracking deltas itself ï¿½
  // appropriate here because neither entity has a stored "previous financial
  // state" to diff against once edited (no delete/restore is possible for
  // them either, so there is nothing else that needs the old entry preserved).
  // No-ops (posts nothing) when every line nets to zero, e.g. a morning issue
  // whose products have no purchase_price recorded ï¿½ better than crashing the
  // enclosing business transaction over an entry with nothing to post.
  async replace(client, { tenantId, entryDate, sourceType, sourceId, memo, createdById, lines }) {
    const existing = await findLiveJournalEntry(client, tenantId, sourceType, sourceId);
    if (existing) {
      await deleteJournalEntry(client, tenantId, existing.id);
    }

    const hasAmount = (lines || []).some((line) => (line.debit || 0) > 0 || (line.credit || 0) > 0);
    if (!hasAmount) {
      return null;
    }

    return this.post(client, { tenantId, entryDate, sourceType, sourceId, memo, createdById, lines });
  }

  // -- Source-specific posting (Phase 1 flows) -------------------------

  async postSalesInvoice(client, actor, { invoiceId, invoiceDate, invoiceNumber, paidAmount, dueAmount, totalAmount, taxAmount, cogsAmount }) {
    const lines = [
      { accountCode: ACCOUNTS.CASH, debit: paidAmount },
      { accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE, debit: dueAmount },
      { accountCode: ACCOUNTS.SALES_REVENUE, credit: totalAmount - taxAmount },
      { accountCode: ACCOUNTS.TAX_PAYABLE, credit: taxAmount },
      { accountCode: ACCOUNTS.COST_OF_GOODS_SOLD, debit: cogsAmount },
      { accountCode: ACCOUNTS.INVENTORY, credit: cogsAmount },
    ];
    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: invoiceDate,
      sourceType: JOURNAL_SOURCE_TYPES.SALES_INVOICE,
      sourceId: invoiceId,
      memo: `Sales invoice ${invoiceNumber}`,
      createdById: actor.id,
      lines,
    });
  }

  async postPurchaseReceipt(client, actor, { receiptId, purchaseDate, purchaseNumber, paymentMethod, paidAmount, dueAmount, totalAmount }) {
    const cashOrBank = accountForFinanceType(accountTypeForPaymentMethod(paymentMethod));
    const lines = [
      { accountCode: ACCOUNTS.INVENTORY, debit: totalAmount },
      { accountCode: ACCOUNTS.ACCOUNTS_PAYABLE, credit: dueAmount },
      { accountCode: cashOrBank, credit: paidAmount },
    ];
    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: purchaseDate,
      sourceType: JOURNAL_SOURCE_TYPES.PURCHASE_RECEIPT,
      sourceId: receiptId,
      memo: `Purchase receipt ${purchaseNumber}`,
      createdById: actor.id,
      lines,
    });
  }

  async postPurchaseReceiptAdjustment(client, actor, { receiptId, purchaseDate, purchaseNumber, paymentMethod, totalDelta, paidDelta }) {
    const dueDelta = totalDelta - paidDelta;
    if (!totalDelta && !paidDelta) return null;
    const cashOrBank = accountForFinanceType(accountTypeForPaymentMethod(paymentMethod));
    const lines = [
      signedLine(ACCOUNTS.INVENTORY, totalDelta, "debit"),
      signedLine(ACCOUNTS.ACCOUNTS_PAYABLE, dueDelta, "credit"),
      signedLine(cashOrBank, paidDelta, "credit"),
    ];
    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: purchaseDate,
      sourceType: JOURNAL_SOURCE_TYPES.PURCHASE_RECEIPT_ADJUSTMENT,
      sourceId: `${receiptId}:${createId("adj")}`,
      memo: `Purchase receipt ${purchaseNumber} adjusted`,
      createdById: actor.id,
      lines,
    });
  }

  // Customer payments always land in the CASH finance account regardless of
  // the payment method field on the record (matches customerPaymentService,
  // which hardcodes accountType: "CASH" on its recordTransactionInClient call)
  async postCustomerPayment(client, actor, { paymentId, paymentDate, amount, memo }) {
    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: paymentDate,
      sourceType: JOURNAL_SOURCE_TYPES.CUSTOMER_PAYMENT,
      sourceId: paymentId,
      memo: memo || "Customer payment",
      createdById: actor.id,
      lines: [
        { accountCode: ACCOUNTS.CASH, debit: amount },
        { accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE, credit: amount },
      ],
    });
  }

  async postCustomerPaymentAdjustment(client, actor, { paymentId, paymentDate, amountDelta, memo }) {
    if (!amountDelta) return null;
    const amount = Math.abs(amountDelta);
    const lines = amountDelta > 0
      ? [{ accountCode: ACCOUNTS.CASH, debit: amount }, { accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE, credit: amount }]
      : [{ accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE, debit: amount }, { accountCode: ACCOUNTS.CASH, credit: amount }];
    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: paymentDate,
      sourceType: JOURNAL_SOURCE_TYPES.CUSTOMER_PAYMENT_ADJUSTMENT,
      sourceId: `${paymentId}:${createId("adj")}`,
      memo: memo || "Customer payment adjustment",
      createdById: actor.id,
      lines,
    });
  }

  async postSupplierPayment(client, actor, { paymentId, paymentDate, amount, paymentMethod, memo }) {
    const cashOrBank = accountForFinanceType(accountTypeForPaymentMethod(paymentMethod));
    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: paymentDate,
      sourceType: JOURNAL_SOURCE_TYPES.SUPPLIER_PAYMENT,
      sourceId: paymentId,
      memo: memo || "Supplier payment",
      createdById: actor.id,
      lines: [
        { accountCode: ACCOUNTS.ACCOUNTS_PAYABLE, debit: amount },
        { accountCode: cashOrBank, credit: amount },
      ],
    });
  }

  async postSupplierPaymentAdjustment(client, actor, { paymentId, paymentDate, amountDelta, paymentMethod, memo }) {
    if (!amountDelta) return null;
    const cashOrBank = accountForFinanceType(accountTypeForPaymentMethod(paymentMethod));
    const amount = Math.abs(amountDelta);
    const lines = amountDelta > 0
      ? [{ accountCode: ACCOUNTS.ACCOUNTS_PAYABLE, debit: amount }, { accountCode: cashOrBank, credit: amount }]
      : [{ accountCode: cashOrBank, debit: amount }, { accountCode: ACCOUNTS.ACCOUNTS_PAYABLE, credit: amount }];
    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: paymentDate,
      sourceType: JOURNAL_SOURCE_TYPES.SUPPLIER_PAYMENT_ADJUSTMENT,
      sourceId: `${paymentId}:${createId("adj")}`,
      memo: memo || "Supplier payment adjustment",
      createdById: actor.id,
      lines,
    });
  }

  async postExpense(client, actor, { expenseId, date, amount, category, memo }) {
    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: date,
      sourceType: JOURNAL_SOURCE_TYPES.EXPENSE,
      sourceId: expenseId,
      memo: memo || `Expense ï¿½ ${category}`,
      createdById: actor.id,
      lines: [
        { accountCode: ACCOUNTS.OPERATING_EXPENSES, debit: amount },
        { accountCode: ACCOUNTS.CASH, credit: amount },
      ],
    });
  }

  async postExpenseAdjustment(client, actor, { expenseId, date, amountDelta, category, memo }) {
    if (!amountDelta) return null;
    const amount = Math.abs(amountDelta);
    const lines = amountDelta > 0
      ? [{ accountCode: ACCOUNTS.OPERATING_EXPENSES, debit: amount }, { accountCode: ACCOUNTS.CASH, credit: amount }]
      : [{ accountCode: ACCOUNTS.CASH, debit: amount }, { accountCode: ACCOUNTS.OPERATING_EXPENSES, credit: amount }];
    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: date,
      sourceType: JOURNAL_SOURCE_TYPES.EXPENSE_ADJUSTMENT,
      sourceId: `${expenseId}:${createId("adj")}`,
      memo: memo || `Expense adjustment ï¿½ ${category}`,
      createdById: actor.id,
      lines,
    });
  }

  // An installment plan's underlying sales invoice already posted its financed
  // amount (financeAmount) into generic Accounts Receivable via
  // postSalesInvoice above. This entry reclassifies that amount onto a
  // dedicated Installment Receivable account (so the installment schedule and
  // the general ledger agree on where that money lives) and brings the markup
  // onto the books for the first time — as deferred (unearned) income by
  // default, or straight to revenue if the plan uses immediate recognition.
  // No-ops when there's nothing to book (e.g. a plan with no financed amount).
  async postInstallmentPlan(client, actor, { planId, planNumber, saleDate, financeAmount, markupAmount, markupRecognitionMode }) {
    if (financeAmount <= 0 && markupAmount <= 0) return null;

    const lines = [
      { accountCode: ACCOUNTS.INSTALLMENT_RECEIVABLE, debit: financeAmount + markupAmount },
      { accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE, credit: financeAmount },
    ];
    if (markupAmount > 0) {
      lines.push({
        accountCode: markupRecognitionMode === "IMMEDIATE" ? ACCOUNTS.MARKUP_INCOME : ACCOUNTS.UNEARNED_MARKUP_INCOME,
        credit: markupAmount,
      });
    }

    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: saleDate,
      sourceType: JOURNAL_SOURCE_TYPES.INSTALLMENT_PLAN,
      sourceId: planId,
      memo: `Installment plan ${planNumber}`,
      createdById: actor.id,
      lines,
    });
  }

  // accountCode is the caller-resolved Cash/Bank account for this payment's
  // method (installmentPlanService already decides that, including which
  // methods bypass a cash/bank movement entirely — e.g. store credit). Under
  // GRADUAL recognition, markupRecognized is this payment's proportional slice
  // of the plan's total markup, moved from Unearned Markup Income to Markup
  // Income now that it's actually been collected; under IMMEDIATE recognition
  // the markup was already booked as revenue at plan creation, so this is 0.
  async postInstallmentPayment(client, actor, { paymentId, planNumber, paymentDate, accountCode, amount, markupRecognized = 0 }) {
    if (amount <= 0) return null;

    const lines = [
      { accountCode, debit: amount },
      { accountCode: ACCOUNTS.INSTALLMENT_RECEIVABLE, credit: amount },
    ];
    if (markupRecognized > 0) {
      lines.push({ accountCode: ACCOUNTS.UNEARNED_MARKUP_INCOME, debit: markupRecognized });
      lines.push({ accountCode: ACCOUNTS.MARKUP_INCOME, credit: markupRecognized });
    }

    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: paymentDate,
      sourceType: JOURNAL_SOURCE_TYPES.INSTALLMENT_PAYMENT,
      sourceId: paymentId,
      memo: `Installment payment — plan ${planNumber}`,
      createdById: actor.id,
      lines,
    });
  }

  // Shared by early settlement and write-off: both clear the plan's entire
  // remaining Installment Receivable balance in one entry, just via different
  // combinations of debit lines. cashAmount is what's actually collected (0 for
  // a pure write-off); waivedMarkup is markup that will never be collected —
  // reversed out of whichever account it currently sits in (unearned income if
  // GRADUAL, already-recognized revenue if IMMEDIATE); discount is a plain
  // principal write-down; badDebtAmount is the remaining principal being
  // written off as uncollectible (write-off only). Those four always sum to
  // outstandingAmount by construction at the call site. recognizedMarkup is
  // separate and self-balancing: when a settlement collects the remaining
  // markup in cash under GRADUAL recognition (rather than waiving it), that
  // slice needs to move from Unearned Markup Income to Markup Income exactly
  // like a normal payment would — it doesn't affect the receivable-clearing
  // amount at all, it only reclassifies income already accounted for above.
  async postInstallmentClosure(client, actor, { planId, planNumber, sourceType, date, memo, outstandingAmount, accountCode, cashAmount = 0, waivedMarkup = 0, recognizedMarkup = 0, discount = 0, badDebtAmount = 0, markupRecognitionMode }) {
    if (outstandingAmount <= 0) return null;

    const lines = [{ accountCode: ACCOUNTS.INSTALLMENT_RECEIVABLE, credit: outstandingAmount }];
    if (cashAmount > 0) lines.push({ accountCode, debit: cashAmount });
    if (waivedMarkup > 0) {
      lines.push({
        accountCode: markupRecognitionMode === "IMMEDIATE" ? ACCOUNTS.MARKUP_INCOME : ACCOUNTS.UNEARNED_MARKUP_INCOME,
        debit: waivedMarkup,
      });
    }
    if (discount > 0) lines.push({ accountCode: ACCOUNTS.DISCOUNTS_GIVEN, debit: discount });
    if (badDebtAmount > 0) lines.push({ accountCode: ACCOUNTS.BAD_DEBT_EXPENSE, debit: badDebtAmount });
    if (recognizedMarkup > 0 && markupRecognitionMode === "GRADUAL") {
      lines.push({ accountCode: ACCOUNTS.UNEARNED_MARKUP_INCOME, debit: recognizedMarkup });
      lines.push({ accountCode: ACCOUNTS.MARKUP_INCOME, credit: recognizedMarkup });
    }

    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: date,
      sourceType,
      sourceId: planId,
      memo: memo || `Installment plan ${planNumber}`,
      createdById: actor.id,
      lines,
    });
  }

  async postInstallmentSettlement(client, actor, params) {
    return this.postInstallmentClosure(client, actor, {
      ...params,
      sourceType: JOURNAL_SOURCE_TYPES.INSTALLMENT_SETTLEMENT,
      memo: `Installment plan ${params.planNumber} — early settlement`,
    });
  }

  async postInstallmentWriteOff(client, actor, params) {
    return this.postInstallmentClosure(client, actor, {
      ...params,
      sourceType: JOURNAL_SOURCE_TYPES.INSTALLMENT_WRITE_OFF,
      memo: `Installment plan ${params.planNumber} — written off: ${params.reason || ""}`.trim(),
    });
  }

  // Manual deposit/withdrawal made directly on the Finance Accounts page —
  // not a domain event, so the offsetting side is Owner's Equity.
  async postFinanceManualTransaction(client, actor, { transactionId, date, accountType, type, amount, note }) {
    const account = accountForFinanceType(accountType);
    const lines = type === "DEPOSIT"
      ? [{ accountCode: account, debit: amount }, { accountCode: ACCOUNTS.OWNERS_EQUITY, credit: amount }]
      : [{ accountCode: ACCOUNTS.OWNERS_EQUITY, debit: amount }, { accountCode: account, credit: amount }];
    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: date,
      sourceType: JOURNAL_SOURCE_TYPES.FINANCE_MANUAL_TRANSACTION,
      sourceId: transactionId,
      memo: note || `Manual ${type.toLowerCase()}`,
      createdById: actor.id,
      lines,
    });
  }

  async postFinanceTransfer(client, actor, { transferId, date, fromAccountType, toAccountType, amount, note }) {
    const fromAccount = accountForFinanceType(fromAccountType);
    const toAccount = accountForFinanceType(toAccountType);
    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: date,
      sourceType: JOURNAL_SOURCE_TYPES.FINANCE_TRANSFER,
      sourceId: transferId,
      memo: note || "Cash/bank transfer",
      createdById: actor.id,
      lines: [
        { accountCode: toAccount, debit: amount },
        { accountCode: fromAccount, credit: amount },
      ],
    });
  }

  // Refund is split by the caller into a due-adjustment portion (reduces the
  // customer's AR) and a cash portion (an overpayment refunded in cash even
  // when the overall refund method is DUE_ADJUSTMENT) ï¿½ the two always sum to
  // totalAmount by construction, so this balances regardless of the split.
  // costAmount is the returned items' combined cost basis (all conditions ï¿½
  // GOOD, DAMAGED, WARRANTY ï¿½ treated alike, matching the existing
  // totalProfitAdjustment calculation on the sales return record itself, so
  // this entry's effect on Net Profit never disagrees with the Profit Report
  // for the same period).
  async postSalesReturn(client, actor, { returnId, returnDate, returnNumber, totalAmount, costAmount, dueAdjustmentAmount, cashRefundAmount }) {
    const lines = [
      { accountCode: ACCOUNTS.SALES_RETURNS, debit: totalAmount },
      { accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE, credit: dueAdjustmentAmount },
      { accountCode: ACCOUNTS.CASH, credit: cashRefundAmount },
      { accountCode: ACCOUNTS.INVENTORY, debit: costAmount },
      { accountCode: ACCOUNTS.COST_OF_GOODS_SOLD, credit: costAmount },
    ];
    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: returnDate,
      sourceType: JOURNAL_SOURCE_TYPES.SALES_RETURN,
      sourceId: returnId,
      memo: `Sales return ${returnNumber}`,
      createdById: actor.id,
      lines,
    });
  }

  // Reversal (removePurchaseReturn) reuses the generic reverse() primitive
  // directly from purchaseReturnService ï¿½ a delete mirrors this entry exactly
  // (stock comes back in, supplier payable is debited back), so no separate
  // reversal method is needed here.
  async postPurchaseReturn(client, actor, { returnId, returnDate, returnNumber, totalAmount, supplierName }) {
    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: returnDate,
      sourceType: JOURNAL_SOURCE_TYPES.PURCHASE_RETURN,
      sourceId: returnId,
      memo: `Purchase return ${returnNumber}${supplierName ? ` to ${supplierName}` : ""}`,
      createdById: actor.id,
      lines: [
        { accountCode: ACCOUNTS.ACCOUNTS_PAYABLE, debit: totalAmount },
        { accountCode: ACCOUNTS.INVENTORY, credit: totalAmount },
      ],
    });
  }

  // A morning issue is a transfer between two ASSET accounts ï¿½ goods leave the
  // shop's own sellable Inventory and become goods carried by the DSR, at cost.
  // No revenue or COGS is recognized yet; that only happens at evening
  // settlement (postSettlement) once the DSR reports what actually sold.
  async postMorningIssue(client, actor, { issueId, issueDate, dsrName, totalCost }) {
    return this.replace(client, {
      tenantId: actor.tenantId,
      entryDate: issueDate,
      sourceType: JOURNAL_SOURCE_TYPES.MORNING_ISSUE,
      sourceId: issueId,
      memo: `Morning issue ï¿½ ${dsrName}`,
      createdById: actor.id,
      lines: [
        { accountCode: ACCOUNTS.GOODS_WITH_DSR, debit: totalCost },
        { accountCode: ACCOUNTS.INVENTORY, credit: totalCost },
      ],
    });
  }

  // Evening settlement is where revenue and COGS are actually recognized for a
  // DSR's day: soldCost moves from Goods-with-DSR to COGS (goods sold), while
  // returnedCost (good + damaged items from today's issue, plus any
  // extraReturns not tied to today's issue) moves back into Inventory. The
  // discount is either absorbed by a supplier (debits Accounts Payable ï¿½ the
  // supplier's own payable balance drops, per supplierDiscountService's
  // "credit reduces balance" convention for that ledger) or, with no supplier
  // attached, comes straight off net revenue (Discounts Given). extraReturns
  // are valued at the DSR's wholesale rate (not cost) because they reverse
  // revenue recognized on some earlier day, exactly like a sales return.
  // amountPaid (cash collected) and srHandoverTotal (handed to a Sales Rep
  // instead of collected directly) both reduce what the DSR still owes,
  // matching recordSettlementDueLedgerChanges' own due-ledger math exactly ï¿½
  // this single entry replaces that entire multi-step balance walk with one
  // balanced set of lines. Deliberately excludes shopCollections: cash the DSR
  // collects on a retail shop's own due is never actually deposited into any
  // finance account by settlementService today, so posting it here would
  // invent cash the rest of the app doesn't believe exists ï¿½ a known,
  // pre-existing gap, not something this entry should paper over.
  async postSettlement(client, actor, {
    settlementId,
    settlementDate,
    dsrName,
    totalPayable,
    discount,
    discountSupplierId,
    extraReturnValue,
    soldCost,
    returnedCost,
    amountPaid,
    srHandoverTotal,
  }) {
    const saleDueAmount = totalPayable - discount - extraReturnValue;
    const discountAccount = discountSupplierId ? ACCOUNTS.ACCOUNTS_PAYABLE : ACCOUNTS.DISCOUNTS_GIVEN;
    const lines = [
      { accountCode: ACCOUNTS.SALES_REVENUE, credit: totalPayable },
      { accountCode: ACCOUNTS.SALES_RETURNS, debit: extraReturnValue },
      { accountCode: discountAccount, debit: discount },
      { accountCode: ACCOUNTS.COST_OF_GOODS_SOLD, debit: soldCost },
      { accountCode: ACCOUNTS.INVENTORY, debit: returnedCost },
      { accountCode: ACCOUNTS.GOODS_WITH_DSR, credit: soldCost + returnedCost },
      signedLine(ACCOUNTS.DSR_RECEIVABLE, saleDueAmount - amountPaid - srHandoverTotal, "debit"),
      { accountCode: ACCOUNTS.CASH, debit: amountPaid },
      { accountCode: ACCOUNTS.SR_RECEIVABLE, debit: srHandoverTotal },
    ];
    return this.replace(client, {
      tenantId: actor.tenantId,
      entryDate: settlementDate,
      sourceType: JOURNAL_SOURCE_TYPES.SETTLEMENT,
      sourceId: settlementId,
      memo: `Evening settlement ï¿½ ${dsrName}`,
      createdById: actor.id,
      lines,
    });
  }

  // -- Reports ----------------------------------------------------------

  async postPayrollRun(client, actor, { payrollRunId, payrollMonth, netTotal }) {
    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: `${payrollMonth}-01`,
      sourceType: JOURNAL_SOURCE_TYPES.PAYROLL_RUN,
      sourceId: payrollRunId,
      memo: `Payroll ${payrollMonth}`,
      createdById: actor.id,
      lines: [
        { accountCode: ACCOUNTS.SALARY_EXPENSE, debit: netTotal },
        { accountCode: ACCOUNTS.EMPLOYEE_PAYABLE, credit: netTotal },
      ],
    });
  }

  async postPayrollPayment(client, actor, { payrollRunId, payrollMonth, amount, paymentDate, paymentMethod }) {
    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: paymentDate,
      sourceType: JOURNAL_SOURCE_TYPES.PAYROLL_PAYMENT,
      sourceId: payrollRunId,
      memo: `Payroll payment ${payrollMonth}`,
      createdById: actor.id,
      lines: [
        { accountCode: ACCOUNTS.EMPLOYEE_PAYABLE, debit: amount },
        { accountCode: accountForFinanceType(paymentMethod), credit: amount },
      ],
    });
  }
  async postPromotionEarning(client, actor, { earningId, earnedDate, ruleName, amount }) {
    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: earnedDate,
      sourceType: JOURNAL_SOURCE_TYPES.PROMOTION_EARNING,
      sourceId: earningId,
      memo: ruleName ? `Trade promotion earning - ${ruleName}` : "Trade promotion earning",
      createdById: actor.id,
      lines: [
        { accountCode: ACCOUNTS.PROMOTION_RECEIVABLE, debit: amount },
        { accountCode: ACCOUNTS.PROMOTION_INCOME, credit: amount },
      ],
    });
  }

  async postPromotionSettlementCash(client, actor, { settlementId, settlementDate, amount, financeAccountType }) {
    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: settlementDate,
      sourceType: JOURNAL_SOURCE_TYPES.PROMOTION_SETTLEMENT,
      sourceId: settlementId,
      memo: "Trade promotion cash settlement",
      createdById: actor.id,
      lines: [
        { accountCode: accountForFinanceType(financeAccountType), debit: amount },
        { accountCode: ACCOUNTS.PROMOTION_RECEIVABLE, credit: amount },
      ],
    });
  }

  async postPromotionSettlementStock(client, actor, { settlementId, settlementDate, amount }) {
    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: settlementDate,
      sourceType: JOURNAL_SOURCE_TYPES.PROMOTION_SETTLEMENT,
      sourceId: settlementId,
      memo: "Trade promotion stock settlement",
      createdById: actor.id,
      lines: [
        { accountCode: ACCOUNTS.INVENTORY, debit: amount },
        { accountCode: ACCOUNTS.PROMOTION_INCOME, credit: amount },
      ],
    });
  }

  async postPromotionSettlementCreditNote(client, actor, { settlementId, settlementDate, amount }) {
    return this.post(client, {
      tenantId: actor.tenantId,
      entryDate: settlementDate,
      sourceType: JOURNAL_SOURCE_TYPES.PROMOTION_SETTLEMENT,
      sourceId: settlementId,
      memo: "Trade promotion credit note settlement",
      createdById: actor.id,
      lines: [
        { accountCode: ACCOUNTS.ACCOUNTS_PAYABLE, debit: amount },
        { accountCode: ACCOUNTS.PROMOTION_RECEIVABLE, credit: amount },
      ],
    });
  }
  async getChartOfAccounts() {
    return this.databaseManager.withClient((client) => listChartOfAccounts(client));
  }

  async getGeneralLedger({ accountCode, dateFrom, dateTo }, actor) {
    return this.databaseManager.withClient((client) =>
      listGeneralLedgerLines(client, { tenantId: actor.tenantId, accountCode, dateFrom, dateTo }),
    );
  }

  async getTrialBalance({ dateTo }, actor) {
    const rows = await this.databaseManager.withClient((client) =>
      getTrialBalance(client, { tenantId: actor.tenantId, dateTo }),
    );
    const totalDebit = rows.reduce((sum, row) => sum + row.totalDebit, 0);
    const totalCredit = rows.reduce((sum, row) => sum + row.totalCredit, 0);
    return { rows, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < BALANCE_TOLERANCE };
  }

  // A Balance Sheet needs Assets = Liabilities + Equity to actually hold, but
  // revenue/expense postings never touch the Owner's Equity account directly
  // (a sale debits Cash/AR and credits Sales Revenue ï¿½ Equity is untouched).
  // Retained Earnings is the standard bridge: cumulative (all-time, not
  // period-bound) net profit, added to recorded Equity so the identity holds.
  async getBalanceSheet({ dateTo }, actor) {
    const rows = await this.databaseManager.withClient((client) =>
      getTrialBalance(client, { tenantId: actor.tenantId, dateTo }),
    );

    const assets = rows.filter((row) => row.type === "ASSET");
    const liabilities = rows.filter((row) => row.type === "LIABILITY");
    const equity = rows.filter((row) => row.type === "EQUITY");

    const totalAssets = assets.reduce((sum, row) => sum + row.closingBalance, 0);
    const totalLiabilities = liabilities.reduce((sum, row) => sum + row.closingBalance, 0);
    const recordedEquity = equity.reduce((sum, row) => sum + row.closingBalance, 0);
    const retainedEarnings = computeProfitBreakdown(rows).netProfit;
    const totalEquity = recordedEquity + retainedEarnings;

    return {
      asOfDate: dateTo || null,
      assets,
      liabilities,
      equity,
      retainedEarnings,
      totalAssets,
      totalLiabilities,
      recordedEquity,
      totalEquity,
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < BALANCE_TOLERANCE,
    };
  }

  // Revenue/expense accounts increase on their TYPE's canonical side (credit
  // for revenue, debit for expense) regardless of an individual account's own
  // normal_balance column ï¿½ that column exists so contra accounts like Sales
  // Returns display as a positive amount in the General Ledger, but summing a
  // period's activity has to use the uniform direction so a contra account's
  // activity subtracts from its type's total instead of adding to it.
  async getProfitAndLoss({ dateFrom, dateTo }, actor) {
    const rows = await this.databaseManager.withClient((client) =>
      getTrialBalance(client, { tenantId: actor.tenantId, dateFrom, dateTo }),
    );
    return { dateFrom: dateFrom || null, dateTo: dateTo || null, ...computeProfitBreakdown(rows) };
  }
}

// Shared by getProfitAndLoss and getBalanceSheet's Retained Earnings line ï¿½
// activity-based (uniform per-type direction, not each account's own
// normal_balance) so contra accounts like Sales Returns subtract from their
// type's total instead of adding to it. See getProfitAndLoss's comment above.
function computeProfitBreakdown(rows) {
  const byCode = new Map(rows.map((row) => [row.code, row]));
  const activity = (code, side) => {
    const row = byCode.get(code);
    if (!row) return 0;
    return side === "CREDIT" ? row.totalCredit - row.totalDebit : row.totalDebit - row.totalCredit;
  };

  const salesRevenue = activity(ACCOUNTS.SALES_REVENUE, "CREDIT");
  const salesReturns = activity(ACCOUNTS.SALES_RETURNS, "DEBIT");
  const discountsGiven = activity(ACCOUNTS.DISCOUNTS_GIVEN, "DEBIT");
  const netRevenue = salesRevenue - salesReturns - discountsGiven;

  // Purchase returns have no P&L line here: under this app's perpetual-inventory
  // model, a purchase return is booked straight against Inventory (see
  // postPurchaseReturn) since COGS is only ever recognized at the point of
  // sale ï¿½ there is no periodic Purchases-less-Returns formula for it to net
  // against.
  const costOfGoodsSold = activity(ACCOUNTS.COST_OF_GOODS_SOLD, "DEBIT");
  const netCostOfGoodsSold = costOfGoodsSold;

  const grossProfit = netRevenue - netCostOfGoodsSold;

  const operatingExpenses = activity(ACCOUNTS.OPERATING_EXPENSES, "DEBIT");
  const salaryExpense = activity(ACCOUNTS.SALARY_EXPENSE, "DEBIT");
  const stockAdjustment = activity(ACCOUNTS.STOCK_ADJUSTMENT, "DEBIT");
  const totalOperatingExpenses = operatingExpenses + salaryExpense + stockAdjustment;

  const netProfit = grossProfit - totalOperatingExpenses;

  return {
    revenue: { salesRevenue, salesReturns, discountsGiven, netRevenue },
    costOfGoodsSold: { costOfGoodsSold, netCostOfGoodsSold },
    grossProfit,
    expenses: { operatingExpenses, salaryExpense, stockAdjustment, totalOperatingExpenses },
    netProfit,
  };
}





