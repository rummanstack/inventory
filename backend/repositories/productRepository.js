import { createId } from "../lib/ids.js";

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
    sku: row.sku || '',
    barcode: row.barcode || '',
    brand: row.brand || '',
    model: row.model || '',
    serialRequired: row.serial_required === true || row.serial_required === 't',
    warrantyMonths: Number(row.warranty_months || 0),
    status: row.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    description: row.description || '',
    imageUrl: row.image_url || null,
    specs: row.specs && typeof row.specs === 'object' ? row.specs : {},
    images: Array.isArray(row.image_urls) ? row.image_urls : undefined,
    supplierIds: Array.isArray(row.supplier_ids) ? row.supplier_ids : [],
    genericName: row.generic_name || '',
    drugType: row.drug_type || '',
    dosageForm: row.dosage_form || '',
    strength: row.strength || '',
    manufacturer: row.manufacturer || '',
    manufacturerId: row.manufacturer_id || null,
    genericMedicineId: row.generic_medicine_id || null,
    regNumber: row.reg_number || '',
    controlledSubstance: row.controlled_substance === true || row.controlled_substance === 't',
    packSize: Number(row.pack_size || 0),
    medicineType: row.medicine_type || '',
    requiresBatch: row.requires_batch === true || row.requires_batch === 't',
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
    conditions.push(`(p.name ILIKE $${params.length} OR c.name ILIKE $${params.length} OR p.barcode ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
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
    conditions.push(`(p.name ILIKE $${params.length} OR c.name ILIKE $${params.length} OR p.barcode ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
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

export async function listAllActiveProductsLite(client, tenantId, { supplierId } = {}) {
  const params = [tenantId];
  let supplierJoin = '';
  if (supplierId) {
    params.push(supplierId);
    supplierJoin = `JOIN product_suppliers ps_filter ON ps_filter.product_id = p.id AND ps_filter.supplier_id = $${params.length} AND ps_filter.tenant_id = $1`;
  }
  const result = await client.query(
    `SELECT p.id, p.name, c.name AS category_name, p.category_id, p.pieces_per_case, p.purchase_price,
            p.wholesale_price, p.retail_price, p.stock_pieces, p.damaged_pieces, p.refundable,
            p.tax_rate, p.order_index, p.serial_required, p.sku, p.barcode, p.brand, p.model,
            p.warranty_months, p.status, p.manufacturer_id,
            p.medicine_type, p.requires_batch, p.pack_size,
            COALESCE(
              (SELECT array_agg(ps.supplier_id) FROM product_suppliers ps WHERE ps.product_id = p.id AND ps.tenant_id = $1),
              ARRAY[]::TEXT[]
            ) AS supplier_ids
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     ${supplierJoin}
     WHERE p.tenant_id = $1 AND p.deleted_at IS NULL
     ORDER BY p.order_index ASC, p.name ASC`,
    params,
  );
  return result.rows.map(mapProduct);
}

function mapBrowseProduct(row) {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    category: row.category_name || null,
    brand: row.brand || '',
    model: row.model || '',
    description: row.description || '',
    retailPrice: Number(row.retail_price || 0),
    warrantyMonths: Number(row.warranty_months || 0),
    specs: row.specs && typeof row.specs === 'object' ? row.specs : {},
    inStock: Number(row.stock_pieces || 0) > 0,
    images: Array.isArray(row.image_urls) ? row.image_urls : [],
  };
}

// Builds the shared WHERE clause for the customer-facing browse endpoint.
// specFilters is an array of { key, op: 'eq' | 'min' | 'max', value }, applied
// against the schema-less `specs` JSONB column so a new category never needs
// a repository change to become filterable.
function buildBrowseConditions(params, { tenantId, categoryId, search, specFilters }) {
  const conditions = ["p.tenant_id = $1", "p.deleted_at IS NULL", "p.status = 'ACTIVE'"];

  if (categoryId) {
    params.push(categoryId);
    conditions.push(`p.category_id = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR p.brand ILIKE $${params.length} OR p.model ILIKE $${params.length})`);
  }

  for (const filter of specFilters || []) {
    const keyParamIdx = params.push(filter.key);
    if (filter.op === "eq") {
      const valueParamIdx = params.push(String(filter.value));
      conditions.push(`p.specs->>$${keyParamIdx} = $${valueParamIdx}`);
    } else if (filter.op === "min") {
      const valueParamIdx = params.push(Number(filter.value));
      conditions.push(`(p.specs->>$${keyParamIdx})::numeric >= $${valueParamIdx}`);
    } else if (filter.op === "max") {
      const valueParamIdx = params.push(Number(filter.value));
      conditions.push(`(p.specs->>$${keyParamIdx})::numeric <= $${valueParamIdx}`);
    }
  }

  return conditions.join(" AND ");
}

export async function countBrowseProducts(client, { tenantId, categoryId, search, specFilters }) {
  const params = [tenantId];
  const where = buildBrowseConditions(params, { tenantId, categoryId, search, specFilters });
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count FROM products p WHERE ${where}`,
    params,
  );
  return result.rows[0].count;
}

export async function listBrowseProducts(client, { tenantId, categoryId, search, specFilters, limit, offset }) {
  const params = [tenantId];
  const where = buildBrowseConditions(params, { tenantId, categoryId, search, specFilters });
  params.push(limit, offset);
  const result = await client.query(
    `SELECT p.id, p.name, p.category_id, c.name AS category_name, p.brand, p.model, p.description,
            p.retail_price, p.warranty_months, p.specs, p.stock_pieces,
            COALESCE(
              (SELECT array_agg(pi.url ORDER BY pi.sort_order) FROM product_images pi WHERE pi.product_id = p.id),
              ARRAY[]::TEXT[]
            ) AS image_urls
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE ${where}
     ORDER BY p.order_index ASC, p.name ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapBrowseProduct);
}

