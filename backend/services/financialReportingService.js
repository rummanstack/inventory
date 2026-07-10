import { assert } from "../lib/errors.js";
import { ACCOUNTING_ACTIONS } from "../lib/auditActions.js";
import { ACCOUNTS } from "../lib/chartOfAccounts.js";
import { getAccountingSettings, listAccountsDetailed, listFiscalYears, listPeriodsByFiscalYear, findFiscalYearById, findPeriodById } from "../repositories/accountingRepository.js";
import { listAllActiveRetailCustomers } from "../repositories/retailCustomerRepository.js";
import { listAllActiveSuppliers } from "../repositories/supplierRepository.js";
import {
  getTrialBalanceDetailed,
  listDetailedLedgerLines,
  getOpeningBalanceForAccounts,
  listPartyLedgerLines,
  getPartyOpeningBalance,
  listCashOrBankBookLines,
  getAccountBalancesAsOf,
  getProfitAndLossRows,
  getCashFlowMovementRows,
} from "../repositories/financialReportRepository.js";

const BALANCE_TOLERANCE = 0.0001;

function isoDate(value) {
  return value ? String(value).slice(0, 10) : null;
}

function previousDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function normalizeFilters(input = {}) {
  return {
    fiscalYearId: String(input.fiscalYearId || "").trim() || null,
    accountingPeriodId: String(input.accountingPeriodId || "").trim() || null,
    dateFrom: String(input.dateFrom || "").trim() || null,
    dateTo: String(input.dateTo || "").trim() || null,
    asOfDate: String(input.asOfDate || "").trim() || null,
    accountCode: String(input.accountCode || "").trim() || null,
    customerId: String(input.customerId || "").trim() || null,
    supplierId: String(input.supplierId || "").trim() || null,
    voucherNumber: String(input.voucherNumber || "").trim() || null,
    reference: String(input.reference || input.referenceNumber || "").trim() || null,
    showZeroAccounts: normalizeBoolean(input.showZeroAccounts, false),
    comparisonDateFrom: String(input.comparisonDateFrom || "").trim() || null,
    comparisonDateTo: String(input.comparisonDateTo || "").trim() || null,
  };
}

function signedAmountForLine(line) {
  return line.normalBalance === "CREDIT" ? line.credit - line.debit : line.debit - line.credit;
}

function buildRunningLedger(lines, openingBalance, signedAmountResolver = signedAmountForLine) {
  let running = openingBalance;
  return lines.map((line) => {
    running += signedAmountResolver(line);
    return { ...line, runningBalance: running };
  });
}

function buildTrialBalanceTotals(rows) {
  return rows.reduce(
    (totals, row) => {
      totals.openingDebit += row.openingDebit;
      totals.openingCredit += row.openingCredit;
      totals.debit += row.debit;
      totals.credit += row.credit;
      totals.closingDebit += row.closingDebit;
      totals.closingCredit += row.closingCredit;
      return totals;
    },
    { openingDebit: 0, openingCredit: 0, debit: 0, credit: 0, closingDebit: 0, closingCredit: 0 },
  );
}

function categorizeProfitLossRows(rows) {
  const revenueRows = [];
  const cogsRows = [];
  const operatingExpenseRows = [];
  const otherIncomeRows = [];
  const otherExpenseRows = [];

  for (const row of rows) {
    if (row.type === "REVENUE") {
      if ((row.accountGroup || "").toLowerCase().includes("operating income")) {
        revenueRows.push(row);
      } else {
        otherIncomeRows.push(row);
      }
      continue;
    }

    const group = (row.accountGroup || "").toLowerCase();
    if (group.includes("cost of sales")) {
      cogsRows.push(row);
    } else if (group.includes("operating expenses")) {
      operatingExpenseRows.push(row);
    } else {
      otherExpenseRows.push(row);
    }
  }

  const sum = (items) => items.reduce((total, row) => total + row.amount, 0);
  const revenueTotal = sum(revenueRows);
  const cogsTotal = sum(cogsRows);
  const grossProfit = revenueTotal - cogsTotal;
  const operatingExpensesTotal = sum(operatingExpenseRows);
  const operatingProfit = grossProfit - operatingExpensesTotal;
  const otherIncomeTotal = sum(otherIncomeRows);
  const otherExpenseTotal = sum(otherExpenseRows);
  const netProfit = operatingProfit + otherIncomeTotal - otherExpenseTotal;

  return {
    revenue: { rows: revenueRows, total: revenueTotal },
    costOfGoodsSold: { rows: cogsRows, total: cogsTotal },
    grossProfit,
    operatingExpenses: { rows: operatingExpenseRows, total: operatingExpensesTotal },
    operatingProfit,
    otherIncome: { rows: otherIncomeRows, total: otherIncomeTotal },
    otherExpenses: { rows: otherExpenseRows, total: otherExpenseTotal },
    netProfit,
  };
}

