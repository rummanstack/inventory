import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { CATEGORY_ACTIONS, CATEGORY_ATTRIBUTE_ACTIONS } from "../lib/auditActions.js";
import {
  deleteCategory,
  findCategoryByName,
  findCategoryById,
  insertCategory,
  listCategories,
  mapCategory,
  updateCategory as updateCategoryRepo,
} from "../repositories/categoryRepository.js";
import {
  deleteCategoryAttribute,
  findCategoryAttributeById,
  findCategoryAttributeByKey,
  insertCategoryAttribute,
  listCategoryAttributes,
  updateCategoryAttribute as updateCategoryAttributeRepo,
} from "../repositories/categoryAttributeRepository.js";
import { logActivity } from "./shared/inventoryHelpers.js";

const ATTRIBUTE_DATA_TYPES = ["text", "number", "boolean", "select"];

export class CategoryService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async listCategories(actor) {
    return this.databaseManager.withClient((client) => listCategories(client, actor.tenantId));
  }

  async createCategory(input, actor) {
    const name = String(input.name || "").trim();
    assert(name, "Category name is required.");

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findCategoryByName(client, actor.tenantId, name);
      assert(!existing, "A category with this name already exists.");

      const category = { id: createId("category"), tenantId: actor.tenantId, name };
      const result = await insertCategory(client, category);

      await logActivity(this.auditService, client, actor, {
        actionType: CATEGORY_ACTIONS.CREATE,
        entityType: "category",
        entityId: category.id,
        description: `${actor.name} created category ${name}`,
      });

      return mapCategory(result.rows[0]);
    });
  }

  async updateCategory(categoryId, input, actor) {
    const name = String(input.name || "").trim();
    assert(name, "Category name is required.");

    return this.databaseManager.withTransaction(async (client) => {
      const existingCategory = await findCategoryById(client, categoryId, actor.tenantId);
      assert(existingCategory, "Category not found.", 404);

      const duplicate = await findCategoryByName(client, actor.tenantId, name);
      assert(!duplicate || duplicate.id === categoryId, "A category with this name already exists.");

      const result = await updateCategoryRepo(client, { id: categoryId, tenantId: actor.tenantId, name });

      await logActivity(this.auditService, client, actor, {
        actionType: CATEGORY_ACTIONS.UPDATE,
        entityType: "category",
        entityId: categoryId,
        description: `${actor.name} renamed category ${existingCategory.name} to ${name}`,
      });

      return mapCategory(result.rows[0]);
    });
  }

  async deleteCategory(categoryId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existingCategory = await findCategoryById(client, categoryId, actor.tenantId);
      assert(existingCategory, "Category not found.", 404);

      const [categoryWithCount] = await listCategories(client, actor.tenantId).then((rows) =>
        rows.filter((row) => row.id === categoryId),
      );
      assert(
        !categoryWithCount?.productCount,
        "This category is still used by products. Reassign those products before deleting it.",
      );

      await deleteCategory(client, categoryId, actor.tenantId);

      await logActivity(this.auditService, client, actor, {
        actionType: CATEGORY_ACTIONS.DELETE,
        entityType: "category",
        entityId: categoryId,
        description: `${actor.name} deleted category ${existingCategory.name}`,
      });

      return { ok: true };
    });
  }

  async listAttributes(categoryId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const category = await findCategoryById(client, categoryId, actor.tenantId);
      assert(category, "Category not found.", 404);
      return listCategoryAttributes(client, actor.tenantId, categoryId);
    });
  }

  async createAttribute(categoryId, input, actor) {
    const key = String(input.key || "").trim();
    const label = String(input.label || "").trim();
    const dataType = String(input.dataType || "text").trim();
    assert(key, "Attribute key is required.");
    assert(label, "Attribute label is required.");
    assert(ATTRIBUTE_DATA_TYPES.includes(dataType), "Invalid attribute data type.");

    return this.databaseManager.withTransaction(async (client) => {
      const category = await findCategoryById(client, categoryId, actor.tenantId);
      assert(category, "Category not found.", 404);

      const existing = await findCategoryAttributeByKey(client, actor.tenantId, categoryId, key);
      assert(!existing, "An attribute with this key already exists for this category.");

      const attribute = await insertCategoryAttribute(client, {
        id: createId("catattr"),
        tenantId: actor.tenantId,
        categoryId,
        key,
        label,
        dataType,
        unit: String(input.unit || "").trim(),
        options: Array.isArray(input.options) ? input.options : [],
        sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0,
        showInComparison: input.showInComparison !== false,
      });

      await logActivity(this.auditService, client, actor, {
        actionType: CATEGORY_ATTRIBUTE_ACTIONS.CREATE,
        entityType: "category_attribute",
        entityId: attribute.id,
        description: `${actor.name} added attribute ${label} to category ${category.name}`,
      });

      return attribute;
    });
  }

  async updateAttribute(categoryId, attributeId, input, actor) {
    const label = String(input.label || "").trim();
    const dataType = String(input.dataType || "text").trim();
    assert(label, "Attribute label is required.");
    assert(ATTRIBUTE_DATA_TYPES.includes(dataType), "Invalid attribute data type.");

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findCategoryAttributeById(client, actor.tenantId, attributeId);
      assert(existing && existing.categoryId === categoryId, "Attribute not found.", 404);

      const attribute = await updateCategoryAttributeRepo(client, {
        id: attributeId,
        tenantId: actor.tenantId,
        label,
        dataType,
        unit: String(input.unit || "").trim(),
        options: Array.isArray(input.options) ? input.options : [],
        sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0,
        showInComparison: input.showInComparison !== false,
      });

      await logActivity(this.auditService, client, actor, {
        actionType: CATEGORY_ATTRIBUTE_ACTIONS.UPDATE,
        entityType: "category_attribute",
        entityId: attributeId,
        description: `${actor.name} updated attribute ${label}`,
      });

      return attribute;
    });
  }

  async deleteAttribute(categoryId, attributeId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findCategoryAttributeById(client, actor.tenantId, attributeId);
      assert(existing && existing.categoryId === categoryId, "Attribute not found.", 404);

      await deleteCategoryAttribute(client, actor.tenantId, attributeId);

      await logActivity(this.auditService, client, actor, {
        actionType: CATEGORY_ATTRIBUTE_ACTIONS.DELETE,
        entityType: "category_attribute",
        entityId: attributeId,
        description: `${actor.name} removed attribute ${existing.label}`,
      });

      return { ok: true };
    });
  }
}
