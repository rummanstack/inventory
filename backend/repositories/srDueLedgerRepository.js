function mapSrDueLedgerEntry(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    srId: row.sr_id,
    srName: row.sr_name || null,
    type: row.type,
    debit: Number(row.debit || 0),
    credit: Number(row.credit || 0),
    balanceAfter: Number(row.balance_after || 0),
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    note: row.note,
    createdById: row.created_by,
    createdByName: row.created_by_name || null,
    businessDate: row.business_date,
    createdAt: row.created_at,
  };
}

function buildFilterClause({ tenantId, srId, dateFrom, dateTo }, params) {
  params.push(tenantId);
  const conditions = [`sr_due_ledger.tenant_id = $${params.length}`];

  if (srId) {
    params.push(srId);
    conditions.push(`sr_due_ledger.sr_id = $${params.length}`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`COALESCE(sr_due_ledger.business_date, sr_due_ledger.created_at::date) >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`COALESCE(sr_due_ledger.business_date, sr_due_ledger.created_at::date) <= $${params.length}::date`);
  }

  return `WHERE ${conditions.join(" AND ")}`;
}

function buildSelect() {
  return `SELECT
      sr_due_ledger.*,
      srs.name AS sr_name,
      users.name AS created_by_name
    FROM sr_due_ledger
    LEFT JOIN srs
      ON srs.id = sr_due_ledger.sr_id
      AND srs.tenant_id = sr_due_ledger.tenant_id
    LEFT JOIN users
      ON users.id = sr_due_ledger.created_by`;
}

function orderByInsertion(direction) {
  const sort = direction === "ASC" ? "ASC" : "DESC";
  return `sr_due_ledger.created_at ${sort}, sr_due_ledger.id ${sort}`;
}

function orderByBusinessDate(direction) {
  const sort = direction === "ASC" ? "ASC" : "DESC";
  return `COALESCE(sr_due_ledger.business_date, sr_due_ledger.created_at::date) ${sort},
          sr_due_ledger.created_at ${sort},
          sr_due_ledger.id ${sort}`;
}

export function insertSrDueLedgerEntry(client, entry) {
  return client.query(
    `INSERT INTO sr_due_ledger (
       id, tenant_id, sr_id, type, debit, credit, balance_after,
       reference_type, reference_id, note, created_by, business_date, created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12::date, CURRENT_DATE), clock_timestamp())
     RETURNING *`,
    [
      entry.id,
      entry.tenantId,
      entry.srId,
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

export async function getLatestSrDueLedgerEntry(client, srId, tenantId) {
  const result = await client.query(
    `SELECT * FROM sr_due_ledger
     WHERE sr_id = $1 AND tenant_id = $2
     ORDER BY ${orderByInsertion("DESC")}
     LIMIT 1`,
    [srId, tenantId],
  );
  return result.rowCount > 0 ? mapSrDueLedgerEntry(result.rows[0]) : null;
}

export async function countSrDueLedgerEntries(client, filters = {}) {
  const params = [];
  const where = buildFilterClause(filters, params);
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM sr_due_ledger ${where}`, params);
  return result.rows[0].count;
}

export async function listSrDueLedgerPage(client, { tenantId, srId, dateFrom, dateTo, limit, offset }) {
  const params = [];
  const where = buildFilterClause({ tenantId, srId, dateFrom, dateTo }, params);
  params.push(limit, offset);
  const result = await client.query(
    `${buildSelect()}
     ${where}
     ORDER BY ${orderByInsertion("DESC")}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapSrDueLedgerEntry);
}

export async function listSrDueLedgerInRange(client, { tenantId, srId, dateFrom, dateTo }) {
  const params = [];
  const where = buildFilterClause({ tenantId, srId, dateFrom, dateTo }, params);
  const result = await client.query(
    `${buildSelect()}
     ${where}
     ORDER BY ${orderByInsertion("DESC")}`,
    params,
  );
  return result.rows.map(mapSrDueLedgerEntry);
}

export async function getBalanceBefore(client, { tenantId, srId, dateFrom }) {
  if (!dateFrom) {
    const result = await client.query(
      `SELECT
         (SELECT COUNT(*) FROM sr_due_ledger WHERE sr_id = $1 AND tenant_id = $2)::INTEGER AS entry_count,
         COALESCE(opening_due, 0) AS opening_due
       FROM srs WHERE id = $1 AND tenant_id = $2`,
      [srId, tenantId],
    );
    if (!result.rowCount) return 0;
    return result.rows[0].entry_count > 0 ? 0 : Number(result.rows[0].opening_due || 0);
  }

  // Use insertion order: balance_after is stamped at posting time, so the last
  // inserted pre-period entry holds the correct opening balance even when some
  // entries were backdated. Business-date order would pick the wrong row here.
  const result = await client.query(
    `SELECT balance_after FROM sr_due_ledger
     WHERE sr_id = $1 AND tenant_id = $2
       AND COALESCE(business_date, created_at::date) < $3::date
     ORDER BY ${orderByInsertion("DESC")}
     LIMIT 1`,
    [srId, tenantId, dateFrom],
  );

  return result.rowCount > 0 ? Number(result.rows[0].balance_after || 0) : 0;
}

export { mapSrDueLedgerEntry };
