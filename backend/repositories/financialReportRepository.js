const VOUCHER_SOURCE_TYPES = ['journal_voucher', 'receipt_voucher', 'payment_voucher', 'contra_voucher'];

function mapTrialBalanceRow(row) {
  const openingDebit = Number(row.opening_debit || 0);
  const openingCredit = Number(row.opening_credit || 0);
  const debit = Number(row.debit || 0);
  const credit = Number(row.credit || 0);
  const closingNet = Number(row.closing_net || 0);
  const normalBalance = row.normal_balance;
  const closingOnNormalSide = closingNet >= 0;
  const closingAmount = Math.abs(closingNet);
  return {
    code: row.code,
    name: row.name,
    type: row.type,
    normalBalance,
    accountGroup: row.account_group || '',
    parentCode: row.parent_code || null,
    openingDebit,
    openingCredit,
    debit,
    credit,
    closingDebit:
      normalBalance === 'DEBIT'
        ? (closingOnNormalSide ? closingAmount : 0)
        : (closingOnNormalSide ? 0 : closingAmount),
    closingCredit:
      normalBalance === 'CREDIT'
        ? (closingOnNormalSide ? closingAmount : 0)
        : (closingOnNormalSide ? 0 : closingAmount),
    closingNet,
  };
}

function mapLedgerLine(row) {
  return {
    id: row.id,
    journalEntryId: row.journal_entry_id,
    entryDate: row.entry_date,
    sourceType: row.source_type,
    sourceId: row.source_id,
    accountCode: row.account_code,
    accountName: row.account_name,
    normalBalance: row.normal_balance,
    debit: Number(row.debit || 0),
    credit: Number(row.credit || 0),
    memo: row.memo || '',
    voucherNumber: row.voucher_number || row.document_number || '',
    voucherType: row.voucher_type || row.source_type,
    referenceNumber: row.reference_number || '',
    partyName: row.party_name || '',
    referenceType: row.reference_type || '',
    referenceId: row.reference_id || null,
    referenceName: row.reference_name || '',
    documentNumber: row.document_number || row.voucher_number || '',
  };
}

function mapAccountBalanceRow(row) {
  return {
    code: row.code,
    name: row.name,
    type: row.type,
    normalBalance: row.normal_balance,
    accountGroup: row.account_group || '',
    parentCode: row.parent_code || null,
    balance: Number(row.balance || 0),
  };
}

function mapProfitLossDetailRow(row) {
  return {
    code: row.code,
    name: row.name,
    type: row.type,
    normalBalance: row.normal_balance,
    accountGroup: row.account_group || '',
    amount: Number(row.amount || 0),
  };
}

function mapCashFlowMovementRow(row) {
  return {
    code: row.code,
    name: row.name,
    type: row.type,
    accountGroup: row.account_group || '',
    openingBalance: Number(row.opening_balance || 0),
    closingBalance: Number(row.closing_balance || 0),
    movement: Number(row.movement || 0),
  };
}

function buildDateConditions(alias, params, { dateFrom, dateTo, beforeDate, onOrBeforeDate }) {
  const conditions = [];
  if (beforeDate) {
    params.push(beforeDate);
    conditions.push(`${alias}.entry_date < $${params.length}::date`);
    return conditions;
  }
  if (onOrBeforeDate) {
    params.push(onOrBeforeDate);
    conditions.push(`${alias}.entry_date <= $${params.length}::date`);
    return conditions;
  }
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`${alias}.entry_date >= $${params.length}::date`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`${alias}.entry_date <= $${params.length}::date`);
  }
  return conditions;
}

