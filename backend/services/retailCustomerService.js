import { assert } from "../lib/errors.js";
import { normalizeRetailCustomer } from "../lib/normalizers.js";
import { buildPageResult, parsePagination } from "../lib/pagination.js";
import {
  countRetailCustomers,
  countTrashedRetailCustomers,
  findRetailCustomerById,
  insertRetailCustomer,
  listAllActiveRetailCustomers,
  listRetailCustomersPage,
  listTrashedRetailCustomers,
  mapRetailCustomer,
  permanentlyDeleteRetailCustomer,
  restoreRetailCustomer,
  softDeleteRetailCustomer,
  updateRetailCustomer,
} from "../repositories/retailCustomerRepository.js";

function toIsoDateOnly(value) {
  return value ? String(value).slice(0, 10) : null;
}

function daysBetweenIsoDates(later, earlier) {
  if (!later || !earlier) {
    return null;
  }

  const end = new Date(`${later}T00:00:00Z`);
  const start = new Date(`${earlier}T00:00:00Z`);
  if (Number.isNaN(end.getTime()) || Number.isNaN(start.getTime())) {
    return null;
  }

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
}

function customerTierFromStats(customer) {
  const purchaseCount = Number(customer.purchaseCount || 0);
  const totalSpent = Number(customer.totalSpent || 0);

  if (purchaseCount === 0) return "NEW";
  if (purchaseCount >= 12 || totalSpent >= 100000) return "VIP";
  if (purchaseCount >= 5 || totalSpent >= 25000) return "LOYAL";
  if (purchaseCount >= 2) return "REPEAT";
  return "NEW";
}

function enrichRetentionCustomer(customer, referenceDate) {
  const purchaseCount = Number(customer.purchaseCount || 0);
  const lastPurchaseAt = toIsoDateOnly(customer.lastPurchaseAt);
  const firstPurchaseAt = toIsoDateOnly(customer.firstPurchaseAt);
  const daysSinceLastPurchase = lastPurchaseAt ? daysBetweenIsoDates(referenceDate, lastPurchaseAt) : null;
  const pointsBalance = Math.max(0, Number(customer.loyaltyPointsBalance || 0));
  const pointsToNextReward = pointsBalance > 0 ? (100 - (pointsBalance % 100)) % 100 : 100;
  const averageDaysBetweenPurchases = purchaseCount > 1 && firstPurchaseAt && lastPurchaseAt
    ? Number(((daysBetweenIsoDates(lastPurchaseAt, firstPurchaseAt)) / (purchaseCount - 1)).toFixed(1))
    : null;

  return {
    ...customer,
    firstPurchaseAt,
    lastPurchaseAt,
    daysSinceLastPurchase,
    pointsBalance,
    pointsToNextReward,
    averageDaysBetweenPurchases,
    customerTier: customerTierFromStats(customer),
    hasPurchaseHistory: purchaseCount > 0,
    repeatPurchase: purchaseCount > 1,
  };
}

export class RetailCustomerService {
  constructor(databaseManager, { auditService } = {}) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async recordActivity(client, actor, payload) {
    if (!this.auditService || !actor) return;
    await this.auditService.record(client, {
      tenantId: actor.tenantId || null,
      userId: actor.id,
      actionType: payload.actionType,
      entityType: payload.entityType,
      entityId: payload.entityId,
      module: payload.module || "retail-customers",
      before: payload.before,
      after: payload.after,
      reason: payload.reason,
      description: payload.description,
      metadata: { actorName: actor.name, actorRole: actor.role, ...payload.metadata },
    });
  }

