export function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category_name || null,
    categoryId: row.category_id || null,
    piecesPerCase: Number(row.pieces_per_case),
    purchasePrice: Number(row.purchase_price),
    wholesalePrice: Number(row.wholesale_price || 0),
    retailPrice: Number(row.retail_price || 0),
    stockPieces: Number(row.stock_pieces),
    damagedPieces: Number(row.damaged_pieces),
    refundable: row.refundable !== false && row.refundable !== 0 && row.refundable !== "false",
    taxRate: Number(row.tax_rate || 0),
    orderIndex: Number(row.order_index) >= 9999 ? null : Number(row.order_index),
    reorderLevel: row.reorder_level === null || row.reorder_level === undefined ? null : Number(row.reorder_level),
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

export async function countProducts(client, { search, categoryId, tenantId } = {}) {
  const params = [tenantId];
  const conditions = ["p.tenant_id = $1", "p.deleted_at IS NULL"];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
  }

  if (categoryId) {
    params.push(categoryId);
    conditions.push(`p.category_id = $${params.length}`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count FROM products p LEFT JOIN categories c ON c.id = p.category_id ${where}`,
    params,
  );
  return result.rows[0].count;
}

export async function listProductsPage(client, { search, categoryId, tenantId, limit, offset }) {
  const params = [tenantId];
  const conditions = ["p.tenant_id = $1", "p.deleted_at IS NULL"];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
  }

  if (categoryId) {
    params.push(categoryId);
    conditions.push(`p.category_id = $${params.length}`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  params.push(limit, offset);
  const result = await client.query(
    `SELECT p.*, c.name AS category_name FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     ${where}
     ORDER BY p.order_index ASC, p.created_at ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapProduct);
}

export async function listAllActiveProductsLite(client, tenantId) {
  const result = await client.query(
    `SELECT p.id, p.name, c.name AS category_name, p.category_id, p.pieces_per_case, p.purchase_price,
            p.wholesale_price, p.retail_price, p.stock_pieces, p.damaged_pieces, p.refundable,
            p.tax_rate, p.order_index
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.tenant_id = $1 AND p.deleted_at IS NULL
     ORDER BY p.order_index ASC, p.name ASC`,
    [tenantId],
  );
  return result.rows.map(mapProduct);
}

export function insertProduct(client, product) {
  return client.query(
    `WITH inserted AS (
      INSERT INTO products (id, tenant_id, name, category_id, pieces_per_case, purchase_price, wholesale_price, retail_price, stock_pieces, refundable, tax_rate, order_index, reorder_level)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
     )
     SELECT inserted.*, c.name AS category_name FROM inserted LEFT JOIN categories c ON c.id = inserted.category_id`,
    [
      product.id,
      product.tenantId,
      product.name,
      product.categoryId,
      product.piecesPerCase,
      product.purchasePrice,
      product.wholesalePrice,
      product.retailPrice,
      product.stockPieces,
      product.refundable,
      product.taxRate,
      product.orderIndex ?? 9999,
      product.reorderLevel,
    ],
  );
}

export function updateProduct(client, product) {
  return client.query(
    `WITH updated AS (
       UPDATE products
       SET name = $3, category_id = $4, pieces_per_case = $5, purchase_price = $6, wholesale_price = $7, retail_price = $8, refundable = $9, tax_rate = $10, order_index = $11, reorder_level = $12
       WHERE id = $1 AND tenant_id = $2
       RETURNING *
     )
     SELECT updated.*, c.name AS category_name FROM updated LEFT JOIN categories c ON c.id = updated.category_id`,
    [
      product.id,
      product.tenantId,
      product.name,
      product.categoryId,
      product.piecesPerCase,
      product.purchasePrice,
      product.wholesalePrice,
      product.retailPrice,
      product.refundable,
      product.taxRate,
      product.orderIndex ?? 9999,
      product.reorderLevel,
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
    `SELECT p.*, c.name AS category_name, u.name AS deleted_by_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
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
    `WITH updated AS (
       UPDATE products
       SET stock_pieces = stock_pieces + $3
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *
     )
     SELECT updated.*, c.name AS category_name FROM updated LEFT JOIN categories c ON c.id = updated.category_id`,
    [productId, tenantId, addPieces],
  );
}

export async function listLowStockProducts(client, tenantId) {
  const result = await client.query(
    `SELECT p.*, c.name AS category_name FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.tenant_id = $1 AND p.deleted_at IS NULL
       AND p.stock_pieces <= COALESCE(p.reorder_level, p.pieces_per_case * 4)
     ORDER BY p.stock_pieces ASC, p.name ASC`,
    [tenantId],
  );
  return result.rows.map(mapProduct);
}

export function findProductForUpdate(client, productId, tenantId) {
  return client.query("SELECT * FROM products WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE", [productId, tenantId]);
}

export function findProductsForUpdate(client, productIds, tenantId) {
  return client.query("SELECT * FROM products WHERE id = ANY($1) AND tenant_id = $2 AND deleted_at IS NULL FOR UPDATE", [productIds, tenantId]);
}