function buildSharedEntryJoins() {
  return `
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    JOIN chart_of_accounts coa ON coa.code = jl.account_code
    LEFT JOIN vouchers v
      ON v.id = je.source_id
     AND v.tenant_id = jl.tenant_id
     AND je.source_type = ANY($VOUCHER_TYPES$::text[])
    LEFT JOIN LATERAL (
      SELECT vl.reference_type, vl.reference_id, vl.reference_name
      FROM voucher_lines vl
      WHERE vl.tenant_id = jl.tenant_id
        AND vl.voucher_id = je.source_id
        AND vl.account_code = jl.account_code
      ORDER BY vl.line_no ASC
      LIMIT 1
    ) vref ON je.source_type = ANY($VOUCHER_TYPES$::text[])
    LEFT JOIN sales_invoices si
      ON je.source_type = 'sales_invoice'
     AND si.id = je.source_id
     AND si.tenant_id = jl.tenant_id
    LEFT JOIN retail_customers si_customer ON si_customer.id = si.customer_id
    LEFT JOIN customer_payments cp
      ON je.source_type IN ('customer_payment', 'customer_payment_adjustment')
     AND cp.id = split_part(je.source_id, ':', 1)
     AND cp.tenant_id = jl.tenant_id
    LEFT JOIN retail_customers cp_customer ON cp_customer.id = cp.customer_id
    LEFT JOIN sales_returns sr
      ON je.source_type = 'sales_return'
     AND sr.id = je.source_id
     AND sr.tenant_id = jl.tenant_id
    LEFT JOIN retail_customers sr_customer ON sr_customer.id = sr.customer_id
    LEFT JOIN purchase_receipts pr
      ON je.source_type IN ('purchase_receipt', 'purchase_receipt_adjustment')
     AND pr.id = split_part(je.source_id, ':', 1)
     AND pr.tenant_id = jl.tenant_id
    LEFT JOIN suppliers pr_supplier ON pr_supplier.id = pr.supplier_id
    LEFT JOIN supplier_payments sp
      ON je.source_type IN ('supplier_payment', 'supplier_payment_adjustment')
     AND sp.id = split_part(je.source_id, ':', 1)
     AND sp.tenant_id = jl.tenant_id
    LEFT JOIN suppliers sp_supplier ON sp_supplier.id = sp.supplier_id
    LEFT JOIN purchase_returns pur
      ON je.source_type = 'purchase_return'
     AND pur.id = je.source_id
     AND pur.tenant_id = jl.tenant_id
    LEFT JOIN suppliers pur_supplier ON pur_supplier.id = pur.supplier_id
    LEFT JOIN opening_balances ob
      ON je.source_type = 'opening_balance'
     AND ob.journal_entry_id = je.id
     AND ob.tenant_id = jl.tenant_id
    LEFT JOIN retail_customers ob_customer ON ob.reference_type = 'CUSTOMER' AND ob_customer.id = ob.reference_id
    LEFT JOIN suppliers ob_supplier ON ob.reference_type = 'SUPPLIER' AND ob_supplier.id = ob.reference_id
  `;
}

function buildSharedSelect() {
  return `
    jl.id,
    je.id AS journal_entry_id,
    je.entry_date,
    je.source_type,
    je.source_id,
    je.memo,
    jl.account_code,
    coa.name AS account_name,
    coa.normal_balance,
    coa.type,
    coa.account_group,
    jl.debit,
    jl.credit,
    COALESCE(v.voucher_number, si.invoice_number, sr.return_number, pr.purchase_number, pur.return_number, ob.reference_key, je.source_id) AS document_number,
    COALESCE(v.voucher_number, si.invoice_number, sr.return_number, pr.purchase_number, pur.return_number, '') AS voucher_number,
    COALESCE(v.reference_number, si.invoice_number, pr.supplier_invoice_no, '') AS reference_number,
    COALESCE(v.voucher_type, je.source_type) AS voucher_type,
    COALESCE(v.counterparty_name, vref.reference_name, si_customer.name, cp_customer.name, sr_customer.name, pr_supplier.name, sp_supplier.name, pur_supplier.name, ob_customer.name, ob_supplier.name, '') AS party_name,
    COALESCE(vref.reference_type, ob.reference_type, '') AS reference_type,
    COALESCE(vref.reference_id, ob.reference_id, NULL) AS reference_id,
    COALESCE(vref.reference_name, ob_customer.name, ob_supplier.name, '') AS reference_name
  `;
}

