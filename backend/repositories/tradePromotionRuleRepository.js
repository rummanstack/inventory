export function mapTradePromotionRule(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    remarks: row.remarks || '',

    supplierScope: row.supplier_scope,
    supplierId: row.supplier_id || null,
    supplierName: row.supplier_name || null,

    targetType: row.target_type,
    targetId: row.target_id || null,
    targetName: row.target_name || null,

    buyUnit: row.buy_unit,
    buyQuantity: Number(row.buy_quantity || 0),

    rewardType: row.reward_type,
    rewardUnit: row.reward_unit || null,
    rewardQuantity: Number(row.reward_quantity || 0),
    rewardAmount: Number(row.reward_amount || 0),
    rewardPercentage: Number(row.reward_percentage || 0),

    settlementMethod: row.settlement_method,
    effectiveFrom: row.effective_from || null,
    effectiveTo: row.effective_to || null,
    active: row.active === true,
    priority: Number(row.priority || 100),

    createdById: row.created_by,
    createdByName: row.created_by_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTrashedTradePromotionRule(row) {
  return {
    ...mapTradePromotionRule(row),
    deletedAt: row.deleted_at,
    deletedById: row.deleted_by_id,
    deletedByName: row.deleted_by_name || null,
    deleteReason: row.delete_reason || '',
  };
}

const BASE_JOINS = `
  LEFT JOIN suppliers s ON s.id = tpr.supplier_id
  LEFT JOIN products tp ON tpr.target_type = 'PRODUCT' AND tp.id = tpr.target_id
  LEFT JOIN categories tc ON tpr.target_type = 'CATEGORY' AND tc.id = tpr.target_id
  LEFT JOIN users creator ON creator.id = tpr.created_by
`;

const BASE_SELECT = `
  tpr.*,
  s.name AS supplier_name,
  COALESCE(tp.name, tc.name) AS target_name,
  creator.name AS created_by_name
`;

function buildFilters({ search, supplierId, targetType, active, tenantId }) {
  const params = [tenantId];
  const conditions = ["tpr.tenant_id = $1", "tpr.deleted_at IS NULL"];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(tpr.name ILIKE $${params.length} OR s.name ILIKE $${params.length})`);
  }

  if (supplierId) {
    params.push(supplierId);
    conditions.push(`tpr.supplier_id = $${params.length}`);
  }

  if (targetType) {
    params.push(targetType);
    conditions.push(`tpr.target_type = $${params.length}`);
  }

  if (active !== undefined && active !== null && active !== '') {
    params.push(active === true || active === 'true');
    conditions.push(`tpr.active = $${params.length}`);
  }

  return { params, where: `WHERE ${conditions.join(" AND ")}` };
}

export async function countTradePromotionRules(client, filters = {}) {
  const { params, where } = buildFilters(filters);
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count FROM trade_promotion_rules tpr ${BASE_JOINS} ${where}`,
    params,
  );
  return result.rows[0].count;
}

export async function listTradePromotionRulesPage(client, { limit, offset, ...filters }) {
  const { params, where } = buildFilters(filters);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT ${BASE_SELECT} FROM trade_promotion_rules tpr ${BASE_JOINS}
     ${where}
     ORDER BY tpr.active DESC, tpr.priority ASC, tpr.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapTradePromotionRule);
}

export function findTradePromotionRuleById(client, id, tenantId) {
  return client.query(
    `SELECT ${BASE_SELECT} FROM trade_promotion_rules tpr ${BASE_JOINS}
     WHERE tpr.id = $1 AND tpr.tenant_id = $2 AND tpr.deleted_at IS NULL`,
    [id, tenantId],
  );
}

export function findTradePromotionRuleForUpdate(client, id, tenantId) {
  return client.query(
    "SELECT * FROM trade_promotion_rules WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE",
    [id, tenantId],
  );
}

// The engine's candidate-fetch query — mirrors listActiveRetailPromotionsForDate.
// Supplier-scope and per-item target matching happen in-memory afterward
// (lib/tradePromotionEngine.js), since target matching needs each purchase
// line's product, not just the rule row itself.
export async function listActiveTradePromotionRulesForDate(client, tenantId, purchaseDate) {
  const result = await client.query(
    `SELECT * FROM trade_promotion_rules tpr
     WHERE tpr.tenant_id = $1
       AND tpr.deleted_at IS NULL
       AND tpr.active = TRUE
       AND (tpr.effective_from IS NULL OR tpr.effective_from <= $2::date)
       AND (tpr.effective_to IS NULL OR tpr.effective_to >= $2::date)
     ORDER BY tpr.priority ASC, tpr.created_at ASC`,
    [tenantId, purchaseDate],
  );
  return result.rows.map(mapTradePromotionRule);
}

