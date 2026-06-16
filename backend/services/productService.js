import { assert } from "../lib/errors.js";
import { diffFields } from "../lib/auditDiff.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { STOCK_MOVEMENT_TYPES } from "../lib/stockMovements.js";
import { cleanInteger, normalizeProduct } from "../lib/normalizers.js";
import { PRODUCT_ACTIONS } from "../lib/auditActions.js";
import {
  addProductStock,
  countProducts,
  countTrashedProducts,
  listTrashedProducts,
  permanentlyDeleteProduct,
  restoreProduct,
  softDeleteProduct,
  findProductForUpdate,
  insertProduct,
  listAllActiveProductsLite,
  listProductsPage,
  mapProduct,
  updateProduct,
} from "../repositories/productRepository.js";
import { logActivity, recordStockMovement } from "./shared/inventoryHelpers.js";

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
    const tenantId = actor.tenantId;

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listProductsPage(client, { search, tenantId, limit, offset }),
        countProducts(client, { search, tenantId }),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async getProductsDirectory(actor) {
    return this.databaseManager.withClient(async (client) => ({
      products: await listAllActiveProductsLite(client, actor.tenantId),
    }));
  }

  async saveProduct(input, actor) {
    const product = normalizeProduct(input);
    assert(product.name && product.category, "Product name and category are required.");
    assert(product.piecesPerCase > 0, "Pieces per case must be greater than zero.");
    assert(product.purchasePrice > 0, "Purchase price must be greater than zero.");

    return this.databaseManager.withTransaction(async (client) => {
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
        };

        result = await updateProduct(client, nextProduct);
        assert(result.rowCount > 0, "Product not found.", 404);
        await this.recordActivity(client, actor, {
          actionType: PRODUCT_ACTIONS.UPDATE,
          entityType: "product",
          entityId: nextProduct.id,
          description: `${actor.name} updated product ${nextProduct.name}`,
          metadata: { name: nextProduct.name, category: nextProduct.category },
        });
      } else {
        assert(
          !Object.prototype.hasOwnProperty.call(input, "stockPieces"),
          "Stock can only be changed through Add Stock.",
        );
        product.stockPieces = 0;
        product.tenantId = actor.tenantId;
        result = await insertProduct(client, product);
        await this.recordActivity(client, actor, {
          actionType: PRODUCT_ACTIONS.CREATE,
          entityType: "product",
          entityId: product.id,
          description: `${actor.name} created product ${product.name}`,
          metadata: { name: product.name, category: product.category },
        });
      }

      return mapProduct(result.rows[0]);
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
      const existingResult = await findProductForUpdate(client, productId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Product not found.", 404);
      const previousStock = Number(existingResult.rows[0].stock_pieces || 0);

      const result = await addProductStock(client, productId, addPieces, actor.tenantId);
      assert(result.rowCount > 0, "Product not found.", 404);
      const product = result.rows[0];
      await recordStockMovement(client, {
        tenantId: actor.tenantId,
        productId,
        type: STOCK_MOVEMENT_TYPES.MANUAL_ADJUSTMENT,
        quantityIn: addPieces,
        quantityOut: 0,
        balanceAfter: Number(product.stock_pieces || 0),
        referenceType: "product_stock",
        referenceId: productId,
        note: `Manual stock added by ${actor.name}`,
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
        description: `${actor.name} added stock to product ${productId}`,
        metadata: { addPieces },
        before,
        after,
        reason,
      });
      return mapProduct(product);
    });
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
        `UPDATE products
         SET damaged_pieces = damaged_pieces - $3
         WHERE id = $1 AND tenant_id = $2
         RETURNING *`,
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