function applyDetailedLedgerFilters(filters, params, conditions) {
  if (filters.accountCode) {
    params.push(filters.accountCode);
    conditions.push(`jl.account_code = $${params.length}`);
  }
  if (Array.isArray(filters.accountCodes) && filters.accountCodes.length > 0) {
    params.push(filters.accountCodes);
    conditions.push(`jl.account_code = ANY($${params.length}::text[])`);
  }
  if (filters.voucherNumber) {
    params.push(`%${filters.voucherNumber}%`);
    conditions.push(`COALESCE(v.voucher_number, si.invoice_number, sr.return_number, pr.purchase_number, pur.return_number, je.source_id) ILIKE $${params.length}`);
  }
  if (filters.reference) {
    params.push(`%${filters.reference}%`);
    conditions.push(`(
      COALESCE(v.reference_number, si.invoice_number, pr.supplier_invoice_no, '') ILIKE $${params.length}
      OR COALESCE(v.counterparty_name, vref.reference_name, si_customer.name, cp_customer.name, sr_customer.name, pr_supplier.name, sp_supplier.name, pur_supplier.name, ob_customer.name, ob_supplier.name, '') ILIKE $${params.length}
    )`);
  }
  if (filters.customerId) {
    params.push(filters.customerId);
    conditions.push(`(
      si.customer_id = $${params.length}
      OR cp.customer_id = $${params.length}
      OR sr.customer_id = $${params.length}
      OR (vref.reference_type = 'CUSTOMER' AND vref.reference_id = $${params.length})
      OR (ob.reference_type = 'CUSTOMER' AND ob.reference_id = $${params.length})
    )`);
  }
  if (filters.supplierId) {
    params.push(filters.supplierId);
    conditions.push(`(
      pr.supplier_id = $${params.length}
      OR sp.supplier_id = $${params.length}
      OR pur.supplier_id = $${params.length}
      OR (vref.reference_type = 'SUPPLIER' AND vref.reference_id = $${params.length})
      OR (ob.reference_type = 'SUPPLIER' AND ob.reference_id = $${params.length})
    )`);
  }
}

export async function getTrialBalanceDetailed(client, filters) {
  const params = [filters.tenantId];
  const accountFilterClause = filters.accountCode ? 'WHERE coa.code = $2' : '';
  const openingConditions = [`jl.tenant_id = $1`];
  const periodConditions = [`jl.tenant_id = $1`];

  if (filters.accountCode) {
    params.push(filters.accountCode);
    openingConditions.push(`jl.account_code = $2`);
    periodConditions.push(`jl.account_code = $2`);
  }

  if (filters.dateFrom) {
    params.push(filters.dateFrom);
    openingConditions.push(`je.entry_date < $${params.length}::date`);
    periodConditions.push(`je.entry_date >= $${params.length}::date`);
  } else {
    openingConditions.push(`1 = 0`);
  }
  if (filters.dateTo) {
    params.push(filters.dateTo);
    const dateIndex = params.length;
    periodConditions.push(`je.entry_date <= $${dateIndex}::date`);
  }

  const result = await client.query(
    `WITH opening AS (
       SELECT jl.account_code, COALESCE(SUM(jl.debit), 0) AS opening_debit, COALESCE(SUM(jl.credit), 0) AS opening_credit
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.journal_entry_id
       WHERE ${openingConditions.join(' AND ')}
       GROUP BY jl.account_code
     ),
     period AS (
       SELECT jl.account_code, COALESCE(SUM(jl.debit), 0) AS debit, COALESCE(SUM(jl.credit), 0) AS credit
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.journal_entry_id
       WHERE ${periodConditions.join(' AND ')}
       GROUP BY jl.account_code
     )
     SELECT coa.code, coa.name, coa.type, coa.normal_balance, coa.account_group, coa.parent_code,
            COALESCE(opening.opening_debit, 0) AS opening_debit,
            COALESCE(opening.opening_credit, 0) AS opening_credit,
            COALESCE(period.debit, 0) AS debit,
            COALESCE(period.credit, 0) AS credit,
            CASE
              WHEN coa.normal_balance = 'DEBIT'
                THEN COALESCE(opening.opening_debit, 0) - COALESCE(opening.opening_credit, 0) + COALESCE(period.debit, 0) - COALESCE(period.credit, 0)
              ELSE COALESCE(opening.opening_credit, 0) - COALESCE(opening.opening_debit, 0) + COALESCE(period.credit, 0) - COALESCE(period.debit, 0)
            END AS closing_net
     FROM chart_of_accounts coa
     LEFT JOIN opening ON opening.account_code = coa.code
     LEFT JOIN period ON period.account_code = coa.code
     ${accountFilterClause}
     ORDER BY coa.code ASC`,
    params,
  );

  const rows = result.rows.map(mapTrialBalanceRow);
  return filters.showZeroAccounts
    ? rows
    : rows.filter((row) => row.openingDebit || row.openingCredit || row.debit || row.credit || row.closingDebit || row.closingCredit);
}

