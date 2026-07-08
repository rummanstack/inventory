import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { diffFields } from "../lib/auditDiff.js";
import { summarizeByAmount } from "../lib/aggregation.js";
import { normalizeIsoDate, normalizeIsoMonth, startOfMonth, startOfNextMonth } from "../lib/dateRanges.js";
import { DSR_DUE_LEDGER_TYPES } from "../lib/dsrDueLedger.js";
import { findDsrById } from "../repositories/dsrRepository.js";
import { getLatestDueLedgerEntry } from "../repositories/dsrDueLedgerRepository.js";
import {
  deleteRecord,
  findRecordById,
  insertRecord,
  listRecordsInRange,
  updateRecord,
} from "../repositories/dsrFinanceRepository.js";
import { recordDueLedgerEntry } from "./shared/inventoryHelpers.js";

const MODULES = {
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
  constructor(databaseManager, { auditService, financeAccountService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
    this.financeAccountService = financeAccountService;
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

        const amountDelta = record.amount - existingRecord.amount;
        if (kind === "advance" && amountDelta !== 0) {
          if (this.financeAccountService) {
            await this.financeAccountService.recordTransactionInClient(
              client,
              {
                accountType: "CASH",
                type: amountDelta > 0 ? "WITHDRAWAL" : "DEPOSIT",
                amount: Math.abs(amountDelta),
                date: record.date,
                note: `Advance adjusted — ${dsrResult.rows[0].name}`,
              },
              actor,
            );
          }

          const latestEntry = await getLatestDueLedgerEntry(client, record.dsrId, actor.tenantId);
          const latestBalance = latestEntry ? latestEntry.balanceAfter : 0;
          await recordDueLedgerEntry(client, {
            tenantId: actor.tenantId,
            dsrId: record.dsrId,
            type: DSR_DUE_LEDGER_TYPES.ADVANCE_ADJUSTMENT,
            debit: Math.max(0, amountDelta),
            credit: Math.max(0, -amountDelta),
            balanceAfter: latestBalance + amountDelta,
            referenceType: "dsr_advance",
            referenceId: record.id,
            note: record.note,
            createdById: actor.id,
            businessDate: record.date,
          });
        }

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

        if (kind === "advance") {
          if (this.financeAccountService) {
            await this.financeAccountService.recordTransactionInClient(
              client,
              {
                accountType: "CASH",
                type: "WITHDRAWAL",
                amount: record.amount,
                date: record.date,
                note: `Advance — ${dsrResult.rows[0].name}: ${record.note}`,
              },
              actor,
            );
          }

          const latestEntry = await getLatestDueLedgerEntry(client, record.dsrId, actor.tenantId);
          const latestBalance = latestEntry ? latestEntry.balanceAfter : 0;
          await recordDueLedgerEntry(client, {
            tenantId: actor.tenantId,
            dsrId: record.dsrId,
            type: DSR_DUE_LEDGER_TYPES.ADVANCE_ADJUSTMENT,
            debit: record.amount,
            credit: 0,
            balanceAfter: latestBalance + record.amount,
            referenceType: "dsr_advance",
            referenceId: record.id,
            note: record.note,
            createdById: actor.id,
            businessDate: record.date,
          });
        }

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

      if (kind === "advance") {
        const latestEntry = await getLatestDueLedgerEntry(client, existingRecord.dsrId, actor.tenantId);
        const latestBalance = latestEntry ? latestEntry.balanceAfter : 0;
        await recordDueLedgerEntry(client, {
          tenantId: actor.tenantId,
          dsrId: existingRecord.dsrId,
          type: DSR_DUE_LEDGER_TYPES.ADVANCE_ADJUSTMENT,
          debit: 0,
          credit: existingRecord.amount,
          balanceAfter: latestBalance - existingRecord.amount,
          referenceType: "dsr_advance",
          referenceId: recordId,
          note: `Advance deleted: ${existingRecord.note}`,
          createdById: actor.id,
          businessDate: existingRecord.date,
        });

        if (this.financeAccountService) {
          await this.financeAccountService.recordTransactionInClient(
            client,
            {
              accountType: "CASH",
              type: "DEPOSIT",
              amount: existingRecord.amount,
              date: existingRecord.date,
              note: `Advance deleted — ${existingRecord.dsrName}: ${existingRecord.note}`,
            },
            actor,
          );
        }
      }

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
