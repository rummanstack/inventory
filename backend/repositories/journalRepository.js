export function mapAccount(row) {
  return {
    code: row.code,
    name: row.name,
    type: row.type,
    normalBalance: row.normal_balance,
  };
}

export function mapJournalEntry(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    entryDate: row.entry_date,
    sourceType: row.source_type,
    sourceId: row.source_id,
    memo: row.memo,
    createdById: row.created_by,
    createdAt: row.created_at,
    reversedAt: row.reversed_at,
    reversalOfEntryId: row.reversal_of_entry_id,
  };
}

export function mapJournalLine(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    journalEntryId: row.journal_entry_id,
    accountCode: row.account_code,
    accountName: row.account_name || null,
    debit: Number(row.debit || 0),
    credit: Number(row.credit || 0),
    entryDate: row.entry_date || null,
    sourceType: row.source_type || null,
    sourceId: row.source_id || null,
    memo: row.memo ?? null,
  };
}

export async function listChartOfAccounts(client) {
  const result = await client.query(
    `SELECT * FROM chart_of_accounts WHERE is_active = true ORDER BY code ASC`,
  );
  return result.rows.map(mapAccount);
}

export async function findAccountByCode(client, code) {
  const result = await client.query(`SELECT * FROM chart_of_accounts WHERE code = $1 LIMIT 1`, [code]);
  return result.rowCount > 0 ? mapAccount(result.rows[0]) : null;
}

export async function insertJournalEntry(client, entry) {
  const result = await client.query(
    `INSERT INTO journal_entries (id, tenant_id, entry_date, source_type, source_id, memo, created_by, reversal_of_entry_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      entry.id,
      entry.tenantId,
      entry.entryDate,
      entry.sourceType,
      entry.sourceId,
      entry.memo || "",
      entry.createdById || null,
      entry.reversalOfEntryId || null,
    ],
  );
  return mapJournalEntry(result.rows[0]);
}

export async function insertJournalLine(client, line) {
  const result = await client.query(
    `INSERT INTO journal_lines (id, tenant_id, journal_entry_id, account_code, debit, credit)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [line.id, line.tenantId, line.journalEntryId, line.accountCode, line.debit || 0, line.credit || 0],
  );
  return mapJournalLine(result.rows[0]);
}

export async function findLiveJournalEntry(client, tenantId, sourceType, sourceId) {
  const result = await client.query(
    `SELECT * FROM journal_entries
     WHERE tenant_id = $1 AND source_type = $2 AND source_id = $3 AND reversal_of_entry_id IS NULL
     LIMIT 1`,
    [tenantId, sourceType, sourceId],
  );
  return result.rowCount > 0 ? mapJournalEntry(result.rows[0]) : null;
}

// Finds every live (non-reversed-away) adjustment entry posted against a
// source, e.g. all "${receiptId}:adj:..." entries for one purchase receipt —
// used so a delete/restore can undo every adjustment made since creation, not
// just the original entry.
export async function listLiveJournalEntriesBySourceIdPrefix(client, tenantId, sourceType, sourceIdPrefix) {
  const result = await client.query(
    `SELECT * FROM journal_entries
     WHERE tenant_id = $1 AND source_type = $2 AND source_id LIKE $3 AND reversal_of_entry_id IS NULL
     ORDER BY created_at ASC`,
    [tenantId, sourceType, `${sourceIdPrefix}%`],
  );
  return result.rows.map(mapJournalEntry);
}

export async function findReversalEntry(client, tenantId, reversalOfEntryId) {
  const result = await client.query(
    `SELECT * FROM journal_entries WHERE tenant_id = $1 AND reversal_of_entry_id = $2 LIMIT 1`,
    [tenantId, reversalOfEntryId],
  );
  return result.rowCount > 0 ? mapJournalEntry(result.rows[0]) : null;
}

export async function listJournalLinesForEntry(client, tenantId, journalEntryId) {
  const result = await client.query(
    `SELECT * FROM journal_lines WHERE tenant_id = $1 AND journal_entry_id = $2 ORDER BY id`,
    [tenantId, journalEntryId],
  );
  return result.rows.map(mapJournalLine);
}

export async function markJournalEntryReversed(client, tenantId, entryId) {
  await client.query(`UPDATE journal_entries SET reversed_at = NOW() WHERE id = $1 AND tenant_id = $2`, [
    entryId,
    tenantId,
  ]);
}

