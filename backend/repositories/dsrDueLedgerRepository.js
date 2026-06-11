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
    conditions.push(`dsr_due_ledger.created_at >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`dsr_due_ledger.created_at < ($${params.length}::date + INTERVAL '1 day')`);
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
       created_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
    ],
  );
}

export async function getLatestDueLedgerEntry(client, dsrId, tenantId) {
  const result = await client.query(
    `SELECT * FROM dsr_due_ledger WHERE dsr_id = $1 AND tenant_id = $2 ORDER BY created_at DESC, id DESC LIMIT 1`,
    [dsrId, tenantId],
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
     ORDER BY dsr_due_ledger.created_at DESC, dsr_due_ledger.id DESC
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
     ORDER BY dsr_due_ledger.created_at ASC, dsr_due_ledger.id ASC`,
    params,
  );

  return result.rows.map(mapDueLedgerEntry);
}

export async function getBalanceBefore(client, { tenantId, dsrId, dateFrom }) {
  if (!dateFrom) {
    return 0;
  }

  const result = await client.query(
    `SELECT balance_after FROM dsr_due_ledger
     WHERE dsr_id = $1 AND tenant_id = $2 AND created_at < $3::date
     ORDER BY created_at DESC, id DESC LIMIT 1`,
    [dsrId, tenantId, dateFrom],
  );

  return result.rowCount > 0 ? Number(result.rows[0].balance_after || 0) : 0;
}

export { mapDueLedgerEntry };
