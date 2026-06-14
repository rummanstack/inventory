export function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    piecesPerCase: Number(row.pieces_per_case),
    purchasePrice: Number(row.purchase_price),
    sellingPrice: Number(row.selling_price),
    wholesalePrice: Number(row.wholesale_price || 0),
    retailPrice: Number(row.retail_price || 0),
    stockPieces: Number(row.stock_pieces),
    damagedPieces: Number(row.damaged_pieces),
    orderIndex: Number(row.order_index) >= 9999 ? null : Number(row.order_index),
  };
}

function mapTrashedProduct(row) {
  return {
    ...mapProduct(row),
    deletedAt: row.deleted_at,
    deletedById: row.deleted_by_id,
    deletedByName: row.deleted_by_name || null,
    deleteReason: row.delete_reason || '',
  };
}

export async function countProducts(client, { search, tenantId } = {}) {
  const params = [tenantId];
  const conditions = ["tenant_id = $1", "deleted_at IS NULL"];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR category ILIKE $${params.length})`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM products ${where}`, params);
  return result.rows[0].count;
}

export async function listProductsPage(client, { search, tenantId, limit, offset }) {
  const params = [tenantId];
  const conditions = ["tenant_id = $1", "deleted_at IS NULL"];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR category ILIKE $${params.length})`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  params.push(limit, offset);
  const result = await client.query(
    `SELECT * FROM products ${where} ORDER BY order_index ASC, created_at ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapProduct);
}

export async function listAllActiveProductsLite(client, tenantId) {
  const result = await client.query(
    "SELECT id, name, category, pieces_per_case, purchase_price, selling_price, stock_pieces, damaged_pieces, order_index FROM products WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY order_index ASC, name ASC",
    [tenantId],
  );
  return result.rows.map(mapProduct);
}

export function insertProduct(client, product) {
  return client.query(
    `INSERT INTO products (id, tenant_id, name, category, pieces_per_case, purchase_price, selling_price, wholesale_price, retail_price, stock_pieces, order_index)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      product.id,
      product.tenantId,
      product.name,
      product.category,
      product.piecesPerCase,
      product.purchasePrice,
      product.sellingPrice,
      product.wholesalePrice,
      product.retailPrice,
      product.stockPieces,
      product.orderIndex ?? 9999,
    ],
  );
}

export function updateProduct(client, product) {
  return client.query(
    `UPDATE products
     SET name = $3, category = $4, pieces_per_case = $5, purchase_price = $6, selling_price = $7, wholesale_price = $8, retail_price = $9, order_index = $10
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [
      product.id,
      product.tenantId,
      product.name,
      product.category,
      product.piecesPerCase,
      product.purchasePrice,
      product.sellingPrice,
      product.wholesalePrice,
      product.retailPrice,
      product.orderIndex ?? 9999,
    ],
  );
}

export function softDeleteProduct(client, productId, tenantId, { deletedById, deleteReason } = {}) {
  return client.query(
    `UPDATE products
     SET deleted_at = NOW(), deleted_by_id = $3, delete_reason = $4
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [productId, tenantId, deletedById || null, deleteReason || ""],
  );
}

export function restoreProduct(client, productId, tenantId) {
  return client.query(
    `UPDATE products
     SET deleted_at = NULL, deleted_by_id = NULL, delete_reason = ''
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL
     RETURNING *`,
    [productId, tenantId],
  );
}

export function permanentlyDeleteProduct(client, productId, tenantId) {
  return client.query(
    "DELETE FROM products WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL",
    [productId, tenantId],
  );
}

export async function countTrashedProducts(client, tenantId) {
  const result = await client.query(
    "SELECT COUNT(*)::INTEGER AS count FROM products WHERE tenant_id = $1 AND deleted_at IS NOT NULL",
    [tenantId],
  );
  return result.rows[0].count;
}

export async function listTrashedProducts(client, { tenantId, limit, offset }) {
  const result = await client.query(
    `SELECT p.*, u.name AS deleted_by_name
     FROM products p
     LEFT JOIN users u ON u.id = p.deleted_by_id
     WHERE p.tenant_id = $1 AND p.deleted_at IS NOT NULL
     ORDER BY p.deleted_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return result.rows.map(mapTrashedProduct);
}

export function addProductStock(client, productId, addPieces, tenantId) {
  return client.query(
    `UPDATE products
     SET stock_pieces = stock_pieces + $3
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [productId, tenantId, addPieces],
  );
}

export function findProductForUpdate(client, productId, tenantId) {
  return client.query("SELECT * FROM products WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE", [productId, tenantId]);
}

export function findProductsForUpdate(client, productIds, tenantId) {
  return client.query("SELECT * FROM products WHERE id = ANY($1) AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE", [productIds, tenantId]);
}
