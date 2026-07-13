export function mapLateFeeRule(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    feeType: row.fee_type,
    feeValue: Number(row.fee_value || 0),
    gracePeriodDays: Number(row.grace_period_days || 0),
    maxPenaltyAmount: Number(row.max_penalty_amount || 0),
    active: row.active,
    createdById: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function insertLateFeeRule(client, rule) {
  const result = await client.query(
    `INSERT INTO installment_late_fee_rules (
       id, tenant_id, fee_type, fee_value, grace_period_days, max_penalty_amount, active, created_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [rule.id, rule.tenantId, rule.feeType, rule.feeValue, rule.gracePeriodDays, rule.maxPenaltyAmount, rule.active, rule.createdById],
  );
  return mapLateFeeRule(result.rows[0]);
}

export async function listLateFeeRules(client, tenantId) {
  const result = await client.query(
    `SELECT * FROM installment_late_fee_rules WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
    [tenantId],
  );
  return result.rows.map(mapLateFeeRule);
}

// The engine only ever needs one rule to price a given overdue installment —
// the most recently created active rule wins if a tenant somehow has several.
export async function findActiveLateFeeRule(client, tenantId) {
  const result = await client.query(
    `SELECT * FROM installment_late_fee_rules
     WHERE tenant_id = $1 AND active = true AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [tenantId],
  );
  return result.rowCount > 0 ? mapLateFeeRule(result.rows[0]) : null;
}

export async function findLateFeeRuleById(client, ruleId, tenantId) {
  return client.query(
    `SELECT * FROM installment_late_fee_rules WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1`,
    [ruleId, tenantId],
  );
}

export async function updateLateFeeRule(client, ruleId, tenantId, { feeType, feeValue, gracePeriodDays, maxPenaltyAmount, active }) {
  const result = await client.query(
    `UPDATE installment_late_fee_rules
     SET fee_type = $3, fee_value = $4, grace_period_days = $5, max_penalty_amount = $6, active = $7, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [ruleId, tenantId, feeType, feeValue, gracePeriodDays, maxPenaltyAmount, active],
  );
  return result.rowCount > 0 ? mapLateFeeRule(result.rows[0]) : null;
}
