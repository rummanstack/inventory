import { assert } from "../lib/errors.js";
import { findAccountDetailedByCode, findPostingPeriodStatus } from "../repositories/accountingRepository.js";

const BALANCE_TOLERANCE = 0.0001;

export class AccountingValidationService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async resolvePostingWindow(client, tenantId, entryDate) {
    if (!entryDate) return null;
    return findPostingPeriodStatus(client, tenantId, entryDate);
  }

  async assertPostingAllowed(
    client,
    {
      tenantId,
      entryDate,
      purpose = "Posting",
      allowClosedFiscalYear = false,
      allowClosedPeriod = false,
      allowLockedPeriod = false,
    } = {},
  ) {
    const period = await this.resolvePostingWindow(client, tenantId, entryDate);
    if (!period) return null;

    assert(
      allowClosedFiscalYear || period.fiscal_year_status !== "CLOSED",
      `${purpose} is blocked because fiscal year ${period.fiscal_year_name} is closed.`,
      400,
    );
    assert(
      allowClosedPeriod || period.period_status !== "CLOSED",
      `${purpose} is blocked because period ${period.period_name} is closed.`,
      400,
    );
    assert(
      allowLockedPeriod || !period.period_locked,
      `${purpose} is blocked because period ${period.period_name} is locked.`,
      400,
    );
    return period;
  }

  async assertAccountActive(client, accountCode, { allowInactive = false } = {}) {
    assert(accountCode, "Account is required.", 400);
    const account = await findAccountDetailedByCode(client, accountCode);
    assert(account, `Account ${accountCode} not found.`, 404);
    assert(allowInactive || account.isActive, `Account ${accountCode} is inactive.`, 400);
    return account;
  }

  async assertAccountsActive(client, lines = [], options = {}) {
    const seen = new Set();
    for (const line of lines) {
      const accountCode = String(line?.accountCode || "").trim();
      if (!accountCode || seen.has(accountCode)) continue;
      seen.add(accountCode);
      await this.assertAccountActive(client, accountCode, options);
    }
  }

  assertBalancedLines(lines = [], context = "Journal entry") {
    const cleanLines = (lines || []).filter((line) => (Number(line?.debit || 0) > 0) || (Number(line?.credit || 0) > 0));
    assert(cleanLines.length > 0, `${context} has no lines.`, 400);
    const totalDebit = cleanLines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
    const totalCredit = cleanLines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
    assert(
      Math.abs(totalDebit - totalCredit) < BALANCE_TOLERANCE,
      `Unbalanced ${context.toLowerCase()} (debit ${totalDebit} != credit ${totalCredit}).`,
      400,
    );
    return { totalDebit, totalCredit, lines: cleanLines };
  }

  async validatePosting(
    client,
    {
      tenantId,
      entryDate,
      lines,
      purpose = "Posting",
      allowInactiveAccounts = false,
      allowClosedFiscalYear = false,
      allowClosedPeriod = false,
      allowLockedPeriod = false,
      context = "Journal entry",
    } = {},
  ) {
    const period = await this.assertPostingAllowed(client, {
      tenantId,
      entryDate,
      purpose,
      allowClosedFiscalYear,
      allowClosedPeriod,
      allowLockedPeriod,
    });
    const totals = this.assertBalancedLines(lines, context);
    await this.assertAccountsActive(client, totals.lines, { allowInactive: allowInactiveAccounts });
    return { period, ...totals };
  }
}
