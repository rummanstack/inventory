export function mapRetailCashSession(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    openedById: row.opened_by,
    openedByName: row.opened_by_name || null,
    closedById: row.closed_by,
    closedByName: row.closed_by_name || null,
    startedAt: row.started_at,
    closedAt: row.closed_at,
    openingCash: Number(row.opening_cash || 0),
    countedCash: row.counted_cash === null || row.counted_cash === undefined ? null : Number(row.counted_cash),
    cashSalesCount: Number(row.cash_sales_count || 0),
    cashSalesAmount: Number(row.cash_sales_amount || 0),
    expectedCash: Number(row.expected_cash || 0),
    variance: Number(row.variance || 0),
    note: row.note || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isOpen: row.closed_at === null || row.closed_at === undefined,
  };
}

export async function countRetailCashSessions(client, { tenantId, dateFrom, dateTo }) {
  const params = [tenantId];
  const conditions = ['rcs.tenant_id = $1'];

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`rcs.started_at >= $${params.length}::date`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`rcs.started_at < ($${params.length}::date + INTERVAL '1 day')`);
  }

  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count FROM retail_cash_sessions rcs WHERE ${conditions.join(' AND ')}`,
    params,
  );
  return result.rows[0].count;
}

export async function listRetailCashSessionsPage(client, { tenantId, dateFrom, dateTo, limit, offset }) {
  const params = [tenantId];
  const conditions = ['rcs.tenant_id = $1'];

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`rcs.started_at >= $${params.length}::date`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`rcs.started_at < ($${params.length}::date + INTERVAL '1 day')`);
  }

  params.push(limit, offset);
  const result = await client.query(
    `SELECT rcs.*,
            uo.name AS opened_by_name,
            uc.name AS closed_by_name
     FROM retail_cash_sessions rcs
     LEFT JOIN users uo ON uo.id = rcs.opened_by
     LEFT JOIN users uc ON uc.id = rcs.closed_by
     WHERE ${conditions.join(' AND ')}
     ORDER BY rcs.started_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapRetailCashSession);
}

export async function findActiveRetailCashSession(client, tenantId) {
  return client.query(
    `SELECT *
     FROM retail_cash_sessions
     WHERE tenant_id = $1 AND closed_at IS NULL
     ORDER BY started_at DESC, created_at DESC
     LIMIT 1`,
    [tenantId],
  );
}

export async function findRetailCashSessionById(client, sessionId, tenantId) {
  return client.query(
    `SELECT *
     FROM retail_cash_sessions
     WHERE id = $1 AND tenant_id = $2
     LIMIT 1`,
    [sessionId, tenantId],
  );
}

export async function insertRetailCashSession(client, session) {
  return client.query(
    `INSERT INTO retail_cash_sessions (
       id, tenant_id, opened_by, started_at, opening_cash, cash_sales_count,
       cash_sales_amount, expected_cash, variance, note
     )
     VALUES ($1, $2, $3, NOW(), $4, 0, 0, $4, 0, $5)
     RETURNING *`,
    [
      session.id,
      session.tenantId,
      session.openedById,
      session.openingCash,
      session.note,
    ],
  );
}

export async function closeRetailCashSession(client, session) {
  return client.query(
    `UPDATE retail_cash_sessions
     SET closed_by = $3,
         closed_at = $4,
         counted_cash = $5,
         cash_sales_count = $6,
         cash_sales_amount = $7,
         expected_cash = $8,
         variance = $9,
         updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND closed_at IS NULL
     RETURNING *`,
    [
      session.id,
      session.tenantId,
      session.closedById,
      session.closedAt,
      session.countedCash,
      session.cashSalesCount,
      session.cashSalesAmount,
      session.expectedCash,
      session.variance,
    ],
  );
}

export async function getRetailCashSessionSalesSummary(client, { tenantId, startedAt, endedAt }) {
  const result = await client.query(
    `SELECT
       COUNT(*)::INTEGER AS cash_sale_count,
       COALESCE(SUM(paid_amount), 0) AS cash_sales_amount
     FROM sales_invoices
     WHERE tenant_id = $1
       AND deleted_at IS NULL
       AND payment_method = 'CASH'
       AND created_at >= $2::timestamptz
       AND created_at < $3::timestamptz`,
    [tenantId, startedAt, endedAt],
  );

  return {
    cashSalesCount: Number(result.rows[0].cash_sale_count || 0),
    cashSalesAmount: Number(result.rows[0].cash_sales_amount || 0),
  };
}
