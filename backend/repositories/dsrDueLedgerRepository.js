function mapDueLedgerEntry(row) {
  return {
    id: row.id,
    organizationId: row.tenant_id,
    dsrId: row.dsr_id,
    dsrName: row.dsr_name || null,
    dsrArea: row.dsr_area || null,
    type: row.type,
    debit: Number(row.debit || 0),
    credit: Number(row.credit || 0),
    balanceAfter: Number(row.balance_after || 0),
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    note: row.note,
    createdById: row.created_by,
    createdByName: row.created_by_name || null,
    createdByEmail: row.created_by_email || null,
    createdByRole: row.created_by_role || null,
    businessDate: row.business_date,
    createdAt: row.created_at,
  };
}

function buildFilterClause({ tenantId, dsrId, dateFrom, dateTo }, params) {
  params.push(tenantId);
  const conditions = [`dsr_due_ledger.tenant_id = $${params.length}`];

  if (dsrId) {
    params.push(dsrId);
    conditions.push(`dsr_due_ledger.dsr_id = $${params.length}`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`COALESCE(dsr_due_ledger.business_date, dsr_due_ledger.created_at::date) >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`COALESCE(dsr_due_ledger.business_date, dsr_due_ledger.created_at::date) <= $${params.length}::date`);
  }

  return `WHERE ${conditions.join(" AND ")}`;
}

function buildSelect() {
  return `SELECT
      dsr_due_ledger.*,
      dsrs.name AS dsr_name,
      dsrs.area AS dsr_area,
      users.name AS created_by_name,
      users.email AS created_by_email,
      users.role AS created_by_role
    FROM dsr_due_ledger
    LEFT JOIN dsrs
      ON dsrs.id = dsr_due_ledger.dsr_id
      AND dsrs.tenant_id = dsr_due_ledger.tenant_id
    LEFT JOIN users
      ON users.id = dsr_due_ledger.created_by`;
}

// True insertion order — used wherever the "latest balance" must reflect the most recently
// processed entry (the base for the next posting, and what current balance is kept in sync
// with). Must NOT switch to business date — see customerDueLedgerRepository.js for why.
function orderByInsertion(direction) {
  const sort = direction === "ASC" ? "ASC" : "DESC";
  return `dsr_due_ledger.created_at ${sort},
          CASE dsr_due_ledger.type
            WHEN 'SALE_DUE' THEN 10
            WHEN 'COLLECTION' THEN 20
            ELSE 30
          END ${sort},
          dsr_due_ledger.id ${sort}`;
}

// Human-facing ordering for statements/reports — by business date, with insertion time only
// as a tiebreaker for same-day entries.
function orderByBusinessDate(direction) {
  const sort = direction === "ASC" ? "ASC" : "DESC";
  return `COALESCE(dsr_due_ledger.business_date, dsr_due_ledger.created_at::date) ${sort},
          dsr_due_ledger.created_at ${sort},
          CASE dsr_due_ledger.type
            WHEN 'SALE_DUE' THEN 10
            WHEN 'COLLECTION' THEN 20
            ELSE 30
          END ${sort},
          dsr_due_ledger.id ${sort}`;
}

export function insertDueLedgerEntry(client, entry) {
  return client.query(
    `INSERT INTO dsr_due_ledger (
       id,
       tenant_id,
       dsr_id,
       type,
       debit,
       credit,
       balance_after,
       reference_type,
       reference_id,
       note,
       created_by,
       business_date,
       created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12::date, CURRENT_DATE), clock_timestamp())
     RETURNING *`,
    [
      entry.id,
      entry.organizationId,
      entry.dsrId,
      entry.type,
      entry.debit,
      entry.credit,
      entry.balanceAfter,
      entry.referenceType,
      entry.referenceId,
      entry.note || "",
      entry.createdById,
      entry.businessDate || null,
    ],
  );
}

export async function getLatestDueLedgerEntry(client, dsrId, tenantId) {
  const result = await client.query(
    `SELECT * FROM dsr_due_ledger
     WHERE dsr_id = $1 AND tenant_id = $2
     ORDER BY ${orderByInsertion("DESC")}
     LIMIT 1`,
    [dsrId, tenantId],
  );
  return result.rowCount > 0 ? mapDueLedgerEntry(result.rows[0]) : null;
}

export async function getFirstDueLedgerEntryForReference(client, { tenantId, dsrId, referenceType, referenceId }) {
  const result = await client.query(
    `SELECT * FROM dsr_due_ledger
     WHERE tenant_id = $1
       AND dsr_id = $2
       AND reference_type = $3
       AND reference_id = $4
     ORDER BY ${orderByInsertion("ASC")}
     LIMIT 1`,
    [tenantId, dsrId, referenceType, referenceId],
  );
  return result.rowCount > 0 ? mapDueLedgerEntry(result.rows[0]) : null;
}

export async function countDueLedgerEntries(client, filters = {}) {
  const params = [];
  const where = buildFilterClause(filters, params);
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM dsr_due_ledger ${where}`, params);
  return result.rows[0].count;
}

