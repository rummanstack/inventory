import { assert } from "../lib/errors.js";
import { diffFields } from "../lib/auditDiff.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { STOCK_MOVEMENT_TYPES } from "../lib/stockMovements.js";
import { cleanInteger, normalizeProduct } from "../lib/normalizers.js";
import { PRODUCT_ACTIONS } from "../lib/auditActions.js";
import {
  addProductStock,
  countBrowseProducts,
  countProducts,
  countTrashedProducts,
  findBrowseProductById,
  getProductImages,
  listBrowseProducts,
  listTrashedProducts,
  permanentlyDeleteProduct,
  replaceProductImages,
  restoreProduct,
  softDeleteProduct,
  findProductForUpdate,
  insertProduct,
  listAllActiveProductsLite,
  listLowStockProducts,
  listProductsPage,
  mapProduct,
  updateProduct,
  upsertProductSuppliers,
} from "../repositories/productRepository.js";
import { findCategoryById } from "../repositories/categoryRepository.js";
import { countStockMovements } from "../repositories/stockMovementRepository.js";
import { logActivity, recordStockMovement } from "./shared/inventoryHelpers.js";

// Query params look like `spec_screen_size_inch=55` (exact match) or
// `spec_screen_size_inch_min=40` / `_max=60` (numeric range) — this is what
// lets the browse endpoint filter on any category's attributes without a
// fixed list of supported spec keys.
function parseSpecFilters(query) {
  const filters = [];
  for (const [param, value] of Object.entries(query)) {
    if (!param.startsWith("spec_") || value === undefined || value === "") continue;
    if (param.endsWith("_min")) {
      filters.push({ key: param.slice("spec_".length, -"_min".length), op: "min", value });
    } else if (param.endsWith("_max")) {
      filters.push({ key: param.slice("spec_".length, -"_max".length), op: "max", value });
    } else {
      filters.push({ key: param.slice("spec_".length), op: "eq", value });
    }
  }
  return filters;
}