  async listRetailCustomers(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const search = String(query.search || "").trim();
    const status = query.status === "ACTIVE" || query.status === "INACTIVE" ? query.status : undefined;
    const tenantId = actor.tenantId;

    const client = await this.databaseManager.getPool().connect();
    try {
      const [items, total] = await Promise.all([
        listRetailCustomersPage(client, { search, status, tenantId, limit, offset }),
        countRetailCustomers(client, { search, status, tenantId }),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }

  async listActiveRetailCustomers(actor) {
    const client = await this.databaseManager.getPool().connect();
    try {
      return listAllActiveRetailCustomers(client, actor.tenantId);
    } finally {
      client.release();
    }
  }

  async getRetailCustomer(id, actor) {
    const client = await this.databaseManager.getPool().connect();
    try {
      const result = await findRetailCustomerById(client, id, actor.tenantId);
      assert(result.rowCount > 0, "Retail customer not found.", 404);
      return mapRetailCustomer(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async saveRetailCustomer(input, actor) {
    const customer = normalizeRetailCustomer(input);
    assert(customer.name, "Customer name is required.");
    customer.tenantId = actor.tenantId;

    return this.databaseManager.withTransaction(async (client) => {
      let result;

      if (input.id) {
        const existing = await findRetailCustomerById(client, customer.id, actor.tenantId);
        assert(existing.rowCount > 0, "Retail customer not found.", 404);
        customer.loyaltyPointsBalance = Number(existing.rows[0].loyalty_points_balance || 0);
        result = await updateRetailCustomer(client, customer);
        assert(result.rowCount > 0, "Retail customer not found.", 404);

        await this.recordActivity(client, actor, {
          actionType: "retail_customer.update",
          entityType: "retail_customer",
          entityId: customer.id,
          description: `${actor.name} updated retail customer ${customer.name}`,
        });
      } else {
        customer.createdById = actor.id;
        customer.loyaltyPointsBalance = Math.max(0, Number(customer.loyaltyPointsBalance || 0));
        result = await insertRetailCustomer(client, customer);

        await this.recordActivity(client, actor, {
          actionType: "retail_customer.create",
          entityType: "retail_customer",
          entityId: customer.id,
          description: `${actor.name} created retail customer ${customer.name}`,
        });
      }

      const fullResult = await findRetailCustomerById(client, result.rows[0].id, actor.tenantId);
      return mapRetailCustomer(fullResult.rows[0]);
    });
  }

  async removeRetailCustomer(id, actor, reason) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findRetailCustomerById(client, id, actor.tenantId);
      assert(existing.rowCount > 0, "Retail customer not found.", 404);

      await softDeleteRetailCustomer(client, id, actor.tenantId, { deletedById: actor.id, deleteReason: reason });

      await this.recordActivity(client, actor, {
        actionType: "retail_customer.delete",
        entityType: "retail_customer",
        entityId: id,
        description: `${actor.name} moved retail customer ${existing.rows[0].name} to trash${reason ? ` (${reason})` : ""}`,
      });

      return { ok: true };
    });
  }

  async restoreRetailCustomer(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await restoreRetailCustomer(client, id, actor.tenantId);
      assert(result.rowCount > 0, "Retail customer not found in trash.", 404);

      await this.recordActivity(client, actor, {
        actionType: "retail_customer.restore",
        entityType: "retail_customer",
        entityId: id,
        description: `${actor.name} restored retail customer ${result.rows[0].name} from trash`,
      });

      return { ok: true };
    });
  }

  async permanentlyDeleteRetailCustomer(id, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const result = await permanentlyDeleteRetailCustomer(client, id, actor.tenantId);
      assert(result.rowCount > 0, "Retail customer not found in trash.", 404);

      await this.recordActivity(client, actor, {
        actionType: "retail_customer.permanent_delete",
        entityType: "retail_customer",
        entityId: id,
        description: `${actor.name} permanently deleted retail customer ${id}`,
      });

      return { ok: true };
    });
  }

  async listTrashedRetailCustomers(query = {}, actor) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const tenantId = actor.tenantId;

    const client = await this.databaseManager.getPool().connect();
    try {
      const [items, total] = await Promise.all([
        listTrashedRetailCustomers(client, { tenantId, limit, offset }),
        countTrashedRetailCustomers(client, tenantId),
      ]);
      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }

  async getRetentionInsights(query = {}, actor) {
    const inactiveWindowDays = Math.max(7, Number.parseInt(query.inactiveWindowDays, 10) || 30);

    return this.databaseManager.withClient(async (client) => {
      const result = await client.query(
        `SELECT rc.id,
                rc.name,
                rc.phone,
                rc.address,
                rc.status,
                rc.loyalty_points_balance,
                rc.created_at,
                stats.purchase_count,
                stats.first_purchase_at,
                stats.last_purchase_at,
                stats.total_spent,
                stats.total_paid
         FROM retail_customers rc
         LEFT JOIN (
           SELECT customer_id,
                  COUNT(*)::INTEGER AS purchase_count,
                  MIN(invoice_date) AS first_purchase_at,
                  MAX(invoice_date) AS last_purchase_at,
                  COALESCE(SUM(total_amount), 0) AS total_spent,
                  COALESCE(SUM(paid_amount), 0) AS total_paid
           FROM sales_invoices
           WHERE tenant_id = $1 AND deleted_at IS NULL AND customer_id IS NOT NULL
           GROUP BY customer_id
         ) stats ON stats.customer_id = rc.id
         WHERE rc.tenant_id = $1 AND rc.deleted_at IS NULL
         ORDER BY COALESCE(stats.last_purchase_at, DATE '1900-01-01') DESC, stats.purchase_count DESC NULLS LAST, rc.name ASC`,
        [actor.tenantId],
      );

      const referenceDate = new Date().toISOString().slice(0, 10);
      const customers = result.rows.map((row) => enrichRetentionCustomer({
        id: row.id,
        name: row.name,
        phone: row.phone,
        address: row.address,
        status: row.status,
        loyaltyPointsBalance: Number(row.loyalty_points_balance || 0),
        purchaseCount: Number(row.purchase_count || 0),
        firstPurchaseAt: row.first_purchase_at || null,
        lastPurchaseAt: row.last_purchase_at || null,
        totalSpent: Number(row.total_spent || 0),
        totalPaid: Number(row.total_paid || 0),
        createdAt: row.created_at,
      }, referenceDate));

      const purchasedCustomers = customers.filter((customer) => customer.purchaseCount > 0);
      const repeatCustomerMatches = customers.filter((customer) => customer.purchaseCount > 1);
      const repeatCustomers = repeatCustomerMatches
        .sort((left, right) => right.purchaseCount - left.purchaseCount || right.totalSpent - left.totalSpent || String(right.lastPurchaseAt || '').localeCompare(String(left.lastPurchaseAt || '')))
        .slice(0, 10);
      const inactiveCustomerMatches = customers.filter((customer) => !customer.lastPurchaseAt || customer.daysSinceLastPurchase >= inactiveWindowDays);
      const inactiveCustomers = inactiveCustomerMatches
        .sort((left, right) => (right.daysSinceLastPurchase || 99999) - (left.daysSinceLastPurchase || 99999))
        .slice(0, 10);
      const rewardCandidateMatches = customers.filter((customer) => customer.pointsToNextReward > 0 && customer.pointsToNextReward <= 20);
      const rewardCandidates = rewardCandidateMatches
        .sort((left, right) => left.pointsToNextReward - right.pointsToNextReward || right.loyaltyPointsBalance - left.loyaltyPointsBalance)
        .slice(0, 10);
      const vipCustomers = customers.filter((customer) => customer.customerTier === 'VIP');

      const totalRepeatPurchases = repeatCustomerMatches.reduce((sum, customer) => sum + customer.purchaseCount, 0);
      const averageDaysBetweenPurchases = purchasedCustomers.length
        ? Number((purchasedCustomers
          .map((customer) => customer.averageDaysBetweenPurchases)
          .filter((value) => Number.isFinite(value))
          .reduce((sum, value) => sum + value, 0) / Math.max(1, purchasedCustomers.filter((customer) => Number.isFinite(customer.averageDaysBetweenPurchases)).length || 1)).toFixed(1))
        : null;

      const summary = {
        totalCustomers: customers.length,
        purchasedCustomers: purchasedCustomers.length,
        repeatCustomers: repeatCustomerMatches.length,
        inactiveCustomers: inactiveCustomerMatches.length,
        neverPurchasedCustomers: customers.filter((customer) => customer.purchaseCount === 0).length,
        nearRewardCustomers: rewardCandidateMatches.length,
        vipCustomers: vipCustomers.length,
        repeatPurchaseRate: purchasedCustomers.length ? Number(((repeatCustomerMatches.length / purchasedCustomers.length) * 100).toFixed(1)) : 0,
        activeRetentionRate: customers.length ? Number((((customers.length - inactiveCustomerMatches.length) / customers.length) * 100).toFixed(1)) : 0,
        averagePurchasesPerCustomer: customers.length ? Number((purchasedCustomers.reduce((sum, customer) => sum + customer.purchaseCount, 0) / customers.length).toFixed(1)) : 0,
        averageDaysBetweenPurchases,
        totalLoyaltyPoints: customers.reduce((sum, customer) => sum + customer.pointsBalance, 0),
        totalRepeatPurchases,
      };

      return {
        summary,
        inactiveWindowDays,
        repeatCustomers,
        inactiveCustomers,
        rewardCandidates,
        customerCount: customers.length,
        customers,
      };
    });
  }
}
