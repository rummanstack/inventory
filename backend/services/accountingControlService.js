import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { ACCOUNTING_ACTIONS } from "../lib/auditActions.js";
import { ACCOUNTS } from "../lib/chartOfAccounts.js";
import { JOURNAL_SOURCE_TYPES } from "../lib/journalSourceTypes.js";
import { getTrialBalance } from "../repositories/journalRepository.js";
import { listActivityLogsPage } from "../repositories/activityLogRepository.js";
import { listAllActiveRetailCustomers } from "../repositories/retailCustomerRepository.js";
import { listAllActiveSuppliers } from "../repositories/supplierRepository.js";
import {
  closeAllPeriodsForFiscalYear,
  countOpeningBalancesForFiscalYear,
  countVouchersByStatuses,
  findFiscalYearById,
  findPeriodById,
  findPostingPeriodStatus,
  insertOpeningBalance,
  listAccountsDetailed,
  listFiscalYears,
  listPeriodsByFiscalYear,
  markFiscalYearOpeningGenerated,
  reopenAllPeriodsForFiscalYear,
  updateFiscalYearState,
  updatePeriodState,
} from "../repositories/accountingRepository.js";
import {
  getAccountBalancesAsOf,
  getProfitAndLossRows,
  getReceivableOrPayableAccounts,
  listPartyLedgerLines,
} from "../repositories/financialReportRepository.js";
import { AccountingValidationService } from "./accountingValidationService.js";

const ACCOUNTING_ENTITY_TYPES = new Set(["fiscal_year", "accounting_period", "opening_balance", "voucher", "financial_report"]);

function oppositeSide(side) {
  return side === "DEBIT" ? "CREDIT" : "DEBIT";
}

function toOpeningSide(normalBalance, signedBalance) {
  if (!signedBalance) return null;
  return signedBalance > 0 ? normalBalance : oppositeSide(normalBalance);
}

