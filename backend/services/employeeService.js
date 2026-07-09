import fs from "node:fs";
import path from "node:path";
import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { nextEmployeeNumber } from "../lib/employeeNumber.js";
import { EMPLOYEE_ACTIONS } from "../lib/auditActions.js";
import { findDepartmentById } from "../repositories/departmentRepository.js";
import { findDesignationById } from "../repositories/designationRepository.js";
import {
  insertEmployee,
  updateEmployee,
  findEmployeeById,
  countEmployees,
  listEmployeesPage,
  listAllActiveEmployees,
  softDeleteEmployee,
  restoreEmployee,
  listEmployeeDocuments,
  findEmployeeDocumentById,
  insertEmployeeDocument,
  softDeleteEmployeeDocument,
} from "../repositories/employeeRepository.js";

const VALID_STATUSES = ["ACTIVE", "INACTIVE"];
const VALID_PAY_TYPES = ["MONTHLY", "DAILY"];
const VALID_GENDERS = ["", "MALE", "FEMALE", "OTHER"];
const VALID_BLOOD_GROUPS = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const VALID_DOCUMENT_TYPES = ["NID", "APPOINTMENT_LETTER", "CONTRACT", "OTHER"];

function dateOrNull(value) {
  if (!value) return null;
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function normalizeEmployee(input = {}) {
  const status = String(input.status || "ACTIVE").trim().toUpperCase();
  const payType = String(input.payType || "MONTHLY").trim().toUpperCase();
  const gender = String(input.gender || "").trim().toUpperCase();
  const bloodGroup = String(input.bloodGroup || "").trim().toUpperCase();

  return {
    name: String(input.name || "").trim(),
    photoUrl: String(input.photoUrl || "").trim(),
    phone: String(input.phone || "").trim(),
    email: String(input.email || "").trim().toLowerCase(),
    address: String(input.address || "").trim(),
    departmentId: String(input.departmentId || "").trim(),
    department: String(input.department || "").trim(),
    designationId: String(input.designationId || "").trim(),
    designation: String(input.designation || "").trim(),
    joinDate: dateOrNull(input.joinDate) || new Date().toISOString().slice(0, 10),
    status: VALID_STATUSES.includes(status) ? status : "ACTIVE",
    note: String(input.note || "").trim(),
    emergencyContactName: String(input.emergencyContactName || "").trim(),
    emergencyContactPhone: String(input.emergencyContactPhone || "").trim(),
    emergencyContactRelation: String(input.emergencyContactRelation || "").trim(),
    nationalId: String(input.nationalId || "").trim(),
    dateOfBirth: dateOrNull(input.dateOfBirth),
    gender: VALID_GENDERS.includes(gender) ? gender : "",
    bloodGroup: VALID_BLOOD_GROUPS.includes(bloodGroup) ? bloodGroup : "",
    bankName: String(input.bankName || "").trim(),
    bankAccountName: String(input.bankAccountName || "").trim(),
    bankAccountNumber: String(input.bankAccountNumber || "").trim(),
    bankBranch: String(input.bankBranch || "").trim(),
    salaryAmount: Math.max(0, Number(input.salaryAmount) || 0),
    payType: VALID_PAY_TYPES.includes(payType) ? payType : "MONTHLY",
  };
}

function normalizeDocumentInput(input = {}) {
  const documentType = String(input.documentType || "OTHER").trim().toUpperCase();
  return {
    documentType: VALID_DOCUMENT_TYPES.includes(documentType) ? documentType : "OTHER",
    title: String(input.title || "").trim(),
  };
}

export class EmployeeService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async listEmployees(params, actor) {
    const { page, pageSize } = parsePagination(params);
    return this.databaseManager.withClient(async (client) => {
      const filterParams = {
        tenantId: actor.tenantId,
        status: params.status || null,
        department: params.department || null,
        departmentId: params.departmentId || null,
        designationId: params.designationId || null,
        search: params.search || null,
      };
      const total = await countEmployees(client, filterParams);
      const items = await listEmployeesPage(client, filterParams, pageSize, (page - 1) * pageSize);
      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async listActiveEmployees(actor) {
    return this.databaseManager.withClient((client) => listAllActiveEmployees(client, actor.tenantId));
  }

  async getEmployee(id, actor) {
    return this.databaseManager.withClient(async (client) => {
      const emp = await findEmployeeById(client, id, actor.tenantId);
      assert(emp, "Employee not found.", 404);
      return emp;
    });
  }

  async hydrateMasterData(client, data, actor) {
    if (data.departmentId) {
      const department = await findDepartmentById(client, data.departmentId, actor.tenantId);
      assert(department && !department.deletedAt, "Department not found.", 400);
      data.department = department.name;
    }
    if (data.designationId) {
      const designation = await findDesignationById(client, data.designationId, actor.tenantId);
      assert(designation && !designation.deletedAt, "Designation not found.", 400);
      data.designation = designation.name;
    }
    return data;
  }

  async createEmployee(input, actor) {
    const data = normalizeEmployee(input);
    assert(data.name, "Employee name is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      await this.hydrateMasterData(client, data, actor);
      const year = new Date().getFullYear();
      const employeeNumber = await nextEmployeeNumber(client, actor.tenantId, year);
      const emp = {
        id: createId("emp"),
        tenantId: actor.tenantId,
        employeeNumber,
        ...data,
        createdBy: actor.id,
      };
      await insertEmployee(client, emp);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: EMPLOYEE_ACTIONS.CREATE,
        entityType: "employee",
        entityId: emp.id,
        description: `${actor.name} added employee ${emp.name}`,
        metadata: { employeeNumber, departmentId: emp.departmentId, designationId: emp.designationId },
      });
      return findEmployeeById(client, emp.id, actor.tenantId);
    });
  }

  async updateEmployee(id, input, actor) {
    const data = normalizeEmployee(input);
    assert(data.name, "Employee name is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findEmployeeById(client, id, actor.tenantId);
      assert(existing, "Employee not found.", 404);
      assert(!existing.deletedAt, "Cannot update a deleted employee.", 400);
      await this.hydrateMasterData(client, data, actor);

      await updateEmployee(client, { id, tenantId: actor.tenantId, ...data });
      const updated = await findEmployeeById(client, id, actor.tenantId);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: EMPLOYEE_ACTIONS.UPDATE,
        entityType: "employee",
        entityId: id,
        description: `${actor.name} updated employee ${existing.name}`,
        before: existing,
        after: updated,
      });
      return updated;
    });
  }

  async deleteEmployee(id, input = {}, actor) {
    const reason = String(input.reason || "").trim();
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findEmployeeById(client, id, actor.tenantId);
      assert(existing, "Employee not found.", 404);
      assert(!existing.deletedAt, "Employee already deleted.", 400);

      await softDeleteEmployee(client, id, actor.tenantId, actor.id, reason);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: EMPLOYEE_ACTIONS.DELETE,
        entityType: "employee",
        entityId: id,
        description: `${actor.name} deleted employee ${existing.name}`,
        metadata: { reason },
      });
    });
  }

  async restoreEmployee(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findEmployeeById(client, id, actor.tenantId);
      assert(existing, "Employee not found.", 404);
      assert(existing.deletedAt, "Employee is not deleted.", 400);

      await restoreEmployee(client, id, actor.tenantId);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: EMPLOYEE_ACTIONS.RESTORE,
        entityType: "employee",
        entityId: id,
        description: `${actor.name} restored employee ${existing.name}`,
        metadata: {},
      });
    });
  }

  async listDocuments(employeeId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const employee = await findEmployeeById(client, employeeId, actor.tenantId);
      assert(employee && !employee.deletedAt, "Employee not found.", 404);
      return listEmployeeDocuments(client, actor.tenantId, employeeId);
    });
  }

  async uploadDocument(employeeId, input, file, actor) {
    assert(file, "Document file is required.", 400);
    const data = normalizeDocumentInput(input);

    return this.databaseManager.withTransaction(async (client) => {
      const employee = await findEmployeeById(client, employeeId, actor.tenantId);
      assert(employee && !employee.deletedAt, "Employee not found.", 404);

      const document = await insertEmployeeDocument(client, {
        id: createId("empdoc"),
        tenantId: actor.tenantId,
        employeeId,
        documentType: data.documentType,
        title: data.title || file.originalname,
        originalFilename: file.originalname,
        storedFilename: file.filename,
        storagePath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedBy: actor.id,
      });

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: EMPLOYEE_ACTIONS.DOCUMENT_UPLOAD,
        entityType: "employee",
        entityId: employeeId,
        description: `${actor.name} uploaded document for ${employee.name}`,
        metadata: { documentId: document.id, documentType: document.documentType, originalFilename: file.originalname },
      });

      return document;
    });
  }

  async deleteDocument(employeeId, documentId, input = {}, actor) {
    const reason = String(input.reason || "").trim();
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findEmployeeDocumentById(client, actor.tenantId, employeeId, documentId);
      assert(existing && !existing.deleted_at, "Employee document not found.", 404);

      await softDeleteEmployeeDocument(client, actor.tenantId, employeeId, documentId, actor.id, reason);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: EMPLOYEE_ACTIONS.DOCUMENT_DELETE,
        entityType: "employee",
        entityId: employeeId,
        description: `${actor.name} deleted employee document ${existing.original_filename}`,
        metadata: { documentId, reason },
      });
      return { ok: true };
    });
  }

  async getDocumentDownload(employeeId, documentId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findEmployeeDocumentById(client, actor.tenantId, employeeId, documentId);
      assert(existing && !existing.deleted_at, "Employee document not found.", 404);
      assert(existing.storage_path && fs.existsSync(existing.storage_path), "Employee document file is missing.", 404);

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: EMPLOYEE_ACTIONS.DOCUMENT_DOWNLOAD,
        entityType: "employee",
        entityId: employeeId,
        description: `${actor.name} downloaded employee document ${existing.original_filename}`,
        metadata: { documentId, originalFilename: existing.original_filename },
      });

      return {
        path: existing.storage_path,
        filename: path.basename(existing.original_filename || existing.stored_filename),
      };
    });
  }
}