export class ProductService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  async listProducts(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const search = String(query.search || "").trim();
    const categoryId = String(query.categoryId || "").trim();
    const tenantId = actor.tenantId;

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listProductsPage(client, { search, categoryId, tenantId, limit, offset }),
        countProducts(client, { search, categoryId, tenantId }),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async getProductsDirectory(actor, { supplierId } = {}) {
    return this.databaseManager.withClient(async (client) => ({
      products: await listAllActiveProductsLite(client, actor.tenantId, { supplierId: supplierId || null }),
    }));
  }

  async getLowStockProducts(actor) {
    return this.databaseManager.withClient(async (client) => ({
      products: await listLowStockProducts(client, actor.tenantId),
    }));
  }

  // Customer-facing browse/search — read-only, never touches stock or
  // invoices. Deliberately separate from listProducts: no cost/purchase
  // price fields, only ACTIVE products, gated by its own permission+feature
  // so a kiosk-only role never needs admin product management access.
  async browseProducts(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const search = String(query.search || "").trim();
    const categoryId = String(query.categoryId || "").trim();
    const specFilters = parseSpecFilters(query);
    const tenantId = actor.tenantId;

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listBrowseProducts(client, { tenantId, categoryId, search, specFilters, limit, offset }),
        countBrowseProducts(client, { tenantId, categoryId, search, specFilters }),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async getBrowseProduct(productId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const product = await findBrowseProductById(client, actor.tenantId, productId);
      assert(product, "Product not found.", 404);
      return product;
    });
  }

  async saveProduct(input, actor) {
    const product = normalizeProduct(input);
    assert(product.name && product.categoryId, "Product name and category are required.");
    assert(product.piecesPerCase > 0, "Pieces per case must be greater than zero.");
    assert(product.purchasePrice > 0, "Purchase price must be greater than zero.");
    product.taxRate = Math.min(Math.max(0, Number(product.taxRate || 0)), 100);

    const supplierIds = Array.isArray(input.supplierIds) ? input.supplierIds.filter(Boolean) : [];
    const imagesProvided = Array.isArray(input.images);
    if (imagesProvided && !product.imageUrl) {
      product.imageUrl = product.images[0] || null;
    }
    const specsProvided = Boolean(
      input.specs && typeof input.specs === "object" && !Array.isArray(input.specs),
    );

    return this.databaseManager.withTransaction(async (client) => {
      const category = await findCategoryById(client, product.categoryId, actor.tenantId);
      assert(category, "Category not found.", 404);

      let result;

      if (input.id) {
        const existingResult = await findProductForUpdate(client, product.id, actor.tenantId);
        assert(existingResult.rowCount > 0, "Product not found.", 404);
        assert(
          !Object.prototype.hasOwnProperty.call(input, "stockPieces"),
          "Stock can only be changed through Add Stock.",
        );

        const existingProduct = existingResult.rows[0];
        const nextProduct = {
          ...product,
          tenantId: actor.tenantId,
          stockPieces: Number(existingProduct.stock_pieces),
          specs: specsProvided ? product.specs : (existingProduct.specs || {}),
        };

        result = await updateProduct(client, nextProduct);
        assert(result.rowCount > 0, "Product not found.", 404);
        await upsertProductSuppliers(client, nextProduct.id, supplierIds, actor.tenantId);
        if (imagesProvided) {
          await replaceProductImages(client, actor.tenantId, nextProduct.id, product.images);
        }
        await this.recordActivity(client, actor, {
          actionType: PRODUCT_ACTIONS.UPDATE,
          entityType: "product",
          entityId: nextProduct.id,
          description: `${actor.name} updated product ${nextProduct.name}`,
          metadata: { name: nextProduct.name, category: category.name },
        });
      } else {
        assert(
          !Object.prototype.hasOwnProperty.call(input, "stockPieces"),
          "Stock can only be changed through Add Stock.",
        );
        product.stockPieces = 0;
        product.tenantId = actor.tenantId;
        result = await insertProduct(client, product);
        await upsertProductSuppliers(client, product.id, supplierIds, actor.tenantId);
        if (imagesProvided) {
          await replaceProductImages(client, actor.tenantId, product.id, product.images);
        }
        await this.recordActivity(client, actor, {
          actionType: PRODUCT_ACTIONS.CREATE,
          entityType: "product",
          entityId: product.id,
          description: `${actor.name} created product ${product.name}`,
          metadata: { name: product.name, category: category.name },
        });
      }

      const images = await getProductImages(client, actor.tenantId, product.id);
      return { ...mapProduct(result.rows[0]), supplierIds, images };
    });
  }

  async removeProduct(productId, actor, reason) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await softDeleteProduct(client, productId, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });
      assert(result.rowCount > 0, "Product not found.", 404);
      await this.recordActivity(client, actor, {
        actionType: PRODUCT_ACTIONS.DELETE,
        entityType: "product",
        entityId: productId,
        description: `${actor.name} moved product ${productId} to trash${reason ? ` (${reason})` : ""}`,
      });
      return { ok: true };
    });
  }

  async restoreProduct(productId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await restoreProduct(client, productId, actor.tenantId);
      assert(result.rowCount > 0, "Product not found in trash.", 404);
      await this.recordActivity(client, actor, {
        actionType: PRODUCT_ACTIONS.RESTORE,
        entityType: "product",
        entityId: productId,
        description: `${actor.name} restored product ${result.rows[0].name} from trash`,
      });
      return { ok: true };
    });
  }

  async permanentlyDeleteProduct(productId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await permanentlyDeleteProduct(client, productId, actor.tenantId);
      assert(result.rowCount > 0, "Product not found in trash.", 404);
      await this.recordActivity(client, actor, {
        actionType: PRODUCT_ACTIONS.PERMANENT_DELETE,
        entityType: "product",
        entityId: productId,
        description: `${actor.name} permanently deleted product ${productId}`,
      });
      return { ok: true };
    });
  }

  async listTrashedProducts(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const tenantId = actor.tenantId;

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listTrashedProducts(client, { tenantId, limit, offset }),
        countTrashedProducts(client, tenantId),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async addStock(productId, addPiecesInput, actor, reason) {
    const addPieces = cleanInteger(addPiecesInput);
    assert(addPieces > 0, "Stock update must be greater than zero.");

    return this.databaseManager.withTransaction(async (client) => {
      return this.applyStockAddition(client, productId, addPieces, actor, {
        type: STOCK_MOVEMENT_TYPES.MANUAL_ADJUSTMENT,
        note: `Manual stock added by ${actor.name}`,
        description: `${actor.name} added stock to product ${productId}`,
        metadata: { addPieces },
        reason,
      });
    });
  }

  async setOpeningStock(productId, quantityInput, actor, note) {
    const quantity = cleanInteger(quantityInput);
    assert(quantity > 0, "Opening stock must be greater than zero.");

    return this.databaseManager.withTransaction(async (client) => {
      const movementCount = await countStockMovements(client, { tenantId: actor.tenantId, productId });
      assert(
        movementCount === 0,
        "Opening stock can only be set before any other stock activity for this product. Use Add Stock instead.",
      );

      return this.applyStockAddition(client, productId, quantity, actor, {
        type: STOCK_MOVEMENT_TYPES.OPENING,
        note: note || `Opening stock set by ${actor.name}`,
        description: `${actor.name} set opening stock for product ${productId}`,
        metadata: { openingStock: quantity },
      });
    });
  }

  // Shared by addStock and setOpeningStock — every path that touches stock_pieces goes
  // through here so a stock_movements row and audit entry are always created together.
  async applyStockAddition(client, productId, pieces, actor, { type, note, description, metadata, reason }) {
    const existingResult = await findProductForUpdate(client, productId, actor.tenantId);
    assert(existingResult.rowCount > 0, "Product not found.", 404);
    const row = existingResult.rows[0];
    assert(
      row.serial_required !== true && row.serial_required !== "t",
      "Serial/IMEI products cannot be stocked directly. Receive them through a purchase order instead.",
      400,
    );
    const previousStock = Number(row.stock_pieces || 0);

    const result = await addProductStock(client, productId, pieces, actor.tenantId);
    assert(result.rowCount > 0, "Product not found.", 404);
    const product = result.rows[0];
    await recordStockMovement(client, {
      tenantId: actor.tenantId,
      productId,
      type,
      quantityIn: pieces,
      quantityOut: 0,
      balanceAfter: Number(product.stock_pieces || 0),
      referenceType: "product_stock",
      referenceId: productId,
      note,
      createdById: actor.id,
    });
    const { before, after } = diffFields(
      { stockPieces: previousStock },
      { stockPieces: Number(product.stock_pieces || 0) },
      ["stockPieces"],
    );
    await this.recordActivity(client, actor, {
      actionType: PRODUCT_ACTIONS.STOCK_ADD,
      entityType: "product",
      entityId: productId,
      description,
      metadata,
      before,
      after,
      reason,
    });
    return mapProduct(product);
  }

  async clearDamagedStock(productId, quantityInput, actor, note) {
    const quantity = cleanInteger(quantityInput);
    assert(quantity > 0, "Quantity must be greater than zero.");

    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findProductForUpdate(client, productId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Product not found.", 404);
      const previousDamaged = Number(existingResult.rows[0].damaged_pieces || 0);
      assert(quantity <= previousDamaged, "Quantity exceeds damaged stock.");

      const result = await client.query(
        `WITH updated AS (
           UPDATE products
           SET damaged_pieces = damaged_pieces - $3
           WHERE id = $1 AND tenant_id = $2
           RETURNING *
         )
         SELECT updated.*, c.name AS category_name FROM updated LEFT JOIN categories c ON c.id = updated.category_id`,
        [productId, actor.tenantId, quantity],
      );
      const product = result.rows[0];
      await recordStockMovement(client, {
        tenantId: actor.tenantId,
        productId,
        type: STOCK_MOVEMENT_TYPES.DAMAGE_CLEAR,
        quantityIn: 0,
        quantityOut: quantity,
        balanceAfter: Number(product.damaged_pieces || 0),
        referenceType: "product_damage",
        referenceId: productId,
        note: note || `Damaged stock cleared by ${actor.name}`,
        createdById: actor.id,
      });
      const { before, after } = diffFields(
        { damagedPieces: previousDamaged },
        { damagedPieces: Number(product.damaged_pieces || 0) },
        ["damagedPieces"],
      );
      await this.recordActivity(client, actor, {
        actionType: PRODUCT_ACTIONS.DAMAGE_CLEAR,
        entityType: "product",
        entityId: productId,
        description: `${actor.name} cleared damaged stock for product ${productId}`,
        metadata: { quantity },
        before,
        after,
      });
      return mapProduct(product);
    });
  }
}
