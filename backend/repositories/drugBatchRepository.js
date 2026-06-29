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

export function incrementDrugBatch(client, batchId, tenantId, qty) {
  return client.query(
    `UPDATE drug_batches
     SET quantity_remaining = quantity_remaining + $3,
         updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [batchId, tenantId, qty],
  );
}

// Selects batches FEFO (soonest expiry first, then oldest received) and returns
// an ordered list of { batchId, batchNumber, lotNumber, expiryDate, qtyToTake }
// assignments that together satisfy quantityNeeded. Rows are locked FOR UPDATE
// so the caller's transaction owns the decrement.
export async function pickFefoForSale(client, { tenantId, productId, quantityNeeded }) {
  const result = await client.query(
    `SELECT id, batch_number, lot_number, expiry_date, quantity_remaining
     FROM drug_batches
     WHERE tenant_id = $1 AND product_id = $2 AND quantity_remaining > 0
     ORDER BY expiry_date ASC NULLS LAST, created_at ASC
     FOR UPDATE`,
    [tenantId, productId],
  );

  if (result.rows.length === 0) return [];

  const assignments = [];
  let remaining = quantityNeeded;
  for (const row of result.rows) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, Number(row.quantity_remaining));
    assignments.push({
      batchId: row.id,
      batchNumber: row.batch_number || '',
      lotNumber: row.lot_number || '',
      expiryDate: row.expiry_date || null,
      qtyToTake: take,
    });
    remaining -= take;
  }
  return assignments;
}

export function insertSalesInvoiceItemBatch(client, entry) {
  return client.query(
    `INSERT INTO sales_invoice_item_batches
       (id, tenant_id, sales_invoice_id, sales_invoice_item_id, drug_batch_id,
        batch_number, lot_number, expiry_date, quantity_from_batch)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      entry.id,
      entry.tenantId,
      entry.salesInvoiceId,
      entry.salesInvoiceItemId,
      entry.drugBatchId,
      entry.batchNumber || '',
      entry.lotNumber || '',
      entry.expiryDate || null,
      entry.quantityFromBatch,
    ],
  );
}

export async function listSalesInvoiceItemBatchesByInvoice(client, salesInvoiceId, tenantId) {
  const result = await client.query(
    `SELECT * FROM sales_invoice_item_batches
     WHERE sales_invoice_id = $1 AND tenant_id = $2
     ORDER BY created_at`,
    [salesInvoiceId, tenantId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    salesInvoiceId: row.sales_invoice_id,
    salesInvoiceItemId: row.sales_invoice_item_id,
    drugBatchId: row.drug_batch_id,
    batchNumber: row.batch_number || '',
    lotNumber: row.lot_number || '',
    expiryDate: row.expiry_date || null,
    quantityFromBatch: Number(row.quantity_from_batch || 0),
  }));
}

// Returns the single drug_batch row linked to a purchase receipt item, or null.
export async function findDrugBatchByReceiptItemId(client, purchaseReceiptItemId, tenantId) {
  const result = await client.query(
    `SELECT * FROM drug_batches
     WHERE purchase_receipt_item_id = $1 AND tenant_id = $2
     LIMIT 1`,
    [purchaseReceiptItemId, tenantId],
  );
  return result.rows.length ? mapDrugBatch(result.rows[0]) : null;
}

// Adjusts quantity_received and quantity_remaining by delta (delta can be negative).
// quantity_remaining is floored at 0 so it never goes negative.
export function adjustDrugBatchQuantity(client, batchId, delta) {
  return client.query(
    `UPDATE drug_batches
     SET quantity_received  = quantity_received + $2,
         quantity_remaining = GREATEST(0, quantity_remaining + $2),
         updated_at         = NOW()
     WHERE id = $1`,
    [batchId, delta],
  );
}

// On purchase receipt trash: reduce quantity_remaining by the full quantity_received
// for every batch linked to this receipt (they go back to 0 available for FEFO).
export function deductDrugBatchReceiptQuantities(client, purchaseReceiptId, tenantId) {
  return client.query(
    `UPDATE drug_batches
     SET quantity_remaining = GREATEST(0, quantity_remaining - quantity_received),
         updated_at         = NOW()
     WHERE purchase_receipt_id = $1 AND tenant_id = $2`,
    [purchaseReceiptId, tenantId],
  );
}

