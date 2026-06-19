import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { cleanMoney } from "../lib/normalizers.js";
import { RETAIL_CASH_SESSION_ACTIONS } from "../lib/auditActions.js";
import {
  closeRetailCashSession,
  findActiveRetailCashSession,
  findRetailCashSessionById,
  getRetailCashSessionSalesSummary,
  insertRetailCashSession,
  mapRetailCashSession,
} from "../repositories/retailCashSessionRepository.js";
import { findTenantById } from "../repositories/tenantRepository.js";
import { logActivity } from "./shared/inventoryHelpers.js";

function toSessionResult(sessionRow, summary = {}) {
  const session = mapRetailCashSession(sessionRow);
  const cashSalesCount = summary.cashSalesCount ?? session.cashSalesCount;
  const cashSalesAmount = summary.cashSalesAmount ?? session.cashSalesAmount;
  const expectedCash = session.openingCash + cashSalesAmount;
  return {
    ...session,
    cashSalesCount,
    cashSalesAmount,
    expectedCash,
    variance: session.countedCash === null || session.countedCash === undefined ? 0 : session.variance,
  };
}

export class RetailCashSessionService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  recordActivity(client, actor, payload) {
    return logActivity(this.auditService, client, actor, payload);
  }

  async getCurrentSession(actor) {
    return this.databaseManager.withClient(async (client) => {
      const result = await findActiveRetailCashSession(client, actor.tenantId);
      if (!result.rowCount) {
        return { session: null };
      }

      const session = mapRetailCashSession(result.rows[0]);
      const summary = await getRetailCashSessionSalesSummary(client, {
        tenantId: actor.tenantId,
        startedAt: session.startedAt,
        endedAt: new Date().toISOString(),
      });

      return { session: toSessionResult(session, summary) };
    });
  }

  async startSession(input, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const tenant = await findTenantById(client, actor.tenantId);
      assert(tenant, "Tenant not found.", 404);

      const active = await findActiveRetailCashSession(client, actor.tenantId);
      assert(active.rowCount === 0, "A cash session is already open.");

      const openingCash = Math.max(0, cleanMoney(input.openingCash));
      const session = {
        id: createId("retail-cash-session"),
        tenantId: actor.tenantId,
        openedById: actor.id,
        openingCash,
        note: String(input.note || "").trim(),
      };

      const inserted = await insertRetailCashSession(client, session);
      const summary = await getRetailCashSessionSalesSummary(client, {
        tenantId: actor.tenantId,
        startedAt: inserted.rows[0].started_at,
        endedAt: new Date().toISOString(),
      });

      await this.recordActivity(client, actor, {
        actionType: RETAIL_CASH_SESSION_ACTIONS.CREATE,
        entityType: "retail_cash_session",
        entityId: inserted.rows[0].id,
        description: `${actor.name} started a retail cash session with opening cash ${openingCash}`,
        metadata: {
          openingCash,
        },
      });

      return { session: toSessionResult(inserted.rows[0], summary) };
    });
  }

  async stopSession(sessionId, input, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await findRetailCashSessionById(client, sessionId, actor.tenantId);
      assert(result.rowCount > 0, "Cash session not found.", 404);

      const current = mapRetailCashSession(result.rows[0]);
      assert(current.isOpen, "This cash session is already closed.");

      const now = new Date().toISOString();
      const summary = await getRetailCashSessionSalesSummary(client, {
        tenantId: actor.tenantId,
        startedAt: current.startedAt,
        endedAt: now,
      });

      const countedCash = Math.max(0, cleanMoney(input.countedCash));
      const expectedCash = current.openingCash + summary.cashSalesAmount;
      const variance = countedCash - expectedCash;

      const closed = await closeRetailCashSession(client, {
        id: current.id,
        tenantId: actor.tenantId,
        closedById: actor.id,
        closedAt: now,
        countedCash,
        cashSalesCount: summary.cashSalesCount,
        cashSalesAmount: summary.cashSalesAmount,
        expectedCash,
        variance,
      });
      assert(closed.rowCount > 0, "This cash session is already closed.");

      await this.recordActivity(client, actor, {
        actionType: RETAIL_CASH_SESSION_ACTIONS.CLOSE,
        entityType: "retail_cash_session",
        entityId: current.id,
        description: `${actor.name} closed retail cash session ${current.id}`,
        metadata: {
          openingCash: current.openingCash,
          cashSalesCount: summary.cashSalesCount,
          cashSalesAmount: summary.cashSalesAmount,
          countedCash,
          expectedCash,
          variance,
        },
      });

      return { session: toSessionResult(closed.rows[0]) };
    });
  }
}
