import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { diffFields } from "../lib/auditDiff.js";
import { summarizeByAmount } from "../lib/aggregation.js";
import { normalizeIsoDate, normalizeIsoMonth, startOfMonth, startOfNextMonth } from "../lib/dateRanges.js";
import { findDsrById } from "../repositories/dsrRepository.js";
import {
  deleteRecord,
  findRecordById,
  insertRecord,
  listRecordsInRange,
  updateRecord,
} from "../repositories/dsrFinanceRepository.js";

const MODULES = {
  cash: {
    table: "dsr_cash_receipts",
    dateColumn: "receipt_date",
    ownerColumn: "received_by",
    entityType: "dsr_cash_receipt",
    actionBase: "cash_receipt",
    label: "cash receipt",
    dateError: "Cash receipt date must be in YYYY-MM-DD format.",
  },
  advance: {
    table: "dsr_advances",
    dateColumn: "advance_date",
    ownerColumn: "created_by",
    entityType: "dsr_advance",
    actionBase: "advance",
    label: "advance",
    dateError: "Advance date must be in YYYY-MM-DD format.",
  },
};

function getModuleConfig(kind) {
  const config = MODULES[kind];
  assert(config, "Unsupported DSR finance module.");
  return config;
}

function normalizeRecord(input, fallbackDate, message) {
  const amount = Number(input.amount);
  const note = String(input.note || "").trim();
  const dsrId = String(input.dsrId || "").trim();
  const date = normalizeIsoDate(input.date, fallbackDate, message);

  assert(dsrId, "DSR is required.");
  assert(amount > 0, "Amount must be greater than zero.");
  assert(note, "Note is required.");

  return {
    id: input.id || createId("dsr-finance"),
    date,
    dsrId,
    amount,
    note,
  };
}

function aggregateRecords(records) {
  const { count, totalAmount, groups } = summarizeByAmount(
    records,
    (record) => record.dsrId,
    (record) => ({ dsrId: record.dsrId, dsrName: record.dsrName, dsrArea: record.dsrArea, dsrPhone: record.dsrPhone }),
  );

  return { count, totalAmount, byDsr: groups };
}

export class DsrFinanceService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async getReport(kind, query = {}, actor) {
    const config = getModuleConfig(kind);
    const selectedDate = normalizeIsoDate(query.date, new Date().toISOString().slice(0, 10), config.dateError);
    const selectedMonth = normalizeIsoMonth(query.month, selectedDate.slice(0, 7));
    const selectedDsrId = String(query.dsrId || "").trim();
    const monthStart = startOfMonth(selectedMonth);
    const nextMonthStart = startOfNextMonth(selectedMonth);

    const client = await this.databaseManager.getPool().connect();
    try {
      if (selectedDsrId) {
        const dsrResult = await findDsrById(client, selectedDsrId, actor.tenantId);
        assert(dsrResult.rowCount > 0, "Select a valid DSR.");
      }

      const monthlyRecords = await listRecordsInRange(
        client,
        config,
        monthStart,
        nextMonthStart,
        selectedDsrId,
        actor.tenantId,
      );
      const dailyRecords = monthlyRecords.filter((record) => record.date === selectedDate);

      return {
        date: selectedDate,
        month: selectedMonth,
        dsrId: selectedDsrId,
        dailyRecords,
        monthlyRecords,
        dailySummary: aggregateRecords(dailyRecords),
        monthlySummary: aggregateRecords(monthlyRecords),
      };
    } finally {
      client.release();
    }
  }

  async saveRecord(kind, input, actor) {
    const config = getModuleConfig(kind);
    const fallbackDate = new Date().toISOString().slice(0, 10);
    const record = normalizeRecord(input, fallbackDate, config.dateError);

    return this.databaseManager.withTransaction(async (client) => {
      const dsrResult = await findDsrById(client, record.dsrId, actor.tenantId);
      assert(dsrResult.rowCount > 0, "Select a valid DSR.");

      if (input.id) {
        assert(String(input.reason || "").trim(), "Edit reason is required.");

        const existingRecord = await findRecordById(client, config, record.id, actor.tenantId);
        assert(existingRecord, `${config.label} not found.`, 404);

        await updateRecord(client, config, record, actor.tenantId);

        const { before, after } = diffFields(existingRecord, record, ["date", "dsrId", "amount", "note"]);

        await this.recordActivity(client, actor, {
          actionType: `${config.actionBase}.update`,
          entityType: config.entityType,
          entityId: record.id,
          description: `${actor.name} updated ${config.label} for ${dsrResult.rows[0].name}`,
          metadata: { date: record.date, dsrId: record.dsrId, amount: record.amount },
          before,
          after,
          reason: input.reason,
        });
      } else {
        record.performedBy = actor.id;
        record.tenantId = actor.tenantId;
        await insertRecord(client, config, record);
        await this.recordActivity(client, actor, {
          actionType: `${config.actionBase}.create`,
          entityType: config.entityType,
          entityId: record.id,
          description: `${actor.name} created ${config.label} for ${dsrResult.rows[0].name}`,
          metadata: { date: record.date, dsrId: record.dsrId, amount: record.amount },
        });
      }

      const saved = await findRecordById(client, config, record.id, actor.tenantId);
      assert(saved, `${config.label} not found.`, 404);
      return saved;
    });
  }

  async removeRecord(kind, recordId, actor) {
    const config = getModuleConfig(kind);

    return this.databaseManager.withTransaction(async (client) => {
      const existingRecord = await findRecordById(client, config, recordId, actor.tenantId);
      assert(existingRecord, `${config.label} not found.`, 404);

      const result = await deleteRecord(client, config, recordId, actor.tenantId);
      assert(result.rowCount > 0, `${config.label} not found.`, 404);

      await this.recordActivity(client, actor, {
        actionType: `${config.actionBase}.delete`,
        entityType: config.entityType,
        entityId: recordId,
        description: `${actor.name} deleted ${config.label} for ${existingRecord.dsrName}`,
        metadata: { date: existingRecord.date, dsrId: existingRecord.dsrId, amount: existingRecord.amount },
      });

      return { ok: true };
    });
  }

  async recordActivity(client, actor, payload) {
    if (!this.auditService || !actor) {
      return;
    }

    await this.auditService.record(client, {
      tenantId: actor.tenantId,
      userId: actor.id,
      actionType: payload.actionType,
      entityType: payload.entityType,
      entityId: payload.entityId,
      module: payload.module,
      before: payload.before,
      after: payload.after,
      reason: payload.reason,
      description: payload.description,
      metadata: {
        actorName: actor.name,
        actorRole: actor.role,
        ...payload.metadata,
      },
    });
  }
}
