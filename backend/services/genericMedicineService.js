import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { GENERIC_MEDICINE_ACTIONS } from "../lib/auditActions.js";
import {
  deleteGenericMedicine,
  findGenericMedicineByName,
  findGenericMedicineById,
  insertGenericMedicine,
  listGenericMedicines,
  listActiveGenericMedicines,
  mapGenericMedicine,
  updateGenericMedicine as updateGenericMedicineRepo,
} from "../repositories/genericMedicineRepository.js";
import { logActivity } from "./shared/inventoryHelpers.js";

export class GenericMedicineService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async listGenericMedicines(actor) {
    return this.databaseManager.withClient((client) => listGenericMedicines(client, actor.tenantId));
  }

  async listActiveGenericMedicines(actor) {
    return this.databaseManager.withClient((client) => listActiveGenericMedicines(client, actor.tenantId));
  }

  async createGenericMedicine(input, actor) {
    const name = String(input.name || '').trim();
    assert(name, 'Generic medicine name is required.');
    const description = String(input.description || '').trim();
    const status = input.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findGenericMedicineByName(client, actor.tenantId, name);
      assert(!existing, 'A generic medicine with this name already exists.');

      const g = { id: createId('gmed'), tenantId: actor.tenantId, name, description, status };
      const result = await insertGenericMedicine(client, g);

      await logActivity(this.auditService, client, actor, {
        actionType: GENERIC_MEDICINE_ACTIONS.CREATE,
        entityType: 'generic_medicine',
        entityId: g.id,
        description: `${actor.name} created generic medicine ${name}`,
      });

      return mapGenericMedicine(result.rows[0]);
    });
  }

  async updateGenericMedicine(id, input, actor) {
    const name = String(input.name || '').trim();
    assert(name, 'Generic medicine name is required.');
    const description = String(input.description || '').trim();
    const status = input.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findGenericMedicineById(client, id, actor.tenantId);
      assert(existing, 'Generic medicine not found.', 404);

      const duplicate = await findGenericMedicineByName(client, actor.tenantId, name);
      assert(!duplicate || duplicate.id === id, 'A generic medicine with this name already exists.');

      const result = await updateGenericMedicineRepo(client, { id, tenantId: actor.tenantId, name, description, status });

      await logActivity(this.auditService, client, actor, {
        actionType: GENERIC_MEDICINE_ACTIONS.UPDATE,
        entityType: 'generic_medicine',
        entityId: id,
        description: `${actor.name} updated generic medicine ${existing.name}`,
      });

      return mapGenericMedicine(result.rows[0]);
    });
  }

  async deleteGenericMedicine(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findGenericMedicineById(client, id, actor.tenantId);
      assert(existing, 'Generic medicine not found.', 404);

      const withCount = await listGenericMedicines(client, actor.tenantId)
        .then((rows) => rows.find((r) => r.id === id));
      assert(!withCount?.productCount, 'This generic medicine still has products. Reassign them before deleting.');

      await deleteGenericMedicine(client, id, actor.tenantId);

      await logActivity(this.auditService, client, actor, {
        actionType: GENERIC_MEDICINE_ACTIONS.DELETE,
        entityType: 'generic_medicine',
        entityId: id,
        description: `${actor.name} deleted generic medicine ${existing.name}`,
      });

      return { ok: true };
    });
  }
}
