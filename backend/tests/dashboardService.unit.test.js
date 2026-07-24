import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { DashboardService } from '../services/dashboardService.js';
import { createDashboardRoutes } from '../routes/dashboard.routes.js';
import { PERMISSIONS } from '../lib/permissions.js';
import { setCachedPermissions } from '../lib/permissionCache.js';
import { setCachedFeatures } from '../lib/tenantFeatureCache.js';

const actor = { id: 'dashboard-user', name: 'Owner', role: 'super_admin', tenantId: 'tenant-a' };

function databaseManagerFor(sellerType) {
  return {
    withClient: async (callback) => callback({
      query: async () => ({ rows: [{
        id: actor.tenantId,
        name: 'Dashboard Tenant',
        slug: 'dashboard-tenant',
        status: 'ACTIVE',
        business_type: 'GROCERY',
        seller_type: sellerType,
      }] }),
    }),
  };
}

function baseServices() {
  return {
    financeDashboardService: {
      getDashboard: async () => ({
        accounts: [{ id: 'cash', type: 'CASH', balance: 1000 }, { id: 'bank', type: 'BANK', balance: 2000 }],
        totalDsrDue: 400,
        totalCustomerDue: 250,
        totalSupplierDue: 300,
        monthlyExpenses: 50,
        revenueVsLastMonth: 12,
        profitVsLastMonth: 8,
      }),
      getMonthlyTrend: async () => ({ rows: [{ month: '2026-07', totalSales: 5000, totalProfit: 900 }] }),
    },
    productService: {
      getProductsDirectory: async () => ({ products: [{ id: 'p1', name: 'Tea', category: 'Drinks', piecesPerCase: 12, purchasePrice: 10, stockPieces: 20, damagedPieces: 1 }] }),
    },
    salesInvoiceService: {
      getDailySalesReport: async () => ({ rows: [{ date: '2026-07-25', invoiceCount: 2, totalAmount: 500, paidAmount: 400, totalProfit: 100 }] }),
      listSalesInvoices: async () => ({ items: [{ id: 'invoice-1', invoiceDate: '2026-07-25', createdAt: '2026-07-25T10:00:00Z', totalAmount: 500, paidAmount: 400, dueAmount: 100, totalProfit: 100, paymentMethod: 'CASH', items: [{ productId: 'p1', productName: 'Tea', quantityPieces: 5, lineTotal: 500, costPriceSnapshot: 60 }] }] }),
    },
    expenseService: {
      getExpenseReport: async () => ({ monthlySummary: { totalAmount: 50, byCategory: [] } }),
    },
    profitService: {
      getProfitReport: async ({ dateFrom, dateTo }) => ({ dateFrom, dateTo, totals: { revenue: 5000, profit: 900 } }),
    },
    salesReturnService: { listSalesReturns: async () => ({ items: [] }) },
    retailCashSessionService: { getCurrentSession: async () => ({ session: null }) },
    dsrService: { getDsrsDirectory: async () => ({ dsrs: [{ id: 'd1', name: 'Rahim', status: 'Active' }] }) },
    issueService: { listIssues: async () => ({ items: [{ id: 'i1', dsrId: 'd1', items: [{ issuedPieces: 10 }] }] }) },
    settlementService: {
      listSettlements: async () => ({ items: [{ id: 's1', dsrId: 'd1', dsrName: 'Rahim', area: 'North', totalPayable: 800, amountPaid: 700, dueAmount: 100, items: [{ productId: 'p1', productName: 'Tea', soldPieces: 8, returnedPieces: 2, rate: 100, costPrice: 60 }] }] }),
      getSettlementReport: async () => ({ rows: [{ date: '2026-07-25', settlementCount: 1, totalPayable: 800, amountPaid: 700 }] }),
    },
    dsrDueLedgerService: { listLedger: async () => ({ items: [] }) },
  };
}

test('dealer dashboard returns a complete dealer profile from one service call', async () => {
  const service = new DashboardService(databaseManagerFor('DEALER'), baseServices());
  const result = await service.getDashboard({ date: '2026-07-25' }, actor);

  assert.equal(result.version, 1);
  assert.equal(result.meta.profile, 'DEALER');
  assert.equal(result.shared.kpis.receivables, 400);
  assert.equal(result.shared.inventory.byCategory[0].label, 'Drinks');
  assert.equal(result.operations.type, 'DEALER');
  assert.equal(result.operations.today.settledDsrs, 1);
  assert.equal(result.operations.leaderboard[0].name, 'Rahim');
});

test('retailer dashboard returns retail operations and customer receivables', async () => {
  const service = new DashboardService(databaseManagerFor('RETAILER'), baseServices());
  const result = await service.getDashboard({ date: '2026-07-25' }, actor);

  assert.equal(result.meta.profile, 'RETAILER');
  assert.equal(result.shared.kpis.receivables, 250);
  assert.equal(result.operations.type, 'RETAILER');
  assert.equal(result.operations.today.invoiceCount, 2);
  assert.equal(result.operations.today.netSales, 500);
  assert.equal(result.operations.paymentMix[0].method, 'CASH');
});

test('dashboard route authorizes once with view_state and dashboard feature', async () => {
  const controller = { getDashboard: (_req, res) => res.json({ ok: true }) };
  const app = express();
  app.use((req, _res, next) => { req.currentUser = actor; next(); });
  app.use(createDashboardRoutes(controller));
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));

  setCachedFeatures(actor.tenantId, ['dashboard']);
  setCachedPermissions(actor.role, actor.tenantId, []);
  assert.equal((await request(app).get('/')).status, 403);

  setCachedPermissions(actor.role, actor.tenantId, [PERMISSIONS.VIEW_STATE]);
  const response = await request(app).get('/');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ok: true });
});