export async function listDueLedgerPage(client, { tenantId, dsrId, dateFrom, dateTo, limit, offset }) {
  const params = [];
  const where = buildFilterClause({ tenantId, dsrId, dateFrom, dateTo }, params);
  params.push(limit, offset);
  const result = await client.query(
    `${buildSelect()}
     ${where}
     ORDER BY ${orderByInsertion("DESC")}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return result.rows.map(mapDueLedgerEntry);
}

export async function listDueLedgerInRange(client, { tenantId, dsrId, dateFrom, dateTo }) {
  const params = [];
  const where = buildFilterClause({ tenantId, dsrId, dateFrom, dateTo }, params);
  const result = await client.query(
    `${buildSelect()}
     ${where}
     ORDER BY ${orderByInsertion("DESC")}`,
    params,
  );

  return result.rows.map(mapDueLedgerEntry);
}

export async function getBalanceBefore(client, { tenantId, dsrId, dateFrom }) {
  if (!dateFrom) {
    // Full-history view: if any ledger entries exist, opening balance is 0 —
    // the OPENING entry in the ledger already captures dsrs.opening_due.
    // If no entries exist at all (e.g. DSR imported before the ledger feature),
    // fall back to dsrs.opening_due so the statement isn't misleadingly zero.
    const result = await client.query(
      `SELECT
         (SELECT COUNT(*) FROM dsr_due_ledger WHERE dsr_id = $1 AND tenant_id = $2)::INTEGER AS entry_count,
         COALESCE(opening_due, 0) AS opening_due
       FROM dsrs WHERE id = $1 AND tenant_id = $2`,
      [dsrId, tenantId],
    );
    if (!result.rowCount) return 0;
    return result.rows[0].entry_count > 0 ? 0 : Number(result.rows[0].opening_due || 0);
  }

  // Use insertion order: balance_after is stamped at posting time, so the last
  // inserted pre-period entry holds the correct opening balance even when some
  // entries were backdated. Business-date order would pick the wrong row here.
  const result = await client.query(
    `SELECT balance_after FROM dsr_due_ledger
     WHERE dsr_id = $1 AND tenant_id = $2
       AND COALESCE(business_date, created_at::date) < $3::date
     ORDER BY ${orderByInsertion("DESC")}
     LIMIT 1`,
    [dsrId, tenantId, dateFrom],
  );

  return result.rowCount > 0 ? Number(result.rows[0].balance_after || 0) : 0;
}

export async function sumLatestDueBalances(client, tenantId) {
  const result = await client.query(
    `SELECT COALESCE(SUM(balance_after), 0)::NUMERIC AS total
     FROM (
       SELECT DISTINCT ON (dsr_id) balance_after
       FROM dsr_due_ledger
       WHERE tenant_id = $1
       ORDER BY dsr_id, ${orderByInsertion("DESC")}
     ) latest`,
    [tenantId],
  );
  return Number(result.rows[0].total || 0);
}

export async function listDsrDueBalances(client, tenantId) {
  const result = await client.query(
    `SELECT
       dsrs.id,
       dsrs.name AS dsr_name,
       dsrs.area,
       COALESCE(latest.balance_after, 0)::NUMERIC AS balance
     FROM dsrs
     LEFT JOIN LATERAL (
       SELECT balance_after
       FROM dsr_due_ledger
       WHERE dsr_id = dsrs.id AND tenant_id = dsrs.tenant_id
       ORDER BY ${orderByInsertion("DESC")}
       LIMIT 1
     ) latest ON true
     WHERE dsrs.tenant_id = $1
       AND dsrs.deleted_at IS NULL
       AND dsrs.status = 'ACTIVE'
     ORDER BY balance DESC`,
    [tenantId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    dsrName: row.dsr_name,
    area: row.area,
    balance: Number(row.balance || 0),
  }));
}

export { mapDueLedgerEntry };