function classifyBalanceSheet(rows, retainedEarnings, showZeroAccounts) {
  const assets = rows.filter((row) => row.type === "ASSET");
  const liabilities = rows.filter((row) => row.type === "LIABILITY");
  const equityRows = rows.filter((row) => row.type === "EQUITY");
  const withFilter = (items) => (showZeroAccounts ? items : items.filter((item) => item.balance !== 0));

  const currentAssets = withFilter(assets.filter((row) => !(row.accountGroup || "").toLowerCase().includes("fixed")));
  const fixedAssets = withFilter(assets.filter((row) => (row.accountGroup || "").toLowerCase().includes("fixed")));
  const currentLiabilities = withFilter(liabilities.filter((row) => (row.accountGroup || "").toLowerCase().includes("current")));
  const longTermLiabilities = withFilter(liabilities.filter((row) => !(row.accountGroup || "").toLowerCase().includes("current")));
  const equity = withFilter(equityRows);

  const sum = (items) => items.reduce((total, row) => total + row.balance, 0);
  const totalAssets = sum(assets);
  const totalLiabilities = sum(liabilities);
  const recordedEquity = sum(equityRows);
  const totalEquity = recordedEquity + retainedEarnings;

  return {
    assets: { currentAssets, fixedAssets, total: totalAssets },
    liabilities: { currentLiabilities, longTermLiabilities, total: totalLiabilities },
    equity: { rows: equity, recordedEquity, retainedEarnings, total: totalEquity },
    totalAssets,
    totalLiabilities,
    totalEquity,
    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < BALANCE_TOLERANCE,
  };
}

function classifyCashFlow(rows, profitAndLoss, openingCash, closingCash) {
  const byCode = new Map(rows.map((row) => [row.code, row]));
  const isCurrentAsset = (row) => row.type === "ASSET" && !(row.accountGroup || "").toLowerCase().includes("fixed") && ![ACCOUNTS.CASH, ACCOUNTS.BANK].includes(row.code);
  const isCurrentLiability = (row) => row.type === "LIABILITY" && (row.accountGroup || "").toLowerCase().includes("current");
  const isFixedAsset = (row) => row.type === "ASSET" && (row.accountGroup || "").toLowerCase().includes("fixed");
  const isFinancing = (row) => row.type === "EQUITY" || (row.type === "LIABILITY" && !(row.accountGroup || "").toLowerCase().includes("current"));

  const workingCapitalAdjustments = rows
    .filter((row) => isCurrentAsset(row) || isCurrentLiability(row))
    .map((row) => {
      let effect = 0;
      if (isCurrentAsset(row)) effect = -row.movement;
      if (isCurrentLiability(row)) effect = row.movement;
      return { ...row, effect };
    })
    .filter((row) => row.effect !== 0);

  const operatingActivities = [
    { label: "Net Profit", amount: profitAndLoss.netProfit },
    ...workingCapitalAdjustments.map((row) => ({ label: `${row.name} movement`, amount: row.effect })),
  ];

  const investingActivities = rows
    .filter(isFixedAsset)
    .map((row) => ({ label: `${row.name} movement`, amount: -row.movement }))
    .filter((row) => row.amount !== 0);

  const financingActivities = rows
    .filter((row) => isFinancing(row) && ![ACCOUNTS.CASH, ACCOUNTS.BANK].includes(row.code))
    .map((row) => ({ label: `${row.name} movement`, amount: row.movement }))
    .filter((row) => row.amount !== 0);

  const sum = (items) => items.reduce((total, item) => total + item.amount, 0);
  const operatingTotal = sum(operatingActivities);
  const investingTotal = sum(investingActivities);
  const financingTotal = sum(financingActivities);
  const netCashMovement = closingCash - openingCash;

  return {
    operatingActivities,
    investingActivities,
    financingActivities,
    operatingTotal,
    investingTotal,
    financingTotal,
    netCashMovement,
    openingCash,
    closingCash,
    balanced: Math.abs(netCashMovement - (operatingTotal + investingTotal + financingTotal)) < 1,
  };
}

