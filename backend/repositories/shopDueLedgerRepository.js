function mapShopDueLedgerEntry(row) {
  return {
    id: row.id,
    organizationId: row.tenant_id,
    shopId: row.shop_id,
    shopName: row.shop_name || null,
    shopMarket: row.shop_market || null,
    type: row.type,
    debit: Number(row.debit || 0),
    credit: Number(row.credit || 0),
    balanceAfter: Number(row.balance_after || 0),
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    note: row.note,
    createdById: row.created_by,
    createdByName: row.created_by_name || null,
    createdByRole: row.created_by_role || null,
    businessDate: row.business_date,
    createdAt: row.created_at,
  };
}

function buildFilterClause({ tenantId, shopId, dateFrom, dateTo }, params) {
  params.push(tenantId);
  const conditions = [`shop_due_ledger.tenant_id = $${params.length}`];

  if (shopId) {
    params.push(shopId);
    conditions.push(`shop_due_ledger.shop_id = $${params.length}`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`COALESCE(shop_due_ledger.business_date, shop_due_ledger.created_at::date) >= $${params.length}::date`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`COALESCE(shop_due_ledger.business_date, shop_due_ledger.created_at::date) <= $${params.length}::date`);
  }

  return `WHERE ${conditions.join(" AND ")}`;
}

function buildSelect() {
  return `SELECT
      shop_due_ledger.*,
      customers.shop_name,
      customers.market AS shop_market,
      users.name AS created_by_name,
      users.role AS created_by_role
    FROM shop_due_ledger
    LEFT JOIN customers
      ON customers.id = shop_due_ledger.shop_id
      AND customers.tenant_id = shop_due_ledger.tenant_id
    LEFT JOIN users
      ON users.id = shop_due_ledger.created_by`;
}

// Insertion order for balance integrity — do not change to business date.
function orderByInsertion(direction) {
  const sort = direction === "ASC" ? "ASC" : "DESC";
  return `shop_due_ledger.created_at ${sort},
          CASE shop_due_ledger.type
            WHEN 'SALE_DUE' THEN 10
            WHEN 'COLLECTION' THEN 20
            ELSE 30
          END ${sort},
          shop_due_ledger.id ${sort}`;
}

// Human-facing ordering for statements.
function orderByBusinessDate(direction) {
  const sort = direction === "ASC" ? "ASC" : "DESC";
  return `COALESCE(shop_due_ledger.business_date, shop_due_ledger.created_at::date) ${sort},
          shop_due_ledger.created_at ${sort},
          CASE shop_due_ledger.type
            WHEN 'SALE_DUE' THEN 10
            WHEN 'COLLECTION' THEN 20
            ELSE 30
          END ${sort},
          shop_due_ledger.id ${sort}`;
}

export function insertShopDueLedgerEntry(client, entry) {
  return client.query(
    `INSERT INTO shop_due_ledger (
       id, tenant_id, shop_id, type, debit, credit, balance_after,
       reference_type, reference_id, note, created_by, business_date, created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12::date, CURRENT_DATE), clock_timestamp())
     RETURNING *`,
    [
      entry.id,
      entry.organizationId,
      entry.shopId,
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

export async function getLatestShopDueLedgerEntry(client, shopId, tenantId) {
  const result = await client.query(
    `SELECT * FROM shop_due_ledger
     WHERE shop_id = $1 AND tenant_id = $2
     ORDER BY ${orderByInsertion("DESC")}
     LIMIT 1`,
    [shopId, tenantId],
  );
  return result.rowCount > 0 ? mapShopDueLedgerEntry(result.rows[0]) : null;
}

export async function countShopDueLedgerEntries(client, filters = {}) {
  const params = [];
  const where = buildFilterClause(filters, params);
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count FROM shop_due_ledger ${where}`,
    params,
  );
  return result.rows[0].count;
}

export async function listShopDueLedgerPage(client, { tenantId, shopId, dateFrom, dateTo, limit, offset }) {
  const params = [];
  const where = buildFilterClause({ tenantId, shopId, dateFrom, dateTo }, params);
  params.push(limit, offset);
  const result = await client.query(
    `${buildSelect()}
     ${where}
     ORDER BY ${orderByInsertion("DESC")}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapShopDueLedgerEntry);
}

export async function listShopDueLedgerInRange(client, { tenantId, shopId, dateFrom, dateTo }) {
  const params = [];
  const where = buildFilterClause({ tenantId, shopId, dateFrom, dateTo }, params);
  const result = await client.query(
    `${buildSelect()}
     ${where}
     ORDER BY ${orderByInsertion("DESC")}`,
    params,
  );
  return result.rows.map(mapShopDueLedgerEntry);
}

export async function getShopBalanceBefore(client, { tenantId, shopId, dateFrom }) {
  if (!dateFrom) return 0;
  const result = await client.query(
    `SELECT balance_after FROM shop_due_ledger
     WHERE shop_id = $1 AND tenant_id = $2
       AND COALESCE(business_date, created_at::date) < $3::date
     ORDER BY ${orderByBusinessDate("DESC")}
     LIMIT 1`,
    [shopId, tenantId, dateFrom],
  );
  return result.rowCount > 0 ? Number(result.rows[0].balance_after || 0) : 0;
}

export { mapShopDueLedgerEntry };
