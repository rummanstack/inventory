import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { MANUFACTURER_ACTIONS } from "../lib/auditActions.js";
import {
  deleteManufacturer,
  findManufacturerByName,
  findManufacturerById,
  insertManufacturer,
  listManufacturers,
  listActiveManufacturers,
  mapManufacturer,
  updateManufacturer as updateManufacturerRepo,
} from "../repositories/manufacturerRepository.js";
import { logActivity } from "./shared/inventoryHelpers.js";

export class ManufacturerService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async listManufacturers(actor) {
    return this.databaseManager.withClient((client) => listManufacturers(client, actor.tenantId));
  }

  async listActiveManufacturers(actor) {
    return this.databaseManager.withClient((client) => listActiveManufacturers(client, actor.tenantId));
  }

  async createManufacturer(input, actor) {
    const name = String(input.name || '').trim();
    assert(name, 'Manufacturer name is required.');

    const shortName = String(input.shortName || '').trim();
    const country = String(input.country || '').trim();
    const dgdaLicense = String(input.dgdaLicense || '').trim();
    const phone = String(input.phone || '').trim();
    const address = String(input.address || '').trim();
    const status = input.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findManufacturerByName(client, actor.tenantId, name);
      assert(!existing, 'A manufacturer with this name already exists.');

      const m = {
        id: createId('mfr'),
        tenantId: actor.tenantId,
        name,
        shortName,
        country,
        dgdaLicense,
        phone,
        address,
        status,
      };
      const result = await insertManufacturer(client, m);

      await logActivity(this.auditService, client, actor, {
        actionType: MANUFACTURER_ACTIONS.CREATE,
        entityType: 'manufacturer',
        entityId: m.id,
        description: `${actor.name} created manufacturer ${name}`,
      });

      return mapManufacturer(result.rows[0]);
    });
  }

  async updateManufacturer(manufacturerId, input, actor) {
    const name = String(input.name || '').trim();
    assert(name, 'Manufacturer name is required.');

    const shortName = String(input.shortName || '').trim();
    const country = String(input.country || '').trim();
    const dgdaLicense = String(input.dgdaLicense || '').trim();
    const phone = String(input.phone || '').trim();
    const address = String(input.address || '').trim();
    const status = input.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findManufacturerById(client, manufacturerId, actor.tenantId);
      assert(existing, 'Manufacturer not found.', 404);

      const duplicate = await findManufacturerByName(client, actor.tenantId, name);
      assert(!duplicate || duplicate.id === manufacturerId, 'A manufacturer with this name already exists.');

      const result = await updateManufacturerRepo(client, {
        id: manufacturerId,
        tenantId: actor.tenantId,
        name,
        shortName,
        country,
        dgdaLicense,
        phone,
        address,
        status,
      });

      await logActivity(this.auditService, client, actor, {
        actionType: MANUFACTURER_ACTIONS.UPDATE,
        entityType: 'manufacturer',
        entityId: manufacturerId,
        description: `${actor.name} updated manufacturer ${existing.name}`,
      });

      return mapManufacturer(result.rows[0]);
    });
  }

  async deleteManufacturer(manufacturerId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findManufacturerById(client, manufacturerId, actor.tenantId);
      assert(existing, 'Manufacturer not found.', 404);

      const withCount = await listManufacturers(client, actor.tenantId)
        .then((rows) => rows.find((r) => r.id === manufacturerId));
      assert(!withCount?.productCount, 'This manufacturer still has products. Reassign them before deleting.');

      await deleteManufacturer(client, manufacturerId, actor.tenantId);

      await logActivity(this.auditService, client, actor, {
        actionType: MANUFACTURER_ACTIONS.DELETE,
        entityType: 'manufacturer',
        entityId: manufacturerId,
        description: `${actor.name} deleted manufacturer ${existing.name}`,
      });

      return { ok: true };
    });
  }
}
