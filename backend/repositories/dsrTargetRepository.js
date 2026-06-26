export function mapDsrTarget(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    dsrId: row.dsr_id,
    month: row.month,
    targetAmount: Number(row.target_amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function upsertDsrTarget(client, target) {
  const result = await client.query(
    `INSERT INTO dsr_targets (id, tenant_id, dsr_id, month, target_amount, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
     ON CONFLICT (tenant_id, dsr_id, month) DO UPDATE
       SET target_amount=$5, updated_at=NOW()
     RETURNING *`,
    [target.id, target.tenantId, target.dsrId, target.month, target.targetAmount],
  );
  return mapDsrTarget(result.rows[0]);
}

export async function getTargetsByMonth(client, tenantId, month) {
  const result = await client.query(
    `SELECT * FROM dsr_targets WHERE tenant_id=$1 AND month=$2`,
    [tenantId, month],
  );
  return result.rows.map(mapDsrTarget);
}

// Returns one row per DSR that has either a target or a settlement in the month.
export async function getMonthlySummary(client, tenantId, month) {
  const result = await client.query(
    `SELECT
       COALESCE(t.dsr_id, s.dsr_id)       AS dsr_id,
       d.name                              AS dsr_name,
       COALESCE(t.target_amount, 0)        AS target_amount,
       COALESCE(s.actual_amount, 0)        AS actual_amount
     FROM
       (SELECT dsr_id, target_amount FROM dsr_targets
        WHERE tenant_id=$1 AND month=$2) t
     FULL OUTER JOIN
       (SELECT dsr_id, SUM(amount_paid) AS actual_amount
        FROM settlements
        WHERE tenant_id=$1
          AND TO_CHAR(settlement_date, 'YYYY-MM') = $2
          AND status != 'CANCELLED'
        GROUP BY dsr_id) s
     ON t.dsr_id = s.dsr_id
     LEFT JOIN dsrs d ON d.id = COALESCE(t.dsr_id, s.dsr_id)`,
    [tenantId, month],
  );
  return result.rows.map((row) => ({
    dsrId: row.dsr_id,
    dsrName: row.dsr_name ?? row.dsr_id,
    targetAmount: Number(row.target_amount),
    actualAmount: Number(row.actual_amount),
  }));
}
