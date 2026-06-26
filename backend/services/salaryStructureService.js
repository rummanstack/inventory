import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { SALARY_STRUCTURE_ACTIONS } from "../lib/auditActions.js";
import {
  findSalaryStructureByEmployee,
  upsertSalaryStructure,
  listSalaryStructures,
} from "../repositories/salaryStructureRepository.js";
import { findEmployeeById } from "../repositories/employeeRepository.js";

const VALID_PAY_TYPES = ["MONTHLY", "DAILY"];

function normalizeStructure(input) {
  return {
    payType: VALID_PAY_TYPES.includes(String(input.payType || "").toUpperCase())
      ? String(input.payType).toUpperCase()
      : "MONTHLY",
    basicPay: Math.max(0, Number(input.basicPay || 0)),
    effectiveFrom: input.effectiveFrom
      ? String(input.effectiveFrom).slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    allowances: Array.isArray(input.allowances)
      ? input.allowances.map((a) => ({
          label: String(a.label || "").trim(),
          amount: Math.max(0, Number(a.amount || 0)),
        })).filter((a) => a.label)
      : [],
    deductions: Array.isArray(input.deductions)
      ? input.deductions.map((d) => ({
          label: String(d.label || "").trim(),
          amount: Math.max(0, Number(d.amount || 0)),
        })).filter((d) => d.label)
      : [],
  };
}

export class SalaryStructureService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async getByEmployee(employeeId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const emp = await findEmployeeById(client, employeeId, actor.tenantId);
      assert(emp, "Employee not found.", 404);
      return findSalaryStructureByEmployee(client, employeeId, actor.tenantId);
    });
  }

  async save(employeeId, input, actor) {
    const data = normalizeStructure(input);
    assert(data.basicPay > 0, "Basic pay must be greater than zero.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const emp = await findEmployeeById(client, employeeId, actor.tenantId);
      assert(emp, "Employee not found.", 404);

      const ss = {
        id: createId("ss"),
        tenantId: actor.tenantId,
        employeeId,
        ...data,
        createdBy: actor.id,
      };
      await upsertSalaryStructure(client, ss);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: SALARY_STRUCTURE_ACTIONS.SAVE,
        entityType: "salary_structure",
        entityId: employeeId,
        description: `${actor.name} saved salary structure for ${emp.name}`,
        metadata: { payType: data.payType, basicPay: data.basicPay },
      });
      return findSalaryStructureByEmployee(client, employeeId, actor.tenantId);
    });
  }

  async listAll(actor) {
    return this.databaseManager.withClient((client) =>
      listSalaryStructures(client, actor.tenantId),
    );
  }
}