export async function listDetailedLedgerLines(client, filters = {}) {
  const params = [filters.tenantId];
  const conditions = [`jl.tenant_id = $1`];
  conditions.push(...buildDateConditions('je', params, { dateFrom: filters.dateFrom, dateTo: filters.dateTo }));
  applyDetailedLedgerFilters(filters, params, conditions);
  params.push(VOUCHER_SOURCE_TYPES);

  const sql = `
    SELECT ${buildSharedSelect()}
    FROM journal_lines jl
    ${buildSharedEntryJoins().replace(/\$VOUCHER_TYPES\$/g, `$${params.length}`)}
    WHERE ${conditions.join(' AND ')}
    ORDER BY je.entry_date ASC, je.created_at ASC, jl.id ASC
  `;
  const result = await client.query(sql, params);
  return result.rows.map(mapLedgerLine);
}

export async function getOpeningBalanceForAccounts(client, { tenantId, accountCodes, dateFrom }) {
  if (!dateFrom || !Array.isArray(accountCodes) || accountCodes.length === 0) return 0;
  const result = await client.query(
    `SELECT COALESCE(SUM(CASE WHEN coa.normal_balance = 'DEBIT' THEN jl.debit - jl.credit ELSE jl.credit - jl.debit END), 0) AS balance
     FROM journal_lines jl
     JOIN journal_entries je ON je.id = jl.journal_entry_id
     JOIN chart_of_accounts coa ON coa.code = jl.account_code
     WHERE jl.tenant_id = $1 AND jl.account_code = ANY($2::text[]) AND je.entry_date < $3::date`,
    [tenantId, accountCodes, dateFrom],
  );
  return Number(result.rows[0]?.balance || 0);
}

export async function getReceivableOrPayableAccounts(client, { side }) {
  const column = side === 'CUSTOMER' ? 'is_receivable_account' : 'is_payable_account';
  const result = await client.query(`SELECT code FROM chart_of_accounts WHERE ${column} = true ORDER BY code ASC`);
  return result.rows.map((row) => row.code);
}

export async function listPartyLedgerLines(client, { tenantId, partyType, partyId, dateFrom, dateTo }) {
  const accountCodes = await getReceivableOrPayableAccounts(client, { side: partyType });
  if (accountCodes.length === 0) return [];
  const filters = {
    tenantId,
    accountCodes,
    dateFrom,
    dateTo,
    customerId: partyType === 'CUSTOMER' ? partyId : undefined,
    supplierId: partyType === 'SUPPLIER' ? partyId : undefined,
  };
  return listDetailedLedgerLines(client, filters);
}

export async function getPartyOpeningBalance(client, { tenantId, partyType, partyId, dateFrom }) {
  if (!dateFrom) return 0;
  const accountCodes = await getReceivableOrPayableAccounts(client, { side: partyType });
  if (accountCodes.length === 0) return 0;
  const lines = await listDetailedLedgerLines(client, {
    tenantId,
    accountCodes,
    dateTo: new Date(new Date(dateFrom).getTime() - 86400000).toISOString().slice(0, 10),
    customerId: partyType === 'CUSTOMER' ? partyId : undefined,
    supplierId: partyType === 'SUPPLIER' ? partyId : undefined,
  });
  return lines.reduce((sum, line) => sum + (partyType === 'CUSTOMER' ? line.debit - line.credit : line.credit - line.debit), 0);
}

export async function listCashOrBankBookLines(client, { tenantId, kind, accountCode, dateFrom, dateTo, voucherNumber, reference }) {
  const result = await client.query(
    `SELECT code FROM chart_of_accounts WHERE ${kind === 'BANK' ? 'is_bank_account = true' : 'is_cash_account = true'} ${accountCode ? 'AND code = $1' : ''} ORDER BY code ASC`,
    accountCode ? [accountCode] : [],
  );
  const accountCodes = result.rows.map((row) => row.code);
  if (accountCodes.length === 0) return { accountCodes: [], lines: [] };
  const lines = await listDetailedLedgerLines(client, { tenantId, accountCodes, dateFrom, dateTo, voucherNumber, reference });
  return { accountCodes, lines };
}