export async function findBrowseProductById(client, tenantId, productId) {
  const result = await client.query(
    `SELECT p.id, p.name, p.category_id, c.name AS category_name, p.brand, p.model, p.description,
            p.retail_price, p.warranty_months, p.specs, p.stock_pieces,
            COALESCE(
              (SELECT array_agg(pi.url ORDER BY pi.sort_order) FROM product_images pi WHERE pi.product_id = p.id),
              ARRAY[]::TEXT[]
            ) AS image_urls
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.tenant_id = $1 AND p.id = $2 AND p.deleted_at IS NULL AND p.status = 'ACTIVE'`,
    [tenantId, productId],
  );
  return result.rows[0] ? mapBrowseProduct(result.rows[0]) : null;
}

export async function upsertProductSuppliers(client, productId, supplierIds, tenantId) {
  await client.query(
    `DELETE FROM product_suppliers WHERE product_id = $1 AND tenant_id = $2`,
    [productId, tenantId],
  );
  if (!supplierIds || supplierIds.length === 0) return;
  const values = supplierIds.map((_, i) => `($1, $2, $${i + 3})`).join(', ');
  await client.query(
    `INSERT INTO product_suppliers (product_id, tenant_id, supplier_id) VALUES ${values} ON CONFLICT DO NOTHING`,
    [productId, tenantId, ...supplierIds],
  );
}

export async function getProductSupplierIds(client, productId, tenantId) {
  const result = await client.query(
    `SELECT supplier_id FROM product_suppliers WHERE product_id = $1 AND tenant_id = $2`,
    [productId, tenantId],
  );
  return result.rows.map((row) => row.supplier_id);
}

