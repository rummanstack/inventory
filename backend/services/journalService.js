import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { ACCOUNTS, accountForFinanceType } from "../lib/chartOfAccounts.js";
import { JOURNAL_SOURCE_TYPES } from "../lib/journalSourceTypes.js";
import { accountTypeForPaymentMethod } from "../lib/financeAccounts.js";
import {
  listChartOfAccounts,
  insertJournalEntry,
  insertJournalLine,
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
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  // ── Core primitives ──────────────────────────────────────────────────

  // lines: [{ accountCode, debit?, credit? }, ...]. Throws if unbalanced —
  // deliberately fails the WHOLE calling transaction so a bug in a posting
  // mapping can never leave inconsistent business + accounting state.
  async post(client, { tenantId, entryDate, sourceType, sourceId, memo, createdById, reversalOfEntryId, lines }) {
    const cleanLines = (lines || []).filter((line) => (line.debit || 0) > 0 || (line.credit || 0) > 0);
    assert(cleanLines.length > 0, `Journal entry for ${sourceType}:${sourceId} has no lines.`);

    const totalDebit = cleanLines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = cleanLines.reduce((sum, line) => sum + (line.credit || 0), 0);
    assert(
      Math.abs(totalDebit - totalCredit) < BALANCE_TOLERANCE,
      `Unbalanced journal entry for ${sourceType}:${sourceId} (debit ${totalDebit} != credit ${totalCredit}).`,
    );

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
  // recomputing business amounts — guarantees an exact cancel even if the
  // posting logic for this source type changes later. No-op if the source
  // was never posted (e.g. financeAccountService wasn't wired at the time).
  async reverse(client, { tenantId, sourceType, sourceId, reason, createdById }) {
    const original = await findLiveJournalEntry(client, tenantId, sourceType, sourceId);
    if (!original) {
      return null;
    }

    const originalLines = await listJournalLinesForEntry(client, tenantId, original.id);
    const reversalEntry = await this.post(client, {
      tenantId,
      entryDate: new Date().toISOString().slice(0, 10),
      sourceType,
      sourceId: `${sourceId}:reversal:${createId("r")}`,
      memo: reason ? `Reversal — ${reason}` : "Reversal",
      createdById,
      reversalOfEntryId: original.id,
      lines: originalLines.map((line) => ({
        accountCode: line.accountCode,
        debit: line.credit,
        credit: line.debit,
      })),
    });

    await markJournalEntryReversed(client, tenantId, original.id);

    return reversalEntry;
  }

  // Undoes a reverse() — used when a soft-deleted record is restored from
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

  // Reverses the original entry AND every adjustment posted against it since
  // (e.g. a purchase receipt that was edited twice then deleted) — otherwise
  // a delete after an edit would only undo the original amount, leaving the
  // net effect of the edits stranded on the books.
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

  // ── Source-specific posting (Phase 1 flows) ─────────────────────────

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
      memo: memo || `Expense — ${category}`,
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
      memo: memo || `Expense adjustment — ${category}`,
      createdById: actor.id,
      lines,
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

  // ── Reports ──────────────────────────────────────────────────────────

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
  // (a sale debits Cash/AR and credits Sales Revenue — Equity is untouched).
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
  // normal_balance column — that column exists so contra accounts like Sales
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

// Shared by getProfitAndLoss and getBalanceSheet's Retained Earnings line —
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

  const costOfGoodsSold = activity(ACCOUNTS.COST_OF_GOODS_SOLD, "DEBIT");
  const purchaseReturns = activity(ACCOUNTS.PURCHASE_RETURNS, "CREDIT");
  const netCostOfGoodsSold = costOfGoodsSold - purchaseReturns;

  const grossProfit = netRevenue - netCostOfGoodsSold;

  const operatingExpenses = activity(ACCOUNTS.OPERATING_EXPENSES, "DEBIT");
  const salaryExpense = activity(ACCOUNTS.SALARY_EXPENSE, "DEBIT");
  const stockAdjustment = activity(ACCOUNTS.STOCK_ADJUSTMENT, "DEBIT");
  const totalOperatingExpenses = operatingExpenses + salaryExpense + stockAdjustment;

  const netProfit = grossProfit - totalOperatingExpenses;

  return {
    revenue: { salesRevenue, salesReturns, discountsGiven, netRevenue },
    costOfGoodsSold: { costOfGoodsSold, purchaseReturns, netCostOfGoodsSold },
    grossProfit,
    expenses: { operatingExpenses, salaryExpense, stockAdjustment, totalOperatingExpenses },
    netProfit,
  };
}