export function insertTradePromotionRule(client, rule) {
  return client.query(
    `WITH inserted AS (
      INSERT INTO trade_promotion_rules (
        id, tenant_id, name, remarks, supplier_scope, supplier_id, target_type, target_id,
        buy_unit, buy_quantity, reward_type, reward_unit, reward_quantity, reward_amount,
        reward_percentage, settlement_method, effective_from, effective_to, active, priority,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    )
    SELECT ${BASE_SELECT} FROM inserted tpr ${BASE_JOINS}`,
    [
      rule.id,
      rule.tenantId,
      rule.name,
      rule.remarks,
      rule.supplierScope,
      rule.supplierId,
      rule.targetType,
      rule.targetId,
      rule.buyUnit,
      rule.buyQuantity,
      rule.rewardType,
      rule.rewardUnit,
      rule.rewardQuantity,
      rule.rewardAmount,
      rule.rewardPercentage,
      rule.settlementMethod,
      rule.effectiveFrom,
      rule.effectiveTo,
      rule.active,
      rule.priority,
      rule.createdById,
    ],
  );
}

export function updateTradePromotionRule(client, rule) {
  return client.query(
    `WITH updated AS (
       UPDATE trade_promotion_rules
       SET name = $3, remarks = $4, supplier_scope = $5, supplier_id = $6, target_type = $7,
           target_id = $8, buy_unit = $9, buy_quantity = $10, reward_type = $11,
           reward_unit = $12, reward_quantity = $13, reward_amount = $14,
           reward_percentage = $15, settlement_method = $16, effective_from = $17,
           effective_to = $18, active = $19, priority = $20, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *
     )
     SELECT ${BASE_SELECT} FROM updated tpr ${BASE_JOINS}`,
    [
      rule.id,
      rule.tenantId,
      rule.name,
      rule.remarks,
      rule.supplierScope,
      rule.supplierId,
      rule.targetType,
      rule.targetId,
      rule.buyUnit,
      rule.buyQuantity,
      rule.rewardType,
      rule.rewardUnit,
      rule.rewardQuantity,
      rule.rewardAmount,
      rule.rewardPercentage,
      rule.settlementMethod,
      rule.effectiveFrom,
      rule.effectiveTo,
      rule.active,
      rule.priority,
    ],
  );
}

export function softDeleteTradePromotionRule(client, id, tenantId, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE trade_promotion_rules
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [id, tenantId, deletedById || null, deleteReason || ""],
  );
}

export function restoreTradePromotionRule(client, id, tenantId) {
  return client.query(
    `UPDATE trade_promotion_rules
     SET deleted_at = NULL, deleted_by_id = NULL, delete_reason = ''
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL
     RETURNING *`,
    [id, tenantId],
  );
}

export function permanentlyDeleteTradePromotionRule(client, id, tenantId) {
  return client.query(
    "DELETE FROM trade_promotion_rules WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL",
    [id, tenantId],
  );
}

export async function countTrashedTradePromotionRules(client, tenantId) {
  const result = await client.query(
    "SELECT COUNT(*)::INTEGER AS count FROM trade_promotion_rules WHERE tenant_id = $1 AND deleted_at IS NOT NULL",
    [tenantId],
  );
  return result.rows[0].count;
}

export async function listTrashedTradePromotionRules(client, { tenantId, limit, offset }) {
  const result = await client.query(
    `SELECT ${BASE_SELECT}, u.name AS deleted_by_name
     FROM trade_promotion_rules tpr ${BASE_JOINS}
     LEFT JOIN users u ON u.id = tpr.deleted_by_id
     WHERE tpr.tenant_id = $1 AND tpr.deleted_at IS NOT NULL
     ORDER BY tpr.deleted_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return result.rows.map(mapTrashedTradePromotionRule);
}

// Guards permanent delete — a rule referenced by any earning (settled or not)
// must never be permanently removed, since the earning's audit trail points
// back to it by id (ON DELETE RESTRICT on the FK backs this up at the DB
// level too; this just gives a friendlier error before hitting that).
export async function countEarningsReferencingRule(client, ruleId, tenantId) {
  const result = await client.query(
    "SELECT COUNT(*)::INTEGER AS count FROM trade_promotion_earnings WHERE rule_id = $1 AND tenant_id = $2",
    [ruleId, tenantId],
  );
  return result.rows[0].count;
}