export function insertProduct(client, product) {
  return client.query(
    `WITH inserted AS (
      INSERT INTO products (
        id, tenant_id, name, category_id, pieces_per_case, purchase_price, wholesale_price, retail_price,
        stock_pieces, refundable, tax_rate, order_index, reorder_level,
        sku, barcode, brand, model, serial_required, warranty_months, status, description, image_url,
        generic_name, drug_type, dosage_form, strength, manufacturer, reg_number, controlled_substance,
        pack_size, medicine_type, requires_batch, manufacturer_id, generic_medicine_id, specs
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35)
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
      product.sku,
      product.barcode,
      product.brand,
      product.model,
      product.serialRequired,
      product.warrantyMonths,
      product.status,
      product.description,
      product.imageUrl,
      product.genericName || '',
      product.drugType || '',
      product.dosageForm || '',
      product.strength || '',
      product.manufacturer || '',
      product.regNumber || '',
      product.controlledSubstance || false,
      product.packSize || 0,
      product.medicineType || '',
      product.requiresBatch || false,
      product.manufacturerId || null,
      product.genericMedicineId || null,
      JSON.stringify(product.specs || {}),
    ],
  );
}

export function updateProduct(client, product) {
  return client.query(
    `WITH updated AS (
       UPDATE products
       SET name = $3, category_id = $4, pieces_per_case = $5, purchase_price = $6, wholesale_price = $7, retail_price = $8,
           refundable = $9, tax_rate = $10, order_index = $11, reorder_level = $12,
           sku = $13, barcode = $14, brand = $15, model = $16, serial_required = $17, warranty_months = $18,
           status = $19, description = $20, image_url = $21,
           generic_name = $22, drug_type = $23, dosage_form = $24, strength = $25,
           manufacturer = $26, reg_number = $27, controlled_substance = $28,
           pack_size = $29, medicine_type = $30, requires_batch = $31, manufacturer_id = $32, generic_medicine_id = $33,
           specs = $34
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
      product.sku,
      product.barcode,
      product.brand,
      product.model,
      product.serialRequired,
      product.warrantyMonths,
      product.status,
      product.description,
      product.imageUrl,
      product.genericName || '',
      product.drugType || '',
      product.dosageForm || '',
      product.strength || '',
      product.manufacturer || '',
      product.regNumber || '',
      product.controlledSubstance || false,
      product.packSize || 0,
      product.medicineType || '',
      product.requiresBatch || false,
      product.manufacturerId || null,
      product.genericMedicineId || null,
      JSON.stringify(product.specs || {}),
    ],
  );
}

export async function getProductImages(client, tenantId, productId) {
  const result = await client.query(
    `SELECT url FROM product_images WHERE tenant_id = $1 AND product_id = $2 ORDER BY sort_order ASC`,
    [tenantId, productId],
  );
  return result.rows.map((row) => row.url);
}

export async function getProductImagesForProducts(client, tenantId, productIds) {
  if (productIds.length === 0) return {};
  const result = await client.query(
    `SELECT product_id, url FROM product_images
     WHERE tenant_id = $1 AND product_id = ANY($2::text[])
     ORDER BY product_id, sort_order ASC`,
    [tenantId, productIds],
  );
  const byProduct = {};
  for (const row of result.rows) {
    if (!byProduct[row.product_id]) byProduct[row.product_id] = [];
    byProduct[row.product_id].push(row.url);
  }
  return byProduct;
}

export async function replaceProductImages(client, tenantId, productId, urls) {
  await client.query(`DELETE FROM product_images WHERE tenant_id = $1 AND product_id = $2`, [tenantId, productId]);
  if (!urls || urls.length === 0) return;

  const params = [tenantId, productId];
  const rows = urls.map((url, i) => {
    const idIdx = params.push(createId("pimg"));
    const urlIdx = params.push(url);
    return `($1, $2, $${idIdx}, $${urlIdx}, ${i})`;
  });

  await client.query(
    `INSERT INTO product_images (tenant_id, product_id, id, url, sort_order) VALUES ${rows.join(", ")}`,
    params,
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