export class FinancialReportingService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async recordReport(client, actor, reportType, filters) {
    if (!this.auditService) return;
    await this.auditService.record(client, {
      tenantId: actor.tenantId,
      userId: actor.id,
      actionType: ACCOUNTING_ACTIONS.REPORT_GENERATED,
      entityType: "financial_report",
      entityId: reportType,
      description: `${actor.name} generated ${reportType} report`,
      metadata: { reportType, filters },
    });
  }

  async resolveWindow(client, actor, rawFilters, { asOfMode = false } = {}) {
    const filters = normalizeFilters(rawFilters);
    let fiscalYear = null;
    let accountingPeriod = null;

    if (filters.fiscalYearId) {
      fiscalYear = await findFiscalYearById(client, filters.fiscalYearId, actor.tenantId);
      assert(fiscalYear, "Fiscal year not found.", 404);
    }
    if (filters.accountingPeriodId) {
      accountingPeriod = await findPeriodById(client, filters.accountingPeriodId, actor.tenantId);
      assert(accountingPeriod, "Accounting period not found.", 404);
      if (!fiscalYear) {
        fiscalYear = await findFiscalYearById(client, accountingPeriod.fiscalYearId, actor.tenantId);
      }
    }

    let dateFrom = filters.dateFrom;
    let dateTo = filters.dateTo || filters.asOfDate;

    if (!dateFrom && accountingPeriod) dateFrom = accountingPeriod.startDate;
    if (!dateTo && accountingPeriod) dateTo = accountingPeriod.endDate;
    if (!dateFrom && fiscalYear) dateFrom = fiscalYear.startDate;
    if (!dateTo && fiscalYear) dateTo = fiscalYear.endDate;

    if (asOfMode && !dateTo) {
      dateTo = isoDate(new Date().toISOString());
    }

    return {
      ...filters,
      dateFrom,
      dateTo,
      fiscalYear,
      accountingPeriod,
    };
  }

  async getReferenceData(actor) {
    return this.databaseManager.withClient(async (client) => {
      const [accounts, fiscalYears, customers, suppliers, settings] = await Promise.all([
        listAccountsDetailed(client, { activeOnly: true }),
        listFiscalYears(client, actor.tenantId),
        listAllActiveRetailCustomers(client, actor.tenantId),
        listAllActiveSuppliers(client, actor.tenantId),
        getAccountingSettings(client, actor.tenantId),
      ]);
      const yearsWithPeriods = [];
      for (const year of fiscalYears) {
        yearsWithPeriods.push({ ...year, periods: await listPeriodsByFiscalYear(client, year.id, actor.tenantId) });
      }
      return { accounts, fiscalYears: yearsWithPeriods, customers, suppliers, settings };
    });
  }

  async getTrialBalance(rawFilters, actor) {
    return this.databaseManager.withClient(async (client) => {
      const filters = await this.resolveWindow(client, actor, rawFilters);
      const rows = await getTrialBalanceDetailed(client, {
        tenantId: actor.tenantId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        accountCode: filters.accountCode,
        showZeroAccounts: filters.showZeroAccounts,
      });
      const totals = buildTrialBalanceTotals(rows);
      await this.recordReport(client, actor, "trial_balance", filters);
      return {
        filters,
        rows,
        ...totals,
        balanced: Math.abs(totals.debit - totals.credit) < BALANCE_TOLERANCE,
      };
    });
  }

  async getGeneralLedger(rawFilters, actor, { requireAccount = false } = {}) {
    return this.databaseManager.withClient(async (client) => {
      const filters = await this.resolveWindow(client, actor, rawFilters);
      if (requireAccount) assert(filters.accountCode, "Account is required.", 400);
      const accountCodes = filters.accountCode ? [filters.accountCode] : [];
      const openingBalance = filters.accountCode
        ? await getOpeningBalanceForAccounts(client, { tenantId: actor.tenantId, accountCodes, dateFrom: filters.dateFrom })
        : 0;
      const lines = await listDetailedLedgerLines(client, {
        tenantId: actor.tenantId,
        accountCode: filters.accountCode,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        voucherNumber: filters.voucherNumber,
        reference: filters.reference,
        customerId: filters.customerId,
        supplierId: filters.supplierId,
      });
      const ledgerLines = filters.accountCode ? buildRunningLedger(lines, openingBalance) : lines;
      const closingBalance = filters.accountCode ? (ledgerLines.at(-1)?.runningBalance ?? openingBalance) : null;
      await this.recordReport(client, actor, requireAccount ? "account_ledger" : "general_ledger", filters);
      return { filters, openingBalance, closingBalance, lines: ledgerLines };
    });
  }

  async getCustomerLedger(rawFilters, actor) {
    return this.databaseManager.withClient(async (client) => {
      const filters = await this.resolveWindow(client, actor, rawFilters);
      assert(filters.customerId, "Customer is required.", 400);
      const openingBalance = await getPartyOpeningBalance(client, { tenantId: actor.tenantId, partyType: "CUSTOMER", partyId: filters.customerId, dateFrom: filters.dateFrom });
      const lines = await listPartyLedgerLines(client, { tenantId: actor.tenantId, partyType: "CUSTOMER", partyId: filters.customerId, dateFrom: filters.dateFrom, dateTo: filters.dateTo });
      const ledgerLines = buildRunningLedger(lines, openingBalance, (line) => line.debit - line.credit);
      await this.recordReport(client, actor, "customer_ledger", filters);
      return {
        filters,
        openingBalance,
        outstanding: ledgerLines.at(-1)?.runningBalance ?? openingBalance,
        lines: ledgerLines,
      };
    });
  }

  async getSupplierLedger(rawFilters, actor) {
    return this.databaseManager.withClient(async (client) => {
      const filters = await this.resolveWindow(client, actor, rawFilters);
      assert(filters.supplierId, "Supplier is required.", 400);
      const openingBalance = await getPartyOpeningBalance(client, { tenantId: actor.tenantId, partyType: "SUPPLIER", partyId: filters.supplierId, dateFrom: filters.dateFrom });
      const lines = await listPartyLedgerLines(client, { tenantId: actor.tenantId, partyType: "SUPPLIER", partyId: filters.supplierId, dateFrom: filters.dateFrom, dateTo: filters.dateTo });
      const ledgerLines = buildRunningLedger(lines, openingBalance, (line) => line.credit - line.debit);
      await this.recordReport(client, actor, "supplier_ledger", filters);
      return {
        filters,
        openingBalance,
        outstanding: ledgerLines.at(-1)?.runningBalance ?? openingBalance,
        lines: ledgerLines,
      };
    });
  }

  async getCashBook(rawFilters, actor) {
    return this.getCashOrBankBook(rawFilters, actor, "CASH");
  }

  async getBankBook(rawFilters, actor) {
    return this.getCashOrBankBook(rawFilters, actor, "BANK");
  }

  async getCashOrBankBook(rawFilters, actor, kind) {
    return this.databaseManager.withClient(async (client) => {
      const filters = await this.resolveWindow(client, actor, rawFilters);
      const { accountCodes, lines } = await listCashOrBankBookLines(client, {
        tenantId: actor.tenantId,
        kind,
        accountCode: filters.accountCode,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        voucherNumber: filters.voucherNumber,
        reference: filters.reference,
      });
      const openingBalance = await getOpeningBalanceForAccounts(client, { tenantId: actor.tenantId, accountCodes, dateFrom: filters.dateFrom });
      const ledgerLines = buildRunningLedger(lines, openingBalance, (line) => line.debit - line.credit);
      await this.recordReport(client, actor, kind === "BANK" ? "bank_book" : "cash_book", filters);
      return {
        filters,
        accountCodes,
        openingBalance,
        closingBalance: ledgerLines.at(-1)?.runningBalance ?? openingBalance,
        lines: ledgerLines,
      };
    });
  }

  async getProfitAndLoss(rawFilters, actor) {
    return this.databaseManager.withClient(async (client) => {
      const filters = await this.resolveWindow(client, actor, rawFilters);
      const rows = await getProfitAndLossRows(client, {
        tenantId: actor.tenantId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        showZeroAccounts: filters.showZeroAccounts,
      });
      const current = categorizeProfitLossRows(rows);
      let comparison = null;
      if (filters.comparisonDateFrom || filters.comparisonDateTo) {
        const comparisonRows = await getProfitAndLossRows(client, {
          tenantId: actor.tenantId,
          dateFrom: filters.comparisonDateFrom,
          dateTo: filters.comparisonDateTo,
          showZeroAccounts: filters.showZeroAccounts,
        });
        comparison = {
          filters: { dateFrom: filters.comparisonDateFrom, dateTo: filters.comparisonDateTo },
          ...categorizeProfitLossRows(comparisonRows),
        };
      }
      await this.recordReport(client, actor, "profit_loss", filters);
      return { filters, current, comparison };
    });
  }

  async getBalanceSheet(rawFilters, actor) {
    return this.databaseManager.withClient(async (client) => {
      const filters = await this.resolveWindow(client, actor, rawFilters, { asOfMode: true });
      const rows = await getAccountBalancesAsOf(client, { tenantId: actor.tenantId, dateTo: filters.dateTo, showZeroAccounts: filters.showZeroAccounts });
      const retainedEarningsRows = await getProfitAndLossRows(client, { tenantId: actor.tenantId, dateTo: filters.dateTo, showZeroAccounts: true });
      const retainedEarnings = categorizeProfitLossRows(retainedEarningsRows).netProfit;
      const sheet = classifyBalanceSheet(rows, retainedEarnings, filters.showZeroAccounts);
      await this.recordReport(client, actor, "balance_sheet", filters);
      return { filters, ...sheet };
    });
  }

  async getCashFlow(rawFilters, actor) {
    return this.databaseManager.withClient(async (client) => {
      const filters = await this.resolveWindow(client, actor, rawFilters);
      assert(filters.dateFrom && filters.dateTo, "Cash flow requires a date range.", 400);
      const [movements, pnlRows] = await Promise.all([
        getCashFlowMovementRows(client, { tenantId: actor.tenantId, dateFrom: filters.dateFrom, dateTo: filters.dateTo }),
        getProfitAndLossRows(client, { tenantId: actor.tenantId, dateFrom: filters.dateFrom, dateTo: filters.dateTo, showZeroAccounts: true }),
      ]);
      const cashRows = movements.filter((row) => [ACCOUNTS.CASH, ACCOUNTS.BANK].includes(row.code));
      const openingCash = cashRows.reduce((total, row) => total + row.openingBalance, 0);
      const closingCash = cashRows.reduce((total, row) => total + row.closingBalance, 0);
      const cashFlow = classifyCashFlow(movements, categorizeProfitLossRows(pnlRows), openingCash, closingCash);
      await this.recordReport(client, actor, "cash_flow", filters);
      return { filters, ...cashFlow };
    });
  }
}
