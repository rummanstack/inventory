export function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    piecesPerCase: Number(row.pieces_per_case),
    purchasePrice: Number(row.purchase_price),
    sellingPrice: Number(row.selling_price),
    stockPieces: Number(row.stock_pieces),
    damagedPieces: Number(row.damaged_pieces),
    orderIndex: Number(row.order_index) >= 9999 ? null : Number(row.order_index),
  };
}

function mapProductLite(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    piecesPerCase: Number(row.pieces_per_case),
    purchasePrice: Number(row.purchase_price),
    sellingPrice: Number(row.selling_price),
    stockPieces: Number(row.stock_pieces),
    damagedPieces: Number(row.damaged_pieces),
    orderIndex: Number(row.order_index) >= 9999 ? null : Number(row.order_index),
  };
}

export async function countProducts(client, { search, tenantId } = {}) {
  const params = [tenantId];
  const conditions = ["tenant_id = $1"];

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
  const conditions = ["tenant_id = $1"];

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
    "SELECT id, name, category, pieces_per_case, purchase_price, selling_price, stock_pieces, damaged_pieces, order_index FROM products WHERE tenant_id = $1 ORDER BY order_index ASC, name ASC",
    [tenantId],
  );
  return result.rows.map(mapProductLite);
}

export function insertProduct(client, product) {
  return client.query(
    `INSERT INTO products (id, tenant_id, name, category, pieces_per_case, purchase_price, selling_price, stock_pieces, order_index)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      product.id,
      product.tenantId,
      product.name,
      product.category,
      product.piecesPerCase,
      product.purchasePrice,
      product.sellingPrice,
      product.stockPieces,
      product.orderIndex ?? 9999,
    ],
  );
}

export function updateProduct(client, product) {
  return client.query(
    `UPDATE products
     SET name = $3, category = $4, pieces_per_case = $5, purchase_price = $6, selling_price = $7, order_index = $8
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
      product.orderIndex ?? 9999,
    ],
  );
}

export function deleteProduct(client, productId, tenantId) {
  return client.query("DELETE FROM products WHERE id = $1 AND tenant_id = $2", [productId, tenantId]);
}

export function addProductStock(client, productId, addPieces, tenantId) {
  return client.query(
    `UPDATE products
     SET stock_pieces = stock_pieces + $3
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [productId, tenantId, addPieces],
  );
}

export function findProductForUpdate(client, productId, tenantId) {
  return client.query("SELECT * FROM products WHERE id = $1 AND tenant_id = $2 FOR UPDATE", [productId, tenantId]);
}