// On purchase receipt restore: add quantity_received back to quantity_remaining.
export function restoreDrugBatchReceiptQuantities(client, purchaseReceiptId, tenantId) {
  return client.query(
    `UPDATE drug_batches
     SET quantity_remaining = quantity_remaining + quantity_received,
         updated_at         = NOW()
     WHERE purchase_receipt_id = $1 AND tenant_id = $2`,
    [purchaseReceiptId, tenantId],
  );
}

export async function listSalesInvoiceItemBatchesByItem(client, salesInvoiceItemId, tenantId) {
  const result = await client.query(
    `SELECT * FROM sales_invoice_item_batches
     WHERE sales_invoice_item_id = $1 AND tenant_id = $2
     ORDER BY created_at`,
    [salesInvoiceItemId, tenantId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    drugBatchId: row.drug_batch_id,
    quantityFromBatch: Number(row.quantity_from_batch || 0),
  }));
}

export function deleteSalesInvoiceItemBatchesByInvoice(client, salesInvoiceId) {
  return client.query(
    `DELETE FROM sales_invoice_item_batches WHERE sales_invoice_id = $1`,
    [salesInvoiceId],
  );
}

export async function listBatchSalesReport(client, { tenantId, dateFrom, dateTo, batchNumber, productId, limit, offset }) {
  const params = [tenantId];
  const conditions = ['siib.tenant_id = $1', 'si.deleted_at IS NULL'];

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`si.invoice_date >= $${params.length}::date`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`si.invoice_date <= $${params.length}::date`);
  }
  if (batchNumber) {
    params.push(`%${batchNumber}%`);
    conditions.push(`siib.batch_number ILIKE $${params.length}`);
  }
  if (productId) {
    params.push(productId);
    conditions.push(`sii.product_id = $${params.length}`);
  }

  params.push(limit, offset);

  const result = await client.query(
    `SELECT
       siib.id,
       si.invoice_date,
       si.invoice_number,
       si.sale_type,
       si.prescription_number,
       sii.product_id,
       sii.product_name,
       siib.batch_number,
       siib.lot_number,
       siib.expiry_date,
       siib.quantity_from_batch,
       sii.actual_sale_price,
       c.name AS customer_name,
       si.customer_name_snapshot,
       si.customer_type
     FROM sales_invoice_item_batches siib
     JOIN sales_invoices si ON si.id = siib.sales_invoice_id
     JOIN sales_invoice_items sii ON sii.id = siib.sales_invoice_item_id
     LEFT JOIN retail_customers c ON c.id = si.customer_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY si.invoice_date DESC, si.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return result.rows.map((row) => ({
    id: row.id,
    invoiceDate: row.invoice_date,
    invoiceNumber: row.invoice_number,
    saleType: row.sale_type,
    prescriptionNumber: row.prescription_number || '',
    productId: row.product_id,
    productName: row.product_name || '',
    batchNumber: row.batch_number || '',
    lotNumber: row.lot_number || '',
    expiryDate: row.expiry_date || null,
    quantityFromBatch: Number(row.quantity_from_batch || 0),
    actualSalePrice: Number(row.actual_sale_price || 0),
    customerName: row.customer_name || row.customer_name_snapshot || '',
    customerType: row.customer_type || '',
  }));
}

export async function countBatchSalesReport(client, { tenantId, dateFrom, dateTo, batchNumber, productId }) {
  const params = [tenantId];
  const conditions = ['siib.tenant_id = $1', 'si.deleted_at IS NULL'];

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`si.invoice_date >= $${params.length}::date`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`si.invoice_date <= $${params.length}::date`);
  }
  if (batchNumber) {
    params.push(`%${batchNumber}%`);
    conditions.push(`siib.batch_number ILIKE $${params.length}`);
  }
  if (productId) {
    params.push(productId);
    conditions.push(`sii.product_id = $${params.length}`);
  }

  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count
     FROM sales_invoice_item_batches siib
     JOIN sales_invoices si ON si.id = siib.sales_invoice_id
     JOIN sales_invoice_items sii ON sii.id = siib.sales_invoice_item_id
     WHERE ${conditions.join(' AND ')}`,
    params,
  );
  return result.rows[0].count;
}
