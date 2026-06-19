export function mapRetailLoyaltyLedgerEntry(row) {
  return {
    id: row.id,
    organizationId: row.tenant_id,
    customerId: row.customer_id,
    type: row.type,
    pointsDelta: Number(row.points_delta || 0),
    balanceAfter: Number(row.balance_after || 0),
    referenceType: row.reference_type,
    referenceId: row.reference_id || null,
    note: row.note || '',
    createdById: row.created_by,
    businessDate: row.business_date || null,
    createdAt: row.created_at,
  };
}

export function insertRetailLoyaltyLedgerEntry(client, entry) {
  return client.query(
    `INSERT INTO retail_loyalty_ledger (
      id, tenant_id, customer_id, type, points_delta, balance_after,
      reference_type, reference_id, note, created_by, business_date
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      entry.id,
      entry.tenantId,
      entry.customerId,
      entry.type,
      entry.pointsDelta,
      entry.balanceAfter,
      entry.referenceType,
      entry.referenceId || null,
      entry.note || '',
      entry.createdById || null,
      entry.businessDate || null,
    ],
  );
}

export function getLatestRetailLoyaltyLedgerEntry(client, customerId, tenantId) {
  return client.query(
    `SELECT *
     FROM retail_loyalty_ledger
     WHERE customer_id = $1 AND tenant_id = $2
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [customerId, tenantId],
  );
}
