import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { ACCOUNTING_ACTIONS } from "../lib/auditActions.js";
import { ACCOUNTS } from "../lib/chartOfAccounts.js";
import { JOURNAL_SOURCE_TYPES } from "../lib/journalSourceTypes.js";
import { getTrialBalance } from "../repositories/journalRepository.js";
import {
  closeAllPeriodsForFiscalYear,
  deactivateFiscalYears,
  findAccountDetailedByCode,
  findCustomerReference,
  findFinanceAccountReference,
  findFiscalYearById,
  findOpeningBalanceById,
  findOpeningBalanceByReferenceKey,
  findPeriodById,
  findSupplierReference,
  getAccountingSettings,
  insertAccountDetailed,
  insertAccountingPeriod,
  insertFiscalYear,
  insertOpeningBalance,
  listAccountsDetailed,
  listFiscalYears,
  listOpeningBalances,
  listPeriodsByFiscalYear,
  updateAccountDetailed,
  updateFiscalYearState,
  updateOpeningBalance,
  updatePeriodState,
  upsertAccountingSettings,
} from "../repositories/accountingRepository.js";

const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
const BALANCE_SIDES = ["DEBIT", "CREDIT"];
const REFERENCE_TYPES = ["ACCOUNT", "CUSTOMER", "SUPPLIER", "FINANCE_ACCOUNT"];
const PERIOD_STATUSES = ["OPEN", "CLOSED"];
const NEGATIVE_CASH_POLICIES = ["ALLOW", "WARN", "BLOCK"];
const NORMAL_BALANCE_BY_TYPE = {
  ASSET: "DEBIT",
  EXPENSE: "DEBIT",
  LIABILITY: "CREDIT",
  EQUITY: "CREDIT",
  REVENUE: "CREDIT",
};

function monthName(date) {
  return date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
}

