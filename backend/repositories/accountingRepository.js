export function mapDetailedAccount(row) {
  return {
    code: row.code,
    name: row.name,
    type: row.type,
    normalBalance: row.normal_balance,
    isActive: Boolean(row.is_active),
    parentCode: row.parent_code || null,
    accountGroup: row.account_group || '',
    isSystem: Boolean(row.is_system),
    isCashAccount: Boolean(row.is_cash_account),
    isBankAccount: Boolean(row.is_bank_account),
    isReceivableAccount: Boolean(row.is_receivable_account),
    isPayableAccount: Boolean(row.is_payable_account),
  };
}

function mapFiscalYear(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    isActive: Boolean(row.is_active),
    closedAt: row.closed_at,
    closedBy: row.closed_by,
    closingJournalEntryId: row.closing_journal_entry_id || null,
    closedChecklist: row.closed_checklist || {},
    reopenedAt: row.reopened_at,
    reopenedBy: row.reopened_by || null,
    openingGeneratedAt: row.opening_generated_at,
    openingSourceFiscalYearId: row.opening_source_fiscal_year_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    periodCount: Number(row.period_count || 0),
  };
}

function mapPeriod(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    fiscalYearId: row.fiscal_year_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    locked: Boolean(row.locked),
    closedAt: row.closed_at,
    closedBy: row.closed_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOpeningBalance(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    fiscalYearId: row.fiscal_year_id || null,
    generatedFromFiscalYearId: row.generated_from_fiscal_year_id || null,
    isSystemGenerated: Boolean(row.is_system_generated),
    referenceKey: row.reference_key,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    accountCode: row.account_code,
    accountName: row.account_name || null,
    offsetAccountCode: row.offset_account_code,
    offsetAccountName: row.offset_account_name || null,
    balanceDate: row.balance_date,
    amount: Number(row.amount || 0),
    balanceSide: row.balance_side,
    note: row.note || '',
    journalEntryId: row.journal_entry_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSettings(row) {
  return {
    tenantId: row.tenant_id,
    defaultCurrency: row.default_currency,
    decimalPrecision: Number(row.decimal_precision || 2),
    voucherPrefix: row.voucher_prefix,
    journalVoucherPrefix: row.journal_voucher_prefix || row.voucher_prefix || 'JV',
    receiptVoucherPrefix: row.receipt_voucher_prefix || 'RV',
    paymentVoucherPrefix: row.payment_voucher_prefix || 'PV',
    contraVoucherPrefix: row.contra_voucher_prefix || 'CV',
    financialYearStart: row.financial_year_start,
    negativeCashPolicy: row.negative_cash_policy,
    autoPostingEnabled: Boolean(row.auto_posting_enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAccountsDetailed(client, { activeOnly = false } = {}) {
  const clauses = [];
  if (activeOnly) clauses.push('is_active = true');
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await client.query(`SELECT * FROM chart_of_accounts ${where} ORDER BY code ASC`);
  return result.rows.map(mapDetailedAccount);
}

export async function findAccountDetailedByCode(client, code) {
  const result = await client.query(`SELECT * FROM chart_of_accounts WHERE code = $1 LIMIT 1`, [code]);
  return result.rowCount ? mapDetailedAccount(result.rows[0]) : null;
}

export async function insertAccountDetailed(client, account) {
  const result = await client.query(
    `INSERT INTO chart_of_accounts (
      code, name, type, normal_balance, is_active, parent_code, account_group,
      is_system, is_cash_account, is_bank_account, is_receivable_account, is_payable_account
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *`,
    [
      account.code,
      account.name,
      account.type,
      account.normalBalance,
      account.isActive,
      account.parentCode,
      account.accountGroup,
      account.isSystem,
      account.isCashAccount,
      account.isBankAccount,
      account.isReceivableAccount,
      account.isPayableAccount,
    ],
  );
  return mapDetailedAccount(result.rows[0]);
}

export async function updateAccountDetailed(client, account) {
  const result = await client.query(
    `UPDATE chart_of_accounts
     SET name = $2,
         type = $3,
         normal_balance = $4,
         is_active = $5,
         parent_code = $6,
         account_group = $7,
         is_cash_account = $8,
         is_bank_account = $9,
         is_receivable_account = $10,
         is_payable_account = $11
     WHERE code = $1
     RETURNING *`,
    [
      account.code,
      account.name,
      account.type,
      account.normalBalance,
      account.isActive,
      account.parentCode,
      account.accountGroup,
      account.isCashAccount,
      account.isBankAccount,
      account.isReceivableAccount,
      account.isPayableAccount,
    ],
  );
  return result.rowCount ? mapDetailedAccount(result.rows[0]) : null;
}

export async function listFiscalYears(client, tenantId) {
  const result = await client.query(
    `SELECT fiscal_years.*, COUNT(accounting_periods.id) AS period_count
     FROM fiscal_years
     LEFT JOIN accounting_periods ON accounting_periods.fiscal_year_id = fiscal_years.id
     WHERE fiscal_years.tenant_id = $1
     GROUP BY fiscal_years.id
     ORDER BY fiscal_years.start_date DESC, fiscal_years.created_at DESC`,
    [tenantId],
  );
  return result.rows.map(mapFiscalYear);
}

export async function findFiscalYearById(client, id, tenantId) {
  const result = await client.query(`SELECT * FROM fiscal_years WHERE id = $1 AND tenant_id = $2 LIMIT 1`, [id, tenantId]);
  return result.rowCount ? mapFiscalYear(result.rows[0]) : null;
}

export async function findFiscalYearByDate(client, tenantId, entryDate) {
  const result = await client.query(
    `SELECT * FROM fiscal_years WHERE tenant_id = $1 AND $2::date BETWEEN start_date AND end_date ORDER BY start_date DESC LIMIT 1`,
    [tenantId, entryDate],
  );
  return result.rowCount ? mapFiscalYear(result.rows[0]) : null;
}

export async function deactivateFiscalYears(client, tenantId, exceptId = null) {
  if (exceptId) {
    await client.query(`UPDATE fiscal_years SET is_active = false, updated_at = NOW() WHERE tenant_id = $1 AND id <> $2`, [tenantId, exceptId]);
    return;
  }
  await client.query(`UPDATE fiscal_years SET is_active = false, updated_at = NOW() WHERE tenant_id = $1`, [tenantId]);
}

export async function insertFiscalYear(client, year) {
  const result = await client.query(
    `INSERT INTO fiscal_years (id, tenant_id, name, start_date, end_date, status, is_active, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [year.id, year.tenantId, year.name, year.startDate, year.endDate, year.status, year.isActive, year.createdBy],
  );
  return mapFiscalYear(result.rows[0]);
}

export async function updateFiscalYearState(client, {
  id,
  tenantId,
  status,
  isActive,
  closedBy = null,
  closingJournalEntryId = undefined,
  closedChecklist = undefined,
  reopenedBy = undefined,
  openingGeneratedAt = undefined,
  openingSourceFiscalYearId = undefined,
} = {}) {
  const result = await client.query(
    `UPDATE fiscal_years
     SET status = $3,
         is_active = $4,
         closed_at = CASE WHEN $3 = 'CLOSED' THEN NOW() WHEN $3 = 'OPEN' THEN NULL ELSE closed_at END,
         closed_by = CASE WHEN $3 = 'CLOSED' THEN $5 ELSE CASE WHEN $3 = 'OPEN' THEN NULL ELSE closed_by END END,
         closing_journal_entry_id = COALESCE($6, closing_journal_entry_id),
         closed_checklist = COALESCE($7, closed_checklist),
         reopened_at = CASE WHEN $8 IS NULL THEN reopened_at ELSE NOW() END,
         reopened_by = COALESCE($8, reopened_by),
         opening_generated_at = COALESCE($9, opening_generated_at),
         opening_source_fiscal_year_id = COALESCE($10, opening_source_fiscal_year_id),
         updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [id, tenantId, status, isActive, closedBy, closingJournalEntryId ?? null, closedChecklist ?? null, reopenedBy ?? null, openingGeneratedAt ?? null, openingSourceFiscalYearId ?? null],
  );
  return result.rowCount ? mapFiscalYear(result.rows[0]) : null;
}

export async function markFiscalYearOpeningGenerated(client, { id, tenantId, sourceFiscalYearId }) {
  const result = await client.query(
    `UPDATE fiscal_years
     SET opening_generated_at = NOW(),
         opening_source_fiscal_year_id = $3,
         updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [id, tenantId, sourceFiscalYearId],
  );
  return result.rowCount ? mapFiscalYear(result.rows[0]) : null;
}

export async function insertAccountingPeriod(client, period) {
  const result = await client.query(
    `INSERT INTO accounting_periods (id, tenant_id, fiscal_year_id, name, start_date, end_date, status, locked, closed_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [period.id, period.tenantId, period.fiscalYearId, period.name, period.startDate, period.endDate, period.status, period.locked, period.closedBy],
  );
  return mapPeriod(result.rows[0]);
}

export async function listPeriodsByFiscalYear(client, fiscalYearId, tenantId) {
  const result = await client.query(
    `SELECT * FROM accounting_periods WHERE fiscal_year_id = $1 AND tenant_id = $2 ORDER BY start_date ASC`,
    [fiscalYearId, tenantId],
  );
  return result.rows.map(mapPeriod);
}

export async function findPeriodById(client, id, tenantId) {
  const result = await client.query(`SELECT * FROM accounting_periods WHERE id = $1 AND tenant_id = $2 LIMIT 1`, [id, tenantId]);
  return result.rowCount ? mapPeriod(result.rows[0]) : null;
}

export async function updatePeriodState(client, { id, tenantId, status, locked, closedBy = null }) {
  const result = await client.query(
    `UPDATE accounting_periods
     SET status = $3,
         locked = $4,
         closed_at = CASE WHEN $3 = 'CLOSED' THEN NOW() WHEN $3 = 'OPEN' THEN NULL ELSE closed_at END,
         closed_by = CASE WHEN $3 = 'CLOSED' THEN $5 ELSE CASE WHEN $3 = 'OPEN' THEN NULL ELSE closed_by END END,
         updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [id, tenantId, status, locked, closedBy],
  );
  return result.rowCount ? mapPeriod(result.rows[0]) : null;
}

export async function closeAllPeriodsForFiscalYear(client, fiscalYearId, tenantId, closedBy) {
  await client.query(
    `UPDATE accounting_periods
     SET status = 'CLOSED', locked = true, closed_at = NOW(), closed_by = $3, updated_at = NOW()
     WHERE fiscal_year_id = $1 AND tenant_id = $2`,
    [fiscalYearId, tenantId, closedBy],
  );
}

export async function reopenAllPeriodsForFiscalYear(client, fiscalYearId, tenantId) {
  await client.query(
    `UPDATE accounting_periods
     SET status = 'OPEN', locked = false, closed_at = NULL, closed_by = NULL, updated_at = NOW()
     WHERE fiscal_year_id = $1 AND tenant_id = $2`,
    [fiscalYearId, tenantId],
  );
}

export async function findPostingPeriodStatus(client, tenantId, entryDate) {
  const result = await client.query(
    `SELECT fiscal_years.id AS fiscal_year_id,
            fiscal_years.name AS fiscal_year_name,
            fiscal_years.status AS fiscal_year_status,
            fiscal_years.start_date AS fiscal_year_start_date,
            fiscal_years.end_date AS fiscal_year_end_date,
            accounting_periods.id AS period_id,
            accounting_periods.name AS period_name,
            accounting_periods.status AS period_status,
            accounting_periods.locked AS period_locked
     FROM accounting_periods
     JOIN fiscal_years ON fiscal_years.id = accounting_periods.fiscal_year_id
     WHERE accounting_periods.tenant_id = $1
       AND $2::date BETWEEN accounting_periods.start_date AND accounting_periods.end_date
     ORDER BY accounting_periods.start_date DESC
     LIMIT 1`,
    [tenantId, entryDate],
  );
  return result.rowCount ? result.rows[0] : null;
}

export async function countVouchersByStatuses(client, { tenantId, fiscalYearId, statuses = [] }) {
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count
     FROM vouchers
     WHERE tenant_id = $1
       AND fiscal_year_id = $2
       AND deleted_at IS NULL
       AND status = ANY($3::text[])`,
    [tenantId, fiscalYearId, statuses],
  );
  return Number(result.rows[0]?.count || 0);
}

export async function countOpeningBalancesForFiscalYear(client, { tenantId, fiscalYearId, systemGeneratedOnly = false }) {
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count
     FROM opening_balances
     WHERE tenant_id = $1
       AND fiscal_year_id = $2
       ${systemGeneratedOnly ? 'AND is_system_generated = true' : ''}`,
    [tenantId, fiscalYearId],
  );
  return Number(result.rows[0]?.count || 0);
}

export async function getAccountingSettings(client, tenantId) {
  const result = await client.query(`SELECT * FROM accounting_settings WHERE tenant_id = $1 LIMIT 1`, [tenantId]);
  return result.rowCount ? mapSettings(result.rows[0]) : null;
}

export async function upsertAccountingSettings(client, settings) {
  const result = await client.query(
    `INSERT INTO accounting_settings (
      tenant_id, default_currency, decimal_precision, voucher_prefix,
      journal_voucher_prefix, receipt_voucher_prefix, payment_voucher_prefix, contra_voucher_prefix,
      financial_year_start, negative_cash_policy, auto_posting_enabled,
      created_by, updated_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)
    ON CONFLICT (tenant_id) DO UPDATE SET
      default_currency = EXCLUDED.default_currency,
      decimal_precision = EXCLUDED.decimal_precision,
      voucher_prefix = EXCLUDED.voucher_prefix,
      journal_voucher_prefix = EXCLUDED.journal_voucher_prefix,
      receipt_voucher_prefix = EXCLUDED.receipt_voucher_prefix,
      payment_voucher_prefix = EXCLUDED.payment_voucher_prefix,
      contra_voucher_prefix = EXCLUDED.contra_voucher_prefix,
      financial_year_start = EXCLUDED.financial_year_start,
      negative_cash_policy = EXCLUDED.negative_cash_policy,
      auto_posting_enabled = EXCLUDED.auto_posting_enabled,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
    RETURNING *`,
    [
      settings.tenantId,
      settings.defaultCurrency,
      settings.decimalPrecision,
      settings.voucherPrefix,
      settings.journalVoucherPrefix,
      settings.receiptVoucherPrefix,
      settings.paymentVoucherPrefix,
      settings.contraVoucherPrefix,
      settings.financialYearStart,
      settings.negativeCashPolicy,
      settings.autoPostingEnabled,
      settings.userId,
    ],
  );
  return mapSettings(result.rows[0]);
}

export async function listOpeningBalances(client, tenantId, { fiscalYearId = null } = {}) {
  const params = [tenantId];
  let where = `WHERE ob.tenant_id = $1`;
  if (fiscalYearId) {
    params.push(fiscalYearId);
    where += ` AND ob.fiscal_year_id = $${params.length}`;
  }
  const result = await client.query(
    `SELECT ob.*, a.name AS account_name, oa.name AS offset_account_name
     FROM opening_balances ob
     JOIN chart_of_accounts a ON a.code = ob.account_code
     JOIN chart_of_accounts oa ON oa.code = ob.offset_account_code
     ${where}
     ORDER BY ob.balance_date DESC, ob.created_at DESC`,
    params,
  );
  return result.rows.map(mapOpeningBalance);
}

export async function findOpeningBalanceById(client, id, tenantId) {
  const result = await client.query(
    `SELECT ob.*, a.name AS account_name, oa.name AS offset_account_name
     FROM opening_balances ob
     JOIN chart_of_accounts a ON a.code = ob.account_code
     JOIN chart_of_accounts oa ON oa.code = ob.offset_account_code
     WHERE ob.id = $1 AND ob.tenant_id = $2
     LIMIT 1`,
    [id, tenantId],
  );
  return result.rowCount ? mapOpeningBalance(result.rows[0]) : null;
}

export async function findOpeningBalanceByReferenceKey(client, tenantId, referenceKey, fiscalYearId = null) {
  const params = [tenantId, referenceKey];
  let where = `tenant_id = $1 AND reference_key = $2`;
  if (fiscalYearId) {
    params.push(fiscalYearId);
    where += ` AND fiscal_year_id = $${params.length}`;
  } else {
    where += ` AND fiscal_year_id IS NULL`;
  }
  const result = await client.query(`SELECT * FROM opening_balances WHERE ${where} LIMIT 1`, params);
  return result.rowCount ? mapOpeningBalance(result.rows[0]) : null;
}

export async function insertOpeningBalance(client, item) {
  const result = await client.query(
    `INSERT INTO opening_balances (
      id, tenant_id, fiscal_year_id, generated_from_fiscal_year_id, is_system_generated,
      reference_key, reference_type, reference_id, account_code,
      offset_account_code, balance_date, amount, balance_side, note, journal_entry_id,
      created_by, updated_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16)
    RETURNING *`,
    [
      item.id,
      item.tenantId,
      item.fiscalYearId,
      item.generatedFromFiscalYearId || null,
      Boolean(item.isSystemGenerated),
      item.referenceKey,
      item.referenceType,
      item.referenceId,
      item.accountCode,
      item.offsetAccountCode,
      item.balanceDate,
      item.amount,
      item.balanceSide,
      item.note,
      item.journalEntryId,
      item.userId,
    ],
  );
  return mapOpeningBalance(result.rows[0]);
}

export async function updateOpeningBalance(client, item) {
  const result = await client.query(
    `UPDATE opening_balances
     SET fiscal_year_id = $3,
         generated_from_fiscal_year_id = $4,
         is_system_generated = $5,
         reference_key = $6,
         reference_type = $7,
         reference_id = $8,
         account_code = $9,
         offset_account_code = $10,
         balance_date = $11,
         amount = $12,
         balance_side = $13,
         note = $14,
         journal_entry_id = $15,
         updated_by = $16,
         updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [
      item.id,
      item.tenantId,
      item.fiscalYearId,
      item.generatedFromFiscalYearId || null,
      Boolean(item.isSystemGenerated),
      item.referenceKey,
      item.referenceType,
      item.referenceId,
      item.accountCode,
      item.offsetAccountCode,
      item.balanceDate,
      item.amount,
      item.balanceSide,
      item.note,
      item.journalEntryId,
      item.userId,
    ],
  );
  return result.rowCount ? mapOpeningBalance(result.rows[0]) : null;
}

export async function findCustomerReference(client, id, tenantId) {
  const result = await client.query(`SELECT id, name FROM retail_customers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1`, [id, tenantId]);
  return result.rowCount ? result.rows[0] : null;
}

export async function findSupplierReference(client, id, tenantId) {
  const result = await client.query(`SELECT id, name FROM suppliers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1`, [id, tenantId]);
  return result.rowCount ? result.rows[0] : null;
}

export async function findFinanceAccountReference(client, id, tenantId) {
  const result = await client.query(`SELECT id, name, type FROM finance_accounts WHERE id = $1 AND tenant_id = $2 LIMIT 1`, [id, tenantId]);
  return result.rowCount ? result.rows[0] : null;
}
