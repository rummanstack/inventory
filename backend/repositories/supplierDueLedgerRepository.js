function mapSupplierDueLedgerEntry(row) {
  return {
    id: row.id,
    organizationId: row.tenant_id,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name || null,
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

function buildFilterClause({ tenantId, supplierId, dateFrom, dateTo }, params) {
  params.push(tenantId);
  const conditions = [`supplier_due_ledger.tenant_id = $${params.length}`];

  if (supplierId) {
    params.push(supplierId);
    conditions.push(`supplier_due_ledger.supplier_id = $${params.length}`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`supplier_due_ledger.created_at >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`supplier_due_ledger.created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }

  return `WHERE ${conditions.join(" AND ")}`;
}

function buildSelect() {
  return `SELECT
      supplier_due_ledger.*,
      suppliers.name AS supplier_name,
      users.name AS created_by_name,
      users.email AS created_by_email,
      users.role AS created_by_role
    FROM supplier_due_ledger
    LEFT JOIN suppliers
      ON suppliers.id = supplier_due_ledger.supplier_id
      AND suppliers.tenant_id = supplier_due_ledger.tenant_id
    LEFT JOIN users
      ON users.id = supplier_due_ledger.created_by`;
}

function orderByLedger(direction) {
  const sort = direction === "ASC" ? "ASC" : "DESC";
  return `supplier_due_ledger.created_at ${sort},
          CASE supplier_due_ledger.type
            WHEN 'PURCHASE_DUE' THEN 10
            WHEN 'PAYMENT' THEN 20
            ELSE 30
          END ${sort},
          supplier_due_ledger.id ${sort}`;
}

export function insertSupplierDueLedgerEntry(client, entry) {
  return client.query(
    `INSERT INTO supplier_due_ledger (
       id,
       tenant_id,
       supplier_id,
       type,
       debit,
       credit,
       balance_after,
       reference_type,
       reference_id,
       note,
       created_by,
       created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, clock_timestamp())
     RETURNING *`,
    [
      entry.id,
      entry.organizationId,
      entry.supplierId,
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

export async function getLatestSupplierDueLedgerEntry(client, supplierId, tenantId) {
  const result = await client.query(
    `SELECT * FROM supplier_due_ledger
     WHERE supplier_id = $1 AND tenant_id = $2
     ORDER BY ${orderByLedger("DESC")}
     LIMIT 1`,
    [supplierId, tenantId],
  );
  return result.rowCount > 0 ? mapSupplierDueLedgerEntry(result.rows[0]) : null;
}

export async function getFirstSupplierDueLedgerEntryForReference(client, { tenantId, supplierId, referenceType, referenceId }) {
  const result = await client.query(
    `SELECT * FROM supplier_due_ledger
     WHERE tenant_id = $1
       AND supplier_id = $2
       AND reference_type = $3
       AND reference_id = $4
     ORDER BY ${orderByLedger("ASC")}
     LIMIT 1`,
    [tenantId, supplierId, referenceType, referenceId],
  );
  return result.rowCount > 0 ? mapSupplierDueLedgerEntry(result.rows[0]) : null;
}

export async function countSupplierDueLedgerEntries(client, filters = {}) {
  const params = [];
  const where = buildFilterClause(filters, params);
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM supplier_due_ledger ${where}`, params);
  return result.rows[0].count;
}

export async function listSupplierDueLedgerPage(client, { tenantId, supplierId, dateFrom, dateTo, limit, offset }) {
  const params = [];
  const where = buildFilterClause({ tenantId, supplierId, dateFrom, dateTo }, params);
  params.push(limit, offset);
  const result = await client.query(
    `${buildSelect()}
     ${where}
     ORDER BY ${orderByLedger("DESC")}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return result.rows.map(mapSupplierDueLedgerEntry);
}

export async function listSupplierDueLedgerInRange(client, { tenantId, supplierId, dateFrom, dateTo }) {
  const params = [];
  const where = buildFilterClause({ tenantId, supplierId, dateFrom, dateTo }, params);
  const result = await client.query(
    `${buildSelect()}
     ${where}
     ORDER BY ${orderByLedger("ASC")}`,
    params,
  );

  return result.rows.map(mapSupplierDueLedgerEntry);
}

export async function getSupplierBalanceBefore(client, { tenantId, supplierId, dateFrom }) {
  if (!dateFrom) {
    return 0;
  }

  const result = await client.query(
    `SELECT balance_after FROM supplier_due_ledger
     WHERE supplier_id = $1 AND tenant_id = $2 AND created_at < $3::date
     ORDER BY ${orderByLedger("DESC")}
     LIMIT 1`,
    [supplierId, tenantId, dateFrom],
  );

  return result.rowCount > 0 ? Number(result.rows[0].balance_after || 0) : 0;
}

export { mapSupplierDueLedgerEntry };