export async function getAccountBalancesAsOf(client, { tenantId, dateTo, showZeroAccounts = false }) {
  const params = [tenantId];
  let cutoffCondition = '';
  if (dateTo) {
    params.push(dateTo);
    cutoffCondition = `AND je.entry_date <= $${params.length}::date`;
  }
  const result = await client.query(
    `SELECT coa.code, coa.name, coa.type, coa.normal_balance, coa.account_group, coa.parent_code,
            COALESCE(SUM(CASE WHEN je.id IS NULL THEN 0 WHEN coa.normal_balance = 'DEBIT' THEN jl.debit - jl.credit ELSE jl.credit - jl.debit END), 0) AS balance
     FROM chart_of_accounts coa
     LEFT JOIN journal_lines jl ON jl.account_code = coa.code AND jl.tenant_id = $1
     LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id ${cutoffCondition}
     GROUP BY coa.code, coa.name, coa.type, coa.normal_balance, coa.account_group, coa.parent_code
     ORDER BY coa.code ASC`,
    params,
  );
  const rows = result.rows.map(mapAccountBalanceRow);
  return showZeroAccounts ? rows : rows.filter((row) => row.balance !== 0);
}

export async function getProfitAndLossRows(client, { tenantId, dateFrom, dateTo, showZeroAccounts = false }) {
  const params = [tenantId];
  const conditions = [`jl.tenant_id = $1`, `(coa.type = 'REVENUE' OR coa.type = 'EXPENSE')`];
  conditions.push(...buildDateConditions('je', params, { dateFrom, dateTo }));
  const result = await client.query(
    `SELECT coa.code, coa.name, coa.type, coa.normal_balance, coa.account_group,
            COALESCE(SUM(CASE WHEN coa.type = 'REVENUE' THEN jl.credit - jl.debit ELSE jl.debit - jl.credit END), 0) AS amount
     FROM journal_lines jl
     JOIN journal_entries je ON je.id = jl.journal_entry_id
     JOIN chart_of_accounts coa ON coa.code = jl.account_code
     WHERE ${conditions.join(' AND ')}
     GROUP BY coa.code, coa.name, coa.type, coa.normal_balance, coa.account_group
     ORDER BY coa.code ASC`,
    params,
  );
  const rows = result.rows.map(mapProfitLossDetailRow);
  return showZeroAccounts ? rows : rows.filter((row) => row.amount !== 0);
}

export async function getCashFlowMovementRows(client, { tenantId, dateFrom, dateTo }) {
  const params = [tenantId, dateFrom, dateTo];
  const result = await client.query(
    `WITH opening AS (
       SELECT coa.code,
              COALESCE(SUM(CASE WHEN je.id IS NULL THEN 0 WHEN coa.normal_balance = 'DEBIT' THEN jl.debit - jl.credit ELSE jl.credit - jl.debit END), 0) AS opening_balance
       FROM chart_of_accounts coa
       LEFT JOIN journal_lines jl ON jl.account_code = coa.code AND jl.tenant_id = $1
       LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.entry_date < $2::date
       GROUP BY coa.code
     ),
     closing AS (
       SELECT coa.code,
              COALESCE(SUM(CASE WHEN je.id IS NULL THEN 0 WHEN coa.normal_balance = 'DEBIT' THEN jl.debit - jl.credit ELSE jl.credit - jl.debit END), 0) AS closing_balance
       FROM chart_of_accounts coa
       LEFT JOIN journal_lines jl ON jl.account_code = coa.code AND jl.tenant_id = $1
       LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.entry_date <= $3::date
       GROUP BY coa.code
     )
     SELECT coa.code, coa.name, coa.type, coa.account_group,
            COALESCE(opening.opening_balance, 0) AS opening_balance,
            COALESCE(closing.closing_balance, 0) AS closing_balance,
            COALESCE(closing.closing_balance, 0) - COALESCE(opening.opening_balance, 0) AS movement
     FROM chart_of_accounts coa
     LEFT JOIN opening ON opening.code = coa.code
     LEFT JOIN closing ON closing.code = coa.code
     ORDER BY coa.code ASC`,
    params,
  );
  return result.rows.map(mapCashFlowMovementRow);
}