function toUtcDate(value) {
  return new Date(`${value}T00:00:00Z`);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function endOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function buildMonthlyPeriods(startDate, endDate) {
  const start = toUtcDate(startDate);
  const end = toUtcDate(endDate);
  const items = [];
  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor <= end) {
    const periodStart = cursor < start ? start : cursor;
    const periodEnd = endOfMonth(cursor) > end ? end : endOfMonth(cursor);
    items.push({
      id: createId("period"),
      name: `${monthName(periodStart)} ${periodStart.getUTCFullYear()}`,
      startDate: isoDate(periodStart),
      endDate: isoDate(periodEnd),
      status: "OPEN",
      locked: false,
    });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
  return items;
}

function normalizeAccount(input = {}) {
  const type = String(input.type || "").trim().toUpperCase();
  return {
    code: String(input.code || "").trim(),
    name: String(input.name || "").trim(),
    type,
    normalBalance: NORMAL_BALANCE_BY_TYPE[type] || String(input.normalBalance || "").trim().toUpperCase(),
    isActive: input.isActive !== false,
    parentCode: String(input.parentCode || "").trim() || null,
    accountGroup: String(input.accountGroup || "").trim(),
    isCashAccount: Boolean(input.isCashAccount),
    isBankAccount: Boolean(input.isBankAccount),
    isReceivableAccount: Boolean(input.isReceivableAccount),
    isPayableAccount: Boolean(input.isPayableAccount),
  };
}

function normalizeFiscalYear(input = {}) {
  return {
    name: String(input.name || "").trim(),
    startDate: String(input.startDate || "").trim(),
    endDate: String(input.endDate || "").trim(),
    isActive: Boolean(input.isActive),
  };
}

function normalizeOpeningBalance(input = {}) {
  const referenceType = String(input.referenceType || "ACCOUNT").trim().toUpperCase();
  const amount = Number(input.amount || 0);
  const balanceSide = String(input.balanceSide || "DEBIT").trim().toUpperCase();
  return {
    referenceType,
    referenceId: String(input.referenceId || "").trim() || null,
    accountCode: String(input.accountCode || "").trim(),
    balanceDate: String(input.balanceDate || "").trim(),
    amount,
    balanceSide,
    note: String(input.note || "").trim(),
  };
}

function normalizeSettings(input = {}) {
  return {
    defaultCurrency: String(input.defaultCurrency || "BDT").trim().toUpperCase() || "BDT",
    decimalPrecision: Number.isFinite(Number(input.decimalPrecision)) ? Number(input.decimalPrecision) : 2,
    voucherPrefix: String(input.voucherPrefix || "JV").trim().toUpperCase() || "JV",
    financialYearStart: String(input.financialYearStart || "01-01").trim() || "01-01",
    negativeCashPolicy: String(input.negativeCashPolicy || "WARN").trim().toUpperCase() || "WARN",
    autoPostingEnabled: input.autoPostingEnabled !== false,
  };
}

export class AccountingService {
  constructor(databaseManager, { auditService, journalService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.journalService = journalService;
  }

  async listAccounts() {
    return this.databaseManager.withClient((client) => listAccountsDetailed(client));
  }

  async createAccount(input, actor) {
    const data = normalizeAccount(input);
    assert(data.code, "Account code is required.", 400);
    assert(data.name, "Account name is required.", 400);
    assert(ACCOUNT_TYPES.includes(data.type), "Invalid account type.", 400);
    assert(BALANCE_SIDES.includes(data.normalBalance), "Invalid normal balance.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findAccountDetailedByCode(client, data.code);
      assert(!existing, "Account code already exists.", 409);
      if (data.parentCode) {
        const parent = await findAccountDetailedByCode(client, data.parentCode);
        assert(parent, "Parent account not found.", 404);
      }
      const account = await insertAccountDetailed(client, { ...data, isSystem: false });
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.ACCOUNT_CREATE,
        entityType: "chart_of_account",
        entityId: account.code,
        description: `${actor.name} created chart of account ${account.code}`,
        after: account,
      });
      return account;
    });
  }

  async updateAccount(code, input, actor) {
    const data = normalizeAccount({ ...input, code });
    assert(data.name, "Account name is required.", 400);
    assert(ACCOUNT_TYPES.includes(data.type), "Invalid account type.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findAccountDetailedByCode(client, code);
      assert(existing, "Account not found.", 404);
      if (data.parentCode) {
        assert(data.parentCode !== code, "Account cannot be its own parent.", 400);
        const parent = await findAccountDetailedByCode(client, data.parentCode);
        assert(parent, "Parent account not found.", 404);
      }
      if (existing.isSystem) {
        assert(data.type === existing.type, "System account type cannot be changed.", 400);
        assert(data.isActive === true, "System accounts cannot be deactivated.", 400);
        data.isCashAccount = existing.isCashAccount;
        data.isBankAccount = existing.isBankAccount;
        data.isReceivableAccount = existing.isReceivableAccount;
        data.isPayableAccount = existing.isPayableAccount;
        data.normalBalance = existing.normalBalance;
      }
      const account = await updateAccountDetailed(client, data);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.ACCOUNT_UPDATE,
        entityType: "chart_of_account",
        entityId: code,
        description: `${actor.name} updated chart of account ${code}`,
        before: existing,
        after: account,
      });
      return account;
    });
  }

  async listFiscalYears(actor) {
    return this.databaseManager.withClient(async (client) => {
      const years = await listFiscalYears(client, actor.tenantId);
      const items = [];
      for (const year of years) {
        items.push({ ...year, periods: await listPeriodsByFiscalYear(client, year.id, actor.tenantId) });
      }
      return items;
    });
  }

  async createFiscalYear(input, actor) {
    const data = normalizeFiscalYear(input);
    assert(data.name, "Fiscal year name is required.", 400);
    assert(data.startDate && data.endDate, "Fiscal year dates are required.", 400);
    assert(data.startDate <= data.endDate, "Fiscal year start date must be before end date.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      if (data.isActive) {
        await deactivateFiscalYears(client, actor.tenantId);
      }
      const year = await insertFiscalYear(client, {
        id: createId("fy"),
        tenantId: actor.tenantId,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        status: "OPEN",
        isActive: data.isActive,
        createdBy: actor.id,
      });
      const periods = buildMonthlyPeriods(data.startDate, data.endDate);
      for (const period of periods) {
        await insertAccountingPeriod(client, {
          ...period,
          tenantId: actor.tenantId,
          fiscalYearId: year.id,
          closedBy: null,
        });
      }
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.FISCAL_YEAR_CREATE,
        entityType: "fiscal_year",
        entityId: year.id,
        description: `${actor.name} created fiscal year ${year.name}`,
        after: year,
      });
      return { ...year, periods: await listPeriodsByFiscalYear(client, year.id, actor.tenantId) };
    });
  }

  async activateFiscalYear(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const year = await findFiscalYearById(client, id, actor.tenantId);
      assert(year, "Fiscal year not found.", 404);
      assert(year.status !== "CLOSED", "Closed fiscal years cannot be activated.", 400);
      await deactivateFiscalYears(client, actor.tenantId, id);
      const updated = await updateFiscalYearState(client, { id, tenantId: actor.tenantId, status: "OPEN", isActive: true });
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.FISCAL_YEAR_ACTIVATE,
        entityType: "fiscal_year",
        entityId: id,
        description: `${actor.name} activated fiscal year ${year.name}`,
        before: year,
        after: updated,
      });
      return updated;
    });
  }

  async closeFiscalYear(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const year = await findFiscalYearById(client, id, actor.tenantId);
      assert(year, "Fiscal year not found.", 404);
      const updated = await updateFiscalYearState(client, { id, tenantId: actor.tenantId, status: "CLOSED", isActive: false, closedBy: actor.id });
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
      });
      return updated;
    });
  }

  async transitionPeriod(id, action, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const period = await findPeriodById(client, id, actor.tenantId);
      assert(period, "Accounting period not found.", 404);
      const year = await findFiscalYearById(client, period.fiscalYearId, actor.tenantId);
      assert(year, "Fiscal year not found.", 404);

      let next;
      let actionType;
      let description;
      if (action === "open") {
        next = { status: "OPEN", locked: false, closedBy: null };
        actionType = ACCOUNTING_ACTIONS.PERIOD_OPEN;
        description = `${actor.name} opened period ${period.name}`;
      } else if (action === "close") {
        next = { status: "CLOSED", locked: true, closedBy: actor.id };
        actionType = ACCOUNTING_ACTIONS.PERIOD_CLOSE;
        description = `${actor.name} closed period ${period.name}`;
      } else if (action === "lock") {
        next = { status: period.status, locked: true, closedBy: period.closedBy };
        actionType = ACCOUNTING_ACTIONS.PERIOD_LOCK;
        description = `${actor.name} locked period ${period.name}`;
      } else {
        assert(year.status !== "CLOSED", "Cannot reopen a period inside a closed fiscal year.", 400);
        next = { status: "OPEN", locked: false, closedBy: null };
        actionType = ACCOUNTING_ACTIONS.PERIOD_REOPEN;
        description = `${actor.name} reopened period ${period.name}`;
      }

      const updated = await updatePeriodState(client, { id, tenantId: actor.tenantId, ...next });
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType,
        entityType: "accounting_period",
        entityId: id,
        description,
        before: period,
        after: updated,
      });
      return updated;
    });
  }

  async getSettings(actor) {
    return this.databaseManager.withClient(async (client) => {
      const existing = await getAccountingSettings(client, actor.tenantId);
      return existing || normalizeSettings();
    });
  }

  async updateSettings(input, actor) {
    const data = normalizeSettings(input);
    assert(data.decimalPrecision >= 0 && data.decimalPrecision <= 6, "Decimal precision must be between 0 and 6.", 400);
    assert(/^\d{2}-\d{2}$/.test(data.financialYearStart), "Financial year start must use MM-DD format.", 400);
    assert(NEGATIVE_CASH_POLICIES.includes(data.negativeCashPolicy), "Invalid negative cash policy.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const before = await getAccountingSettings(client, actor.tenantId);
      const settings = await upsertAccountingSettings(client, { ...data, tenantId: actor.tenantId, userId: actor.id });
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.SETTINGS_UPDATE,
        entityType: "accounting_settings",
        entityId: actor.tenantId,
        description: `${actor.name} updated accounting settings`,
        before,
        after: settings,
      });
      return settings;
    });
  }

  async listOpeningBalances(actor) {
    return this.databaseManager.withClient((client) => listOpeningBalances(client, actor.tenantId));
  }

  async resolveOpeningReference(client, input, tenantId) {
    assert(REFERENCE_TYPES.includes(input.referenceType), "Invalid opening balance type.", 400);
    if (input.referenceType === "ACCOUNT") {
      assert(input.accountCode, "Account is required.", 400);
      const account = await findAccountDetailedByCode(client, input.accountCode);
      assert(account, "Account not found.", 404);
      return { referenceKey: `ACCOUNT:${account.code}`, referenceId: account.code, accountCode: account.code };
    }
    if (input.referenceType === "CUSTOMER") {
      assert(input.referenceId, "Customer is required.", 400);
      const customer = await findCustomerReference(client, input.referenceId, tenantId);
      assert(customer, "Customer not found.", 404);
      return { referenceKey: `CUSTOMER:${customer.id}`, referenceId: customer.id, accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE };
    }
    if (input.referenceType === "SUPPLIER") {
      assert(input.referenceId, "Supplier is required.", 400);
      const supplier = await findSupplierReference(client, input.referenceId, tenantId);
      assert(supplier, "Supplier not found.", 404);
      return { referenceKey: `SUPPLIER:${supplier.id}`, referenceId: supplier.id, accountCode: ACCOUNTS.ACCOUNTS_PAYABLE };
    }
    assert(input.referenceId, "Finance account is required.", 400);
    const financeAccount = await findFinanceAccountReference(client, input.referenceId, tenantId);
    assert(financeAccount, "Finance account not found.", 404);
    return {
      referenceKey: `FINANCE_ACCOUNT:${financeAccount.id}`,
      referenceId: financeAccount.id,
      accountCode: financeAccount.type === "BANK" ? ACCOUNTS.BANK : ACCOUNTS.CASH,
    };
  }

  buildOpeningBalanceLines(accountCode, amount, balanceSide) {
    assert(amount > 0, "Amount must be greater than zero.", 400);
    assert(BALANCE_SIDES.includes(balanceSide), "Invalid balance side.", 400);
    if (balanceSide === "DEBIT") {
      return [
        { accountCode, debit: amount },
        { accountCode: ACCOUNTS.OWNERS_EQUITY, credit: amount },
      ];
    }
    return [
      { accountCode, credit: amount },
      { accountCode: ACCOUNTS.OWNERS_EQUITY, debit: amount },
    ];
  }

  async createOpeningBalance(input, actor) {
    const data = normalizeOpeningBalance(input);
    assert(data.balanceDate, "Balance date is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const resolved = await this.resolveOpeningReference(client, data, actor.tenantId);
      const duplicate = await findOpeningBalanceByReferenceKey(client, actor.tenantId, resolved.referenceKey);
      assert(!duplicate, "Opening balance already exists for this reference.", 409);
      const id = createId("ob");
      const entry = await this.journalService.post(client, {
        tenantId: actor.tenantId,
        entryDate: data.balanceDate,
        sourceType: JOURNAL_SOURCE_TYPES.OPENING_BALANCE,
        sourceId: id,
        memo: `Opening balance ${resolved.referenceKey}`,
        createdById: actor.id,
        lines: this.buildOpeningBalanceLines(resolved.accountCode, data.amount, data.balanceSide),
      });
      const openingBalance = await insertOpeningBalance(client, {
        id,
        tenantId: actor.tenantId,
        referenceKey: resolved.referenceKey,
        referenceType: data.referenceType,
        referenceId: resolved.referenceId,
        accountCode: resolved.accountCode,
        offsetAccountCode: ACCOUNTS.OWNERS_EQUITY,
        balanceDate: data.balanceDate,
        amount: data.amount,
        balanceSide: data.balanceSide,
        note: data.note,
        journalEntryId: entry.id,
        userId: actor.id,
      });
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.OPENING_BALANCE_CREATE,
        entityType: "opening_balance",
        entityId: openingBalance.id,
        description: `${actor.name} created opening balance ${resolved.referenceKey}`,
        after: openingBalance,
      });
      return await findOpeningBalanceById(client, openingBalance.id, actor.tenantId);
    });
  }

  async updateOpeningBalance(id, input, actor) {
    const data = normalizeOpeningBalance(input);
    assert(data.balanceDate, "Balance date is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findOpeningBalanceById(client, id, actor.tenantId);
      assert(existing, "Opening balance not found.", 404);
      const resolved = await this.resolveOpeningReference(client, data, actor.tenantId);
      const duplicate = await findOpeningBalanceByReferenceKey(client, actor.tenantId, resolved.referenceKey);
      assert(!duplicate || duplicate.id === id, "Opening balance already exists for this reference.", 409);
      const entry = await this.journalService.replace(client, {
        tenantId: actor.tenantId,
        entryDate: data.balanceDate,
        sourceType: JOURNAL_SOURCE_TYPES.OPENING_BALANCE,
        sourceId: id,
        memo: `Opening balance ${resolved.referenceKey}`,
        createdById: actor.id,
        lines: this.buildOpeningBalanceLines(resolved.accountCode, data.amount, data.balanceSide),
      });
      const openingBalance = await updateOpeningBalance(client, {
        id,
        tenantId: actor.tenantId,
        referenceKey: resolved.referenceKey,
        referenceType: data.referenceType,
        referenceId: resolved.referenceId,
        accountCode: resolved.accountCode,
        offsetAccountCode: ACCOUNTS.OWNERS_EQUITY,
        balanceDate: data.balanceDate,
        amount: data.amount,
        balanceSide: data.balanceSide,
        note: data.note,
        journalEntryId: entry.id,
        userId: actor.id,
      });
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: ACCOUNTING_ACTIONS.OPENING_BALANCE_UPDATE,
        entityType: "opening_balance",
        entityId: id,
        description: `${actor.name} updated opening balance ${resolved.referenceKey}`,
        before: existing,
        after: openingBalance,
      });
      return await findOpeningBalanceById(client, id, actor.tenantId);
    });
  }

  async getDashboard(actor) {
    return this.databaseManager.withClient(async (client) => {
      const [trialBalance, accounts] = await Promise.all([
        getTrialBalance(client, { tenantId: actor.tenantId }),
        listAccountsDetailed(client),
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
      };
    });
  }
}