export async function clearJournalEntryReversed(client, tenantId, entryId) {
  await client.query(`UPDATE journal_entries SET reversed_at = NULL WHERE id = $1 AND tenant_id = $2`, [
    entryId,
    tenantId,
  ]);
}

export async function deleteJournalEntry(client, tenantId, entryId) {
  await client.query(`DELETE FROM journal_lines WHERE tenant_id = $1 AND journal_entry_id = $2`, [tenantId, entryId]);
  await client.query(`DELETE FROM journal_entries WHERE id = $1 AND tenant_id = $2`, [entryId, tenantId]);
}

function buildLedgerFilterClause({ tenantId, accountCode, dateFrom, dateTo }, params) {
  params.push(tenantId);
  const conditions = [`journal_lines.tenant_id = $${params.length}`];

  if (accountCode) {
    params.push(accountCode);
    conditions.push(`journal_lines.account_code = $${params.length}`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`journal_entries.entry_date >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`journal_entries.entry_date <= $${params.length}::date`);
  }

  return `WHERE ${conditions.join(" AND ")}`;
}

export async function listGeneralLedgerLines(client, filters = {}) {
  const params = [];
  const where = buildLedgerFilterClause(filters, params);
  const result = await client.query(
    `SELECT journal_lines.*, journal_entries.entry_date, journal_entries.source_type,
            journal_entries.source_id, journal_entries.memo, chart_of_accounts.name AS account_name
     FROM journal_lines
     JOIN journal_entries ON journal_entries.id = journal_lines.journal_entry_id
     JOIN chart_of_accounts ON chart_of_accounts.code = journal_lines.account_code
     ${where}
     ORDER BY journal_entries.entry_date DESC, journal_entries.created_at DESC, journal_lines.id DESC`,
    params,
  );
  return result.rows.map(mapJournalLine);
}

// Cumulative-to-date by default (omit dateFrom) — the correct basis for a
// Trial Balance or Balance Sheet, since asset/liability/equity balances carry
// forward from account inception. Passing dateFrom bounds it to a period
// instead, which is what a Profit & Loss statement needs for its revenue and
// expense accounts (a period total, not an all-time cumulative one).
export async function getTrialBalance(client, { tenantId, dateFrom, dateTo }) {
  const params = [tenantId];
  let dateClause = "";
  if (dateFrom) {
    params.push(dateFrom);
    dateClause += ` AND journal_entries.entry_date >= $${params.length}::date`;
  }
  if (dateTo) {
    params.push(dateTo);
    dateClause += ` AND journal_entries.entry_date <= $${params.length}::date`;
  }

  // The date filter must live in the WHERE clause of the CTE that actually
  // produces the rows being summed — putting it on a LEFT JOIN's ON clause
  // instead (a previous version of this query did) doesn't restrict the SUM
  // at all, since unmatched rows are still kept (with NULLs) by a LEFT JOIN
  // rather than dropped, and journal_lines.debit/credit come from the OTHER
  // join either way.
  const result = await client.query(
    `WITH filtered_lines AS (
       SELECT journal_lines.account_code, journal_lines.debit, journal_lines.credit
       FROM journal_lines
       JOIN journal_entries ON journal_entries.id = journal_lines.journal_entry_id
       WHERE journal_lines.tenant_id = $1 ${dateClause}
     )
     SELECT chart_of_accounts.code, chart_of_accounts.name, chart_of_accounts.type, chart_of_accounts.normal_balance,
            COALESCE(SUM(filtered_lines.debit), 0) AS total_debit,
            COALESCE(SUM(filtered_lines.credit), 0) AS total_credit
     FROM chart_of_accounts
     LEFT JOIN filtered_lines ON filtered_lines.account_code = chart_of_accounts.code
     WHERE chart_of_accounts.is_active = true
     GROUP BY chart_of_accounts.code, chart_of_accounts.name, chart_of_accounts.type, chart_of_accounts.normal_balance
     ORDER BY chart_of_accounts.code ASC`,
    params,
  );

  return result.rows.map((row) => {
    const totalDebit = Number(row.total_debit || 0);
    const totalCredit = Number(row.total_credit || 0);
    const closingBalance = row.normal_balance === "DEBIT" ? totalDebit - totalCredit : totalCredit - totalDebit;
    return {
      code: row.code,
      name: row.name,
      type: row.type,
      normalBalance: row.normal_balance,
      totalDebit,
      totalCredit,
      closingBalance,
    };
  });
}
