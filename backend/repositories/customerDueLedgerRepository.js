function mapCustomerDueLedgerEntry(row) {
  return {
    id: row.id,
    organizationId: row.tenant_id,
    customerId: row.customer_id,
    customerName: row.customer_name || null,
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

function buildFilterClause({ tenantId, customerId, dateFrom, dateTo }, params) {
  params.push(tenantId);
  const conditions = [`customer_due_ledger.tenant_id = $${params.length}`];

  if (customerId) {
    params.push(customerId);
    conditions.push(`customer_due_ledger.customer_id = $${params.length}`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`COALESCE(customer_due_ledger.business_date, customer_due_ledger.created_at::date) >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`COALESCE(customer_due_ledger.business_date, customer_due_ledger.created_at::date) <= $${params.length}::date`);
  }

  return `WHERE ${conditions.join(" AND ")}`;
}

function buildSelect() {
  return `SELECT
      customer_due_ledger.*,
      retail_customers.name AS customer_name,
      users.name AS created_by_name,
      users.email AS created_by_email,
      users.role AS created_by_role
    FROM customer_due_ledger
    LEFT JOIN retail_customers
      ON retail_customers.id = customer_due_ledger.customer_id
      AND retail_customers.tenant_id = customer_due_ledger.tenant_id
    LEFT JOIN users
      ON users.id = customer_due_ledger.created_by`;
}

// True insertion order — used wherever the "latest balance" must reflect the most recently
// processed entry (the base for the next posting, and what current_due is kept in sync with).
// Must NOT switch to business date: a backdated entry's balanceAfter was computed from the
// balance at insertion time, not from the historical balance on its business date.
function orderByInsertion(direction) {
  const sort = direction === "ASC" ? "ASC" : "DESC";
  return `customer_due_ledger.created_at ${sort},
          CASE customer_due_ledger.type
            WHEN 'SALE_DUE' THEN 10
            WHEN 'COLLECTION' THEN 20
            ELSE 30
          END ${sort},
          customer_due_ledger.id ${sort}`;
}

// Human-facing ordering for statements/reports — by business date, with insertion time only
// as a tiebreaker for same-day entries.
function orderByBusinessDate(direction) {
  const sort = direction === "ASC" ? "ASC" : "DESC";
  return `COALESCE(customer_due_ledger.business_date, customer_due_ledger.created_at::date) ${sort},
          customer_due_ledger.created_at ${sort},
          CASE customer_due_ledger.type
            WHEN 'SALE_DUE' THEN 10
            WHEN 'COLLECTION' THEN 20
            ELSE 30
          END ${sort},
          customer_due_ledger.id ${sort}`;
}

export function insertCustomerDueLedgerEntry(client, entry) {
  return client.query(
    `INSERT INTO customer_due_ledger (
       id,
       tenant_id,
       customer_id,
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
      entry.customerId,
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

export async function getLatestCustomerDueLedgerEntry(client, customerId, tenantId) {
  const result = await client.query(
    `SELECT * FROM customer_due_ledger
     WHERE customer_id = $1 AND tenant_id = $2
     ORDER BY ${orderByInsertion("DESC")}
     LIMIT 1`,
    [customerId, tenantId],
  );
  return result.rowCount > 0 ? mapCustomerDueLedgerEntry(result.rows[0]) : null;
}

export async function countCustomerDueLedgerEntries(client, filters = {}) {
  const params = [];
  const where = buildFilterClause(filters, params);
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM customer_due_ledger ${where}`, params);
  return result.rows[0].count;
}

export async function listCustomerDueLedgerPage(client, { tenantId, customerId, dateFrom, dateTo, limit, offset }) {
  const params = [];
  const where = buildFilterClause({ tenantId, customerId, dateFrom, dateTo }, params);
  params.push(limit, offset);
  const result = await client.query(
    `${buildSelect()}
     ${where}
     ORDER BY ${orderByInsertion("DESC")}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return result.rows.map(mapCustomerDueLedgerEntry);
}

export async function listCustomerDueLedgerInRange(client, { tenantId, customerId, dateFrom, dateTo }) {
  const params = [];
  const where = buildFilterClause({ tenantId, customerId, dateFrom, dateTo }, params);
  const result = await client.query(
    `${buildSelect()}
     ${where}
     ORDER BY ${orderByInsertion("DESC")}`,
    params,
  );

  return result.rows.map(mapCustomerDueLedgerEntry);
}

export async function getCustomerBalanceBefore(client, { tenantId, customerId, dateFrom }) {
  if (!dateFrom) {
    return 0;
  }

  const result = await client.query(
    `SELECT balance_after FROM customer_due_ledger
     WHERE customer_id = $1 AND tenant_id = $2
       AND COALESCE(business_date, created_at::date) < $3::date
     ORDER BY ${orderByBusinessDate("DESC")}
     LIMIT 1`,
    [customerId, tenantId, dateFrom],
  );

  return result.rowCount > 0 ? Number(result.rows[0].balance_after || 0) : 0;
}

export async function sumLatestCustomerDueBalances(client, tenantId) {
  const result = await client.query(
    `SELECT COALESCE(SUM(balance_after), 0)::NUMERIC AS total
     FROM (
       SELECT DISTINCT ON (customer_id) balance_after
       FROM customer_due_ledger
       WHERE tenant_id = $1
       ORDER BY customer_id, ${orderByInsertion("DESC")}
     ) latest`,
    [tenantId],
  );
  return Number(result.rows[0].total || 0);
}

export async function getCustomerDueReport(client, tenantId) {
  const result = await client.query(
    `SELECT rc.id AS customer_id,
            rc.name AS customer_name,
            rc.phone,
            rc.current_due
     FROM retail_customers rc
     WHERE rc.tenant_id = $1 AND rc.deleted_at IS NULL AND rc.current_due > 0
     ORDER BY rc.current_due DESC`,
    [tenantId],
  );
  return result.rows.map((r) => ({
    customerId: r.customer_id,
    customerName: r.customer_name,
    phone: r.phone || '',
    currentDue: Number(r.current_due || 0),
  }));
}

export { mapCustomerDueLedgerEntry };
