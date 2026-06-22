export function mapSalesItemSerial(row) {
  return {
    id: row.id,
    salesInvoiceId: row.sales_invoice_id,
    salesInvoiceItemId: row.sales_invoice_item_id,
    productId: row.product_id,
    productSerialId: row.product_serial_id,
    serialNumberSnapshot: row.serial_number_snapshot || '',
    imei1Snapshot: row.imei1_snapshot || '',
    imei2Snapshot: row.imei2_snapshot || '',
    createdAt: row.created_at,
  };
}

export function insertSalesItemSerial(client, link) {
  return client.query(
    `INSERT INTO sales_item_serials (
       id, tenant_id, sales_invoice_id, sales_invoice_item_id, product_id, product_serial_id,
       serial_number_snapshot, imei1_snapshot, imei2_snapshot
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      link.id,
      link.tenantId,
      link.salesInvoiceId,
      link.salesInvoiceItemId,
      link.productId,
      link.productSerialId,
      link.serialNumberSnapshot,
      link.imei1Snapshot,
      link.imei2Snapshot,
    ],
  );
}

export async function insertSalesItemSerials(client, links) {
  const rows = [];
  for (const link of links) {
    const result = await insertSalesItemSerial(client, link);
    rows.push(result.rows[0]);
  }
  return rows.map(mapSalesItemSerial);
}

export async function listSalesItemSerialsByInvoice(client, salesInvoiceId, tenantId) {
  const result = await client.query(
    "SELECT * FROM sales_item_serials WHERE sales_invoice_id = $1 AND tenant_id = $2 ORDER BY created_at ASC",
    [salesInvoiceId, tenantId],
  );
  return result.rows.map(mapSalesItemSerial);
}

export async function listSalesItemSerialsByInvoiceItem(client, salesInvoiceItemId, tenantId) {
  const result = await client.query(
    "SELECT * FROM sales_item_serials WHERE sales_invoice_item_id = $1 AND tenant_id = $2 ORDER BY created_at ASC",
    [salesInvoiceItemId, tenantId],
  );
  return result.rows.map(mapSalesItemSerial);
}

// Used by sales return (Phase 9) to find which serials a returned line item sold,
// before deciding whether to put them back into product_serials as IN_STOCK.
export async function listSalesItemSerialsByInvoiceItems(client, salesInvoiceItemIds, tenantId) {
  if (!salesInvoiceItemIds.length) {
    return [];
  }

  const result = await client.query(
    "SELECT * FROM sales_item_serials WHERE sales_invoice_item_id = ANY($1) AND tenant_id = $2 ORDER BY created_at ASC",
    [salesInvoiceItemIds, tenantId],
  );
  return result.rows.map(mapSalesItemSerial);
}

export function deleteSalesItemSerialsByIds(client, ids, tenantId) {
  return client.query(
    "DELETE FROM sales_item_serials WHERE id = ANY($1) AND tenant_id = $2",
    [ids, tenantId],
  );
}
