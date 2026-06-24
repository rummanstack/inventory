import { assert } from "../lib/errors.js";
import { normalizeIsoDate } from "../lib/dateRanges.js";
import { parsePagination, buildPageResult } from "../lib/pagination.js";
import { normalizeRepairJob } from "../lib/normalizers.js";
import {
  REPAIR_JOB_STATUS_VALUES,
  REPAIR_JOB_STATUSES,
  REPAIR_JOB_APPROVAL_STATUS_VALUES,
  REPAIR_JOB_CLOSED_STATUSES,
} from "../lib/repairJobs.js";
import { REPAIR_JOB_ACTIONS } from "../lib/auditActions.js";
import { nextRepairJobNumber } from "../lib/repairJobNumber.js";
import {
  countRepairJobs,
  listRepairJobsPage,
  findRepairJobById,
  findRepairJobForUpdate,
  insertRepairJob,
  updateRepairJob,
  softDeleteRepairJob,
  countTrashedRepairJobs,
  listTrashedRepairJobs,
  mapRepairJob,
} from "../repositories/repairJobRepository.js";
import { logActivity } from "./shared/inventoryHelpers.js";

const DATE_ERROR = "Received date must be in YYYY-MM-DD format.";

export class RepairJobService {
  constructor(databaseManager, { auditService } = {}) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  async listJobs(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const dateFrom = String(query.dateFrom || "").trim()
      ? normalizeIsoDate(query.dateFrom, query.dateFrom, DATE_ERROR)
      : undefined;
    const dateTo = String(query.dateTo || "").trim()
      ? normalizeIsoDate(query.dateTo, query.dateTo, DATE_ERROR)
      : undefined;

    const filters = {
      tenantId: actor.tenantId,
      status: String(query.status || "").trim().toUpperCase() || undefined,
      technicianId: String(query.technicianId || "").trim() || undefined,
      search: String(query.search || "").trim() || undefined,
      dateFrom,
      dateTo,
    };

    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listRepairJobsPage(client, { ...filters, limit, offset }),
        countRepairJobs(client, filters),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    });
  }

  async getJob(jobId, actor) {
    return this.databaseManager.withClient(async (client) => {
      const result = await findRepairJobById(client, jobId, actor.tenantId);
      assert(result.rowCount > 0, "Repair job not found.", 404);
      return mapRepairJob(result.rows[0]);
    });
  }

  async createJob(input, actor) {
    const job = normalizeRepairJob(input);
    assert(job.customerName, "Customer name is required.");
    assert(job.problemDescription, "Problem description is required.");
    assert(job.receivedDate, "Received date is required.");
    job.receivedDate = normalizeIsoDate(job.receivedDate, job.receivedDate, DATE_ERROR);
    job.tenantId = actor.tenantId;
    job.createdById = actor.id;

    return this.databaseManager.withTransaction(async (client) => {
      const year = new Date(job.receivedDate).getUTCFullYear();
      job.jobNumber = await nextRepairJobNumber(client, actor.tenantId, year);

      const result = await insertRepairJob(client, job);
      await this.recordActivity(client, actor, {
        actionType: REPAIR_JOB_ACTIONS.CREATE,
        entityType: "repair_job",
        entityId: job.id,
        description: `${actor.name} created repair job ${job.jobNumber}`,
        metadata: { jobNumber: job.jobNumber, customerName: job.customerName, status: job.status },
      });

      return mapRepairJob(result.rows[0]);
    });
  }

  async updateJob(jobId, input, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existingResult = await findRepairJobForUpdate(client, jobId, actor.tenantId);
      assert(existingResult.rowCount > 0, "Repair job not found.", 404);
      const existing = existingResult.rows[0];

      assert(
        !REPAIR_JOB_CLOSED_STATUSES.includes(existing.status),
        `Repair job is already ${existing.status} and cannot be modified.`,
        400,
      );

      const status = REPAIR_JOB_STATUS_VALUES.includes(String(input.status || "").trim().toUpperCase())
        ? String(input.status).trim().toUpperCase()
        : existing.status;

      const approvalStatus = REPAIR_JOB_APPROVAL_STATUS_VALUES.includes(
        String(input.approvalStatus || "").trim().toUpperCase(),
      )
        ? String(input.approvalStatus).trim().toUpperCase()
        : existing.approval_status;

      let deliveredDate =
        input.deliveredDate !== undefined
          ? String(input.deliveredDate || "").trim() || null
          : existing.delivered_date || null;
      if (status === REPAIR_JOB_STATUSES.DELIVERED && !deliveredDate) {
        deliveredDate = new Date().toISOString().slice(0, 10);
      }

      const patch = {
        id: jobId,
        tenantId: actor.tenantId,
        status,
        approvalStatus,
        technicianId:
          input.technicianId !== undefined
            ? String(input.technicianId || "").trim() || null
            : existing.technician_id,
        laborCost:
          input.laborCost !== undefined ? Math.max(0, Number(input.laborCost) || 0) : Number(existing.labor_cost || 0),
        actualCost:
          input.actualCost !== undefined ? Math.max(0, Number(input.actualCost) || 0) : Number(existing.actual_cost || 0),
        partsUsed: input.partsUsed !== undefined ? String(input.partsUsed || "").trim() : existing.parts_used,
        promisedDate:
          input.promisedDate !== undefined
            ? String(input.promisedDate || "").trim() || null
            : existing.promised_date,
        deliveredDate,
        resolutionNote:
          input.resolutionNote !== undefined ? String(input.resolutionNote || "").trim() : existing.resolution_note,
      };

      const result = await updateRepairJob(client, patch);
      await this.recordActivity(client, actor, {
        actionType: REPAIR_JOB_ACTIONS.UPDATE,
        entityType: "repair_job",
        entityId: jobId,
        description: `${actor.name} updated repair job ${existing.job_number} → ${status}`,
        metadata: { jobNumber: existing.job_number, status, approvalStatus },
      });

      return mapRepairJob(result.rows[0]);
    });
  }

  async removeJob(jobId, actor, reason) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await softDeleteRepairJob(client, jobId, actor.tenantId, {
        deletedById: actor.id,
        deleteReason: reason,
      });
      assert(result.rowCount > 0, "Repair job not found.", 404);

      await this.recordActivity(client, actor, {
        actionType: REPAIR_JOB_ACTIONS.DELETE,
        entityType: "repair_job",
        entityId: jobId,
        description: `${actor.name} removed repair job ${jobId}${reason ? ` (${reason})` : ""}`,
      });

      return { ok: true };
    });
  }

  async listTrashed(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    return this.databaseManager.withClient(async (client) => {
      const [items, total] = await Promise.all([
        listTrashedRepairJobs(client, { tenantId: actor.tenantId, limit, offset }),
        countTrashedRepairJobs(client, actor.tenantId),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    });
  }
}
