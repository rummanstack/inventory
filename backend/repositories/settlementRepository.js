export function mapSettlement(row) {
  return {
    id: row.id,
    date: row.settlement_date,
    dsrId: row.dsr_id,
    dsrName: row.dsr_name,
    area: row.area,
    phone: row.phone,
    issueIds: row.issue_ids,
    items: row.items,
    extraReturns: row.extra_returns || [],
    totalPayable: Number(row.total_payable),
    previousDue: Number(row.previous_due || 0),
    discount: Number(row.discount || 0),
    extraReturnValue: Number(row.extra_return_value || 0),
    amountPaid: Number(row.amount_paid || 0),
    dueAmount: Number(row.due_amount || 0),
    status: row.status,
  };
}

function buildSettlementFilterClause({ tenantId, dsrId, dateFrom, dateTo, search }, params) {
  params.push(tenantId);
  const conditions = [`tenant_id = $${params.length}`];

  if (dsrId) {
    params.push(dsrId);
    conditions.push(`dsr_id = $${params.length}`);
  }
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`settlement_date >= $${params.length}`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`settlement_date <= $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(dsr_name ILIKE $${params.length} OR area ILIKE $${params.length})`);
  }

  return `WHERE ${conditions.join(" AND ")}`;
}

export async function countSettlements(client, filters = {}) {
  const params = [];
  const where = buildSettlementFilterClause(filters, params);
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM settlements ${where}`, params);
  return result.rows[0].count;
}

export async function listSettlementsPage(client, { tenantId, dsrId, dateFrom, dateTo, search, limit, offset }) {
  const params = [];
  const where = buildSettlementFilterClause({ tenantId, dsrId, dateFrom, dateTo, search }, params);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT * FROM settlements ${where} ORDER BY settlement_date DESC, created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapSettlement);
}

export function insertSettlement(client, settlement) {
  return client.query(
    `INSERT INTO settlements (id, tenant_id, settlement_date, dsr_id, dsr_name, area, phone, issue_ids, items, extra_returns, total_payable, previous_due, discount, extra_return_value, amount_paid, due_amount, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12, $13, $14, $15, $16, $17)
     RETURNING *`,
    [
      settlement.id,
      settlement.tenantId,
      settlement.date,
      settlement.dsrId,
      settlement.dsrName,
      settlement.area,
      settlement.phone,
      JSON.stringify(settlement.issueIds),
      JSON.stringify(settlement.items),
      JSON.stringify(settlement.extraReturns || []),
      settlement.totalPayable,
      settlement.previousDue,
      settlement.discount,
      settlement.extraReturnValue,
      settlement.amountPaid,
      settlement.dueAmount,
      settlement.status,
    ],
  );
}

export function updateSettlement(client, settlement) {
  return client.query(
    `UPDATE settlements
     SET settlement_date = $3, dsr_id = $4, dsr_name = $5, area = $6, phone = $7, issue_ids = $8::jsonb, items = $9::jsonb, extra_returns = $10::jsonb, total_payable = $11, previous_due = $12, discount = $13, extra_return_value = $14, amount_paid = $15, due_amount = $16, status = $17
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [
      settlement.id,
      settlement.tenantId,
      settlement.date,
      settlement.dsrId,
      settlement.dsrName,
      settlement.area,
      settlement.phone,
      JSON.stringify(settlement.issueIds),
      JSON.stringify(settlement.items),
      JSON.stringify(settlement.extraReturns || []),
      settlement.totalPayable,
      settlement.previousDue,
      settlement.discount,
      settlement.extraReturnValue,
      settlement.amountPaid,
      settlement.dueAmount,
      settlement.status,
    ],
  );
}

export function findSettlementById(client, settlementId, tenantId) {
  return client.query("SELECT * FROM settlements WHERE id = $1 AND tenant_id = $2 LIMIT 1", [settlementId, tenantId]);
}

export function findSettlementByDateAndDsr(client, date, dsrId, tenantId) {
  return client.query(
    "SELECT * FROM settlements WHERE settlement_date = $1 AND dsr_id = $2 AND tenant_id = $3 LIMIT 1",
    [date, dsrId, tenantId],
  );
}

export function findLatestSettlementForDsr(client, dsrId, tenantId) {
  return client.query(
    "SELECT * FROM settlements WHERE dsr_id = $1 AND tenant_id = $2 ORDER BY settlement_date DESC, created_at DESC LIMIT 1",
    [dsrId, tenantId],
  );
}

export function findDuplicateSettlement(client, date, dsrId, settlementId, tenantId) {
  return client.query(
    "SELECT id FROM settlements WHERE settlement_date = $1 AND dsr_id = $2 AND id <> $3 AND tenant_id = $4 LIMIT 1",
    [date, dsrId, settlementId, tenantId],
  );
}

export async function sumSettlementsInRange(client, tenantId, dateFrom, dateTo) {
  const result = await client.query(
    `SELECT
       COUNT(*)::INTEGER AS count,
       COALESCE(SUM(total_payable), 0) AS total_payable,
       COALESCE(SUM(amount_paid), 0) AS amount_paid,
       COALESCE(SUM(due_amount), 0) AS due_amount
     FROM settlements
     WHERE tenant_id = $1
       AND settlement_date >= $2
       AND settlement_date < $3`,
    [tenantId, dateFrom, dateTo],
  );
  return {
    count: result.rows[0].count,
    totalPayable: Number(result.rows[0].total_payable || 0),
    amountPaid: Number(result.rows[0].amount_paid || 0),
    dueAmount: Number(result.rows[0].due_amount || 0),
  };
}

export async function listRecentSettlements(client, tenantId, limit) {
  const result = await client.query(
    `SELECT id, settlement_date, dsr_name, area, total_payable, amount_paid, due_amount, status
     FROM settlements
     WHERE tenant_id = $1
     ORDER BY settlement_date DESC, created_at DESC
     LIMIT $2`,
    [tenantId, limit],
  );
  return result.rows.map((row) => ({
    id: row.id,
    date: row.settlement_date,
    dsrName: row.dsr_name,
    area: row.area,
    totalPayable: Number(row.total_payable || 0),
    amountPaid: Number(row.amount_paid || 0),
    dueAmount: Number(row.due_amount || 0),
    status: row.status,
  }));
}
