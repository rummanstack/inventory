export function mapDrugBatch(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    productId: row.product_id,
    productName: row.product_name || null,
    purchaseReceiptId: row.purchase_receipt_id || null,
    purchaseReceiptItemId: row.purchase_receipt_item_id || null,
    batchNumber: row.batch_number || '',
    lotNumber: row.lot_number || '',
    expiryDate: row.expiry_date || null,
    manufactureDate: row.manufacture_date || null,
    quantityReceived: Number(row.quantity_received || 0),
    quantityRemaining: Number(row.quantity_remaining || 0),
    purchasePrice: Number(row.purchase_price || 0),
    createdById: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function insertDrugBatch(client, batch) {
  return client.query(
    `INSERT INTO drug_batches (
       id, tenant_id, product_id, purchase_receipt_id, purchase_receipt_item_id,
       batch_number, lot_number, expiry_date, manufacture_date,
       quantity_received, quantity_remaining, purchase_price, created_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      batch.id,
      batch.tenantId,
      batch.productId,
      batch.purchaseReceiptId || null,
      batch.purchaseReceiptItemId || null,
      batch.batchNumber || '',
      batch.lotNumber || '',
      batch.expiryDate || null,
      batch.manufactureDate || null,
      batch.quantityReceived,
      batch.quantityRemaining,
      batch.purchasePrice,
      batch.createdById || null,
    ],
  );
}

export function listDrugBatchesByProduct(client, { tenantId, productId, activeOnly = false }) {
  const conditions = ['db.tenant_id = $1', 'db.product_id = $2'];
  const params = [tenantId, productId];
  if (activeOnly) {
    conditions.push('db.quantity_remaining > 0');
  }
  return client.query(
    `SELECT db.*, p.name AS product_name
     FROM drug_batches db
     LEFT JOIN products p ON p.id = db.product_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY db.expiry_date ASC NULLS LAST, db.created_at ASC`,
    params,
  );
}

export function listExpiringBatches(client, { tenantId, daysAhead = 90 }) {
  return client.query(
    `SELECT db.*, p.name AS product_name
     FROM drug_batches db
     LEFT JOIN products p ON p.id = db.product_id
     WHERE db.tenant_id = $1
       AND db.quantity_remaining > 0
       AND db.expiry_date IS NOT NULL
       AND db.expiry_date <= CURRENT_DATE + $2 * INTERVAL '1 day'
     ORDER BY db.expiry_date ASC`,
    [tenantId, daysAhead],
  );
}

export function decrementDrugBatch(client, batchId, tenantId, qty) {
  return client.query(
    `UPDATE drug_batches
     SET quantity_remaining = GREATEST(0, quantity_remaining - $3),
         updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [batchId, tenantId, qty],
  );
}

export function deleteDrugBatchesByPurchaseReceipt(client, purchaseReceiptId) {
  return client.query(
    `DELETE FROM drug_batches WHERE purchase_receipt_id = $1`,
    [purchaseReceiptId],
  );
}