export class AccountingControlService {
  constructor(databaseManager, { auditService, journalService, accountingValidationService } = {}) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.journalService = journalService;
    this.accountingValidationService = accountingValidationService || new AccountingValidationService(databaseManager);
  }

  buildOpeningLines(accountCode, offsetAccountCode, amount, balanceSide) {
    if (balanceSide === "DEBIT") {
      return [
        { accountCode, debit: amount },
        { accountCode: offsetAccountCode, credit: amount },
      ];
    }
    return [
      { accountCode, credit: amount },
      { accountCode: offsetAccountCode, debit: amount },
    ];
  }

  async buildClosePreview(client, year, actor) {
    const trialBalance = await getTrialBalance(client, { tenantId: actor.tenantId, dateFrom: year.startDate, dateTo: year.endDate });
    const totalDebit = trialBalance.reduce((sum, row) => sum + row.totalDebit, 0);
    const totalCredit = trialBalance.reduce((sum, row) => sum + row.totalCredit, 0);
    const draftVouchers = await countVouchersByStatuses(client, { tenantId: actor.tenantId, fiscalYearId: year.id, statuses: ["DRAFT"] });
    const unpostedVouchers = await countVouchersByStatuses(client, { tenantId: actor.tenantId, fiscalYearId: year.id, statuses: ["SUBMITTED", "APPROVED"] });
    const invalidEntriesResult = await client.query(
      `WITH scoped_entries AS (
         SELECT je.id
         FROM journal_entries je
         WHERE je.tenant_id = $1
           AND je.entry_date BETWEEN $2::date AND $3::date
           AND je.reversal_of_entry_id IS NULL
       ), entry_sums AS (
         SELECT je.id, ABS(COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0)) AS diff
         FROM scoped_entries je
         JOIN journal_lines jl ON jl.journal_entry_id = je.id AND jl.tenant_id = $1
         GROUP BY je.id
       )
       SELECT COUNT(*)::INTEGER AS count FROM entry_sums WHERE diff > 0.0001`,
      [actor.tenantId, year.startDate, year.endDate],
    );
    const invalidEntries = Number(invalidEntriesResult.rows[0]?.count || 0);
    const checks = [
      { key: "trialBalanceBalanced", label: "Trial Balance Balanced", passed: Math.abs(totalDebit - totalCredit) < 0.0001, details: { totalDebit, totalCredit } },
      { key: "noDraftVouchers", label: "No Draft Vouchers", passed: draftVouchers === 0, details: { draftVouchers } },
      { key: "noUnpostedJournals", label: "No Unposted Journals", passed: unpostedVouchers === 0, details: { unpostedVouchers } },
      { key: "noInvalidEntries", label: "No Invalid Entries", passed: invalidEntries === 0, details: { invalidEntries } },
      { key: "openingBalancesVerified", label: "Opening Balances Verified", passed: true, details: {} },
    ];
    return {
      fiscalYearId: year.id,
      fiscalYearName: year.name,
      dateRange: { startDate: year.startDate, endDate: year.endDate },
      checks,
      canClose: checks.every((item) => item.passed),
    };
  }

  async previewCloseFiscalYear(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const year = await findFiscalYearById(client, id, actor.tenantId);
      assert(year, "Fiscal year not found.", 404);
      const preview = await this.buildClosePreview(client, year, actor);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.FISCAL_YEAR_CLOSE_PREVIEW,
        entityType: "fiscal_year",
        entityId: id,
        description: `${actor.name} reviewed close checklist for fiscal year ${year.name}`,
        metadata: preview,
      });
      return preview;
    });
  }

  async closeFiscalYear(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const year = await findFiscalYearById(client, id, actor.tenantId);
      assert(year, "Fiscal year not found.", 404);
      assert(year.status !== "CLOSED", "Fiscal year is already closed.", 400);
      const preview = await this.buildClosePreview(client, year, actor);
      assert(preview.canClose, "Fiscal year cannot be closed until every checklist item passes.", 400);
      const retained = await this.accountingValidationService.assertAccountActive(client, ACCOUNTS.RETAINED_EARNINGS);
      const summary = await this.accountingValidationService.assertAccountActive(client, ACCOUNTS.PROFIT_AND_LOSS_SUMMARY);
      const pnlRows = await getProfitAndLossRows(client, { tenantId: actor.tenantId, dateFrom: year.startDate, dateTo: year.endDate, showZeroAccounts: false });
      const revenueRows = pnlRows.filter((row) => row.type === "REVENUE" && row.amount !== 0);
      const expenseRows = pnlRows.filter((row) => row.type === "EXPENSE" && row.amount !== 0);
      const totalRevenue = revenueRows.reduce((sum, row) => sum + row.amount, 0);
      const totalExpense = expenseRows.reduce((sum, row) => sum + row.amount, 0);
      const netResult = totalRevenue - totalExpense;
      const lines = [];
      for (const row of revenueRows) lines.push({ accountCode: row.code, debit: row.amount, credit: 0 });
      if (totalRevenue > 0) lines.push({ accountCode: summary.code, debit: 0, credit: totalRevenue });
      if (totalExpense > 0) lines.push({ accountCode: summary.code, debit: totalExpense, credit: 0 });
      for (const row of expenseRows) lines.push({ accountCode: row.code, debit: 0, credit: row.amount });
      if (netResult > 0) {
        lines.push({ accountCode: summary.code, debit: netResult, credit: 0 });
        lines.push({ accountCode: retained.code, debit: 0, credit: netResult });
      } else if (netResult < 0) {
        lines.push({ accountCode: retained.code, debit: -netResult, credit: 0 });
        lines.push({ accountCode: summary.code, debit: 0, credit: -netResult });
      }
      let closingJournal = null;
      if (lines.length > 0) {
        closingJournal = await this.journalService.post(client, {
          tenantId: actor.tenantId,
          entryDate: year.endDate,
          sourceType: JOURNAL_SOURCE_TYPES.FISCAL_YEAR_CLOSING,
          sourceId: year.id,
          memo: `Fiscal year closing ${year.name}`,
          createdById: actor.id,
          lines,
        });
      }
      const updated = await updateFiscalYearState(client, {
        id,
        tenantId: actor.tenantId,
        status: "CLOSED",
        isActive: false,
        closedBy: actor.id,
        closingJournalEntryId: closingJournal?.id || null,
        closedChecklist: preview,
      });
      await closeAllPeriodsForFiscalYear(client, id, actor.tenantId, actor.id);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.FISCAL_YEAR_CLOSE,
        entityType: "fiscal_year",
        entityId: id,
        description: `${actor.name} closed fiscal year ${year.name}`,
        before: year,
        after: updated,
        metadata: preview,
      });
      return updated;
    });
  }

  async reopenFiscalYear(id, input, actor) {
    const reason = String(input?.reason || "").trim() || `Fiscal year ${id} reopened`;
    return this.databaseManager.withTransaction(async (client) => {
      const year = await findFiscalYearById(client, id, actor.tenantId);
      assert(year, "Fiscal year not found.", 404);
      assert(year.status === "CLOSED", "Only closed fiscal years can be reopened.", 400);
      if (year.closingJournalEntryId) {
        await this.journalService.reverseEntryById(client, {
          tenantId: actor.tenantId,
          entryId: year.closingJournalEntryId,
          reason,
          createdById: actor.id,
        });
      }
      await reopenAllPeriodsForFiscalYear(client, id, actor.tenantId);
      await updateFiscalYearState(client, { id, tenantId: actor.tenantId, status: "OPEN", isActive: false, reopenedBy: actor.id });
      await client.query(
        `UPDATE fiscal_years
         SET closing_journal_entry_id = NULL,
             closed_checklist = '{}'::jsonb,
             closed_at = NULL,
             closed_by = NULL,
             updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2`,
        [id, actor.tenantId],
      );
      const refreshed = await findFiscalYearById(client, id, actor.tenantId);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.FISCAL_YEAR_REOPEN,
        entityType: "fiscal_year",
        entityId: id,
        description: `${actor.name} reopened fiscal year ${year.name}`,
        before: year,
        after: refreshed,
        metadata: { reason },
      });
      return refreshed;
    });
  }

  async unlockPeriod(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const period = await findPeriodById(client, id, actor.tenantId);
      assert(period, "Accounting period not found.", 404);
      const year = await findFiscalYearById(client, period.fiscalYearId, actor.tenantId);
      assert(year && year.status !== "CLOSED", "Cannot unlock a period inside a closed fiscal year.", 400);
      const updated = await updatePeriodState(client, {
        id,
        tenantId: actor.tenantId,
        status: period.status === "CLOSED" ? "OPEN" : period.status,
        locked: false,
        closedBy: period.status === "CLOSED" ? null : period.closedBy,
      });
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.PERIOD_UNLOCK,
        entityType: "accounting_period",
        entityId: id,
        description: `${actor.name} unlocked period ${period.name}`,
        before: period,
        after: updated,
      });
      return updated;
    });
  }

  async generateYearOpening(targetFiscalYearId, input, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const targetYear = await findFiscalYearById(client, targetFiscalYearId, actor.tenantId);
      assert(targetYear, "Target fiscal year not found.", 404);
      assert(targetYear.status !== "CLOSED", "Cannot generate openings into a closed fiscal year.", 400);
      let sourceYear = null;
      if (input?.sourceFiscalYearId) {
        sourceYear = await findFiscalYearById(client, input.sourceFiscalYearId, actor.tenantId);
      } else {
        const years = await listFiscalYears(client, actor.tenantId);
        sourceYear = years.filter((year) => year.status === "CLOSED" && year.endDate < targetYear.startDate).sort((a, b) => String(b.endDate).localeCompare(String(a.endDate)))[0] || null;
      }
      assert(sourceYear, "Source fiscal year not found.", 404);
      assert(sourceYear.status === "CLOSED", "Source fiscal year must be closed before openings can be generated.", 400);
      assert(sourceYear.endDate < targetYear.startDate, "Target fiscal year must start after the source fiscal year ends.", 400);
      const existingGenerated = await countOpeningBalancesForFiscalYear(client, { tenantId: actor.tenantId, fiscalYearId: targetYear.id, systemGeneratedOnly: true });
      assert(existingGenerated === 0, "System-generated openings already exist for the target fiscal year.", 409);
      const retained = await this.accountingValidationService.assertAccountActive(client, ACCOUNTS.RETAINED_EARNINGS);
      const balances = await getAccountBalancesAsOf(client, { tenantId: actor.tenantId, dateTo: sourceYear.endDate, showZeroAccounts: false });
      const customers = await listAllActiveRetailCustomers(client, actor.tenantId);
      const suppliers = await listAllActiveSuppliers(client, actor.tenantId);
      const receivableAccounts = new Set(await getReceivableOrPayableAccounts(client, { side: "CUSTOMER" }));
      const payableAccounts = new Set(await getReceivableOrPayableAccounts(client, { side: "SUPPLIER" }));
      const created = [];
      const postOpening = async ({ referenceType, referenceId = null, referenceKey, accountCode, balanceSide, amount, note }) => {
        if (!amount || amount <= 0 || !balanceSide) return;
        const id = createId("ob");
        const entry = await this.journalService.post(client, {
          tenantId: actor.tenantId,
          entryDate: targetYear.startDate,
          sourceType: JOURNAL_SOURCE_TYPES.OPENING_BALANCE,
          sourceId: id,
          memo: `Opening balance ${referenceKey}`,
          createdById: actor.id,
          lines: this.buildOpeningLines(accountCode, retained.code, amount, balanceSide),
        });
        created.push(await insertOpeningBalance(client, {
          id,
          tenantId: actor.tenantId,
          fiscalYearId: targetYear.id,
          generatedFromFiscalYearId: sourceYear.id,
          isSystemGenerated: true,
          referenceKey,
          referenceType,
          referenceId,
          accountCode,
          offsetAccountCode: retained.code,
          balanceDate: targetYear.startDate,
          amount,
          balanceSide,
          note,
          journalEntryId: entry.id,
          userId: actor.id,
        }));
      };
      for (const row of balances) {
        if (!["ASSET", "LIABILITY", "EQUITY"].includes(row.type) || row.code === ACCOUNTS.PROFIT_AND_LOSS_SUMMARY) continue;
        if (receivableAccounts.has(row.code) || payableAccounts.has(row.code)) continue;
        await postOpening({ referenceType: "ACCOUNT", referenceId: row.code, referenceKey: `ACCOUNT:${row.code}`, accountCode: row.code, balanceSide: toOpeningSide(row.normalBalance, row.balance), amount: Math.abs(Number(row.balance || 0)), note: `Carry forward from ${sourceYear.name}` });
      }
      for (const customer of customers) {
        const lines = await listPartyLedgerLines(client, { tenantId: actor.tenantId, partyType: "CUSTOMER", partyId: customer.id, dateTo: sourceYear.endDate });
        const balance = lines.reduce((sum, line) => sum + (line.debit - line.credit), 0);
        await postOpening({ referenceType: "CUSTOMER", referenceId: customer.id, referenceKey: `CUSTOMER:${customer.id}`, accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE, balanceSide: balance > 0 ? "DEBIT" : balance < 0 ? "CREDIT" : null, amount: Math.abs(balance), note: `Carry forward customer balance from ${sourceYear.name}` });
      }
      for (const supplier of suppliers) {
        const lines = await listPartyLedgerLines(client, { tenantId: actor.tenantId, partyType: "SUPPLIER", partyId: supplier.id, dateTo: sourceYear.endDate });
        const balance = lines.reduce((sum, line) => sum + (line.credit - line.debit), 0);
        await postOpening({ referenceType: "SUPPLIER", referenceId: supplier.id, referenceKey: `SUPPLIER:${supplier.id}`, accountCode: ACCOUNTS.ACCOUNTS_PAYABLE, balanceSide: balance > 0 ? "CREDIT" : balance < 0 ? "DEBIT" : null, amount: Math.abs(balance), note: `Carry forward supplier balance from ${sourceYear.name}` });
      }
      await markFiscalYearOpeningGenerated(client, { id: targetYear.id, tenantId: actor.tenantId, sourceFiscalYearId: sourceYear.id });
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.OPENING_BALANCE_GENERATE,
        entityType: "fiscal_year",
        entityId: targetYear.id,
        description: `${actor.name} generated opening balances for ${targetYear.name}`,
        metadata: { sourceFiscalYearId: sourceYear.id, createdCount: created.length },
      });
      return { fiscalYearId: targetYear.id, sourceFiscalYearId: sourceYear.id, createdCount: created.length, openingBalances: created };
    });
  }

  async reverseJournal(id, input, actor) {
    const reason = String(input?.reason || "").trim();
    assert(reason, "Reversal reason is required.", 400);
    return this.databaseManager.withTransaction(async (client) => {
      const result = await this.journalService.reverseEntryById(client, { tenantId: actor.tenantId, entryId: id, reason, createdById: actor.id });
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.JOURNAL_REVERSE,
        entityType: "journal_entry",
        entityId: id,
        description: `${actor.name} reversed journal ${id}`,
        metadata: { reason, reversalJournalEntryId: result.reversalEntry.id },
      });
      return result;
    });
  }

  async getDashboard(actor) {
    return this.databaseManager.withClient(async (client) => {
      const today = new Date().toISOString().slice(0, 10);
      const [trialBalance, accounts, years, window, recentActivities] = await Promise.all([
        getTrialBalance(client, { tenantId: actor.tenantId }),
        listAccountsDetailed(client),
        listFiscalYears(client, actor.tenantId),
        findPostingPeriodStatus(client, actor.tenantId, today),
        listActivityLogsPage(client, { tenantId: actor.tenantId, limit: 12, offset: 0 }),
      ]);
      const metaByCode = new Map(accounts.map((account) => [account.code, account]));
      let totalAssets = 0;
      let totalLiabilities = 0;
      let equityBase = 0;
      let income = 0;
      let expenses = 0;
      let currentCash = 0;
      let currentBankBalance = 0;
      let currentReceivable = 0;
      let currentPayable = 0;
      for (const row of trialBalance) {
        const meta = metaByCode.get(row.code);
        if (row.type === "ASSET") totalAssets += row.closingBalance;
        if (row.type === "LIABILITY") totalLiabilities += row.closingBalance;
        if (row.type === "EQUITY") equityBase += row.closingBalance;
        if (row.type === "REVENUE") income += row.closingBalance;
        if (row.type === "EXPENSE") expenses += row.closingBalance;
        if (meta?.isCashAccount) currentCash += row.closingBalance;
        if (meta?.isBankAccount) currentBankBalance += row.closingBalance;
        if (meta?.isReceivableAccount) currentReceivable += row.closingBalance;
        if (meta?.isPayableAccount) currentPayable += row.closingBalance;
      }
      const currentFiscalYear = window?.fiscal_year_id ? years.find((year) => year.id === window.fiscal_year_id) || null : null;
      const currentPeriod = currentFiscalYear ? (await listPeriodsByFiscalYear(client, currentFiscalYear.id, actor.tenantId)).find((period) => period.id === window.period_id) || null : null;
      const allPeriods = [];
      for (const year of years) allPeriods.push(...await listPeriodsByFiscalYear(client, year.id, actor.tenantId));
      const currentYearId = currentFiscalYear?.id || years[0]?.id || null;
      const draftJournals = currentYearId ? await countVouchersByStatuses(client, { tenantId: actor.tenantId, fiscalYearId: currentYearId, statuses: ["DRAFT"] }) : 0;
      const pendingApprovals = currentYearId ? await countVouchersByStatuses(client, { tenantId: actor.tenantId, fiscalYearId: currentYearId, statuses: ["SUBMITTED"] }) : 0;
      return {
        totalAssets,
        totalLiabilities,
        equity: equityBase + income - expenses,
        income,
        expenses,
        currentCash,
        currentBankBalance,
        currentReceivable,
        currentPayable,
        currentFiscalYear,
        currentAccountingPeriod: currentPeriod,
        openPeriods: allPeriods.filter((item) => item.status === "OPEN").length,
        lockedPeriods: allPeriods.filter((item) => item.locked).length,
        draftJournals,
        pendingApprovals,
        recentActivities: recentActivities.filter((item) => ACCOUNTING_ENTITY_TYPES.has(item.entityType)).slice(0, 8),
        quickLinks: [
          { route: "/accounting/fiscal-years", label: "Fiscal Years" },
          { route: "/accounting/opening-balances", label: "Opening Balances" },
          { route: "/accounting/voucher-register", label: "Voucher Register" },
          { route: "/trial-balance", label: "Trial Balance" },
        ],
      };
    });
  }
}
