import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { CATEGORY_ACTIONS } from "../lib/auditActions.js";
import {
  deleteCategory,
  findCategoryByName,
  findCategoryById,
  insertCategory,
  listCategories,
  mapCategory,
  updateCategory as updateCategoryRepo,
} from "../repositories/categoryRepository.js";
import { logActivity } from "./shared/inventoryHelpers.js";

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
}
