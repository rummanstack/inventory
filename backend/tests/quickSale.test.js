import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, addStock } from "./helpers/seeders.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { setCachedPermissions } from "../lib/permissionCache.js";
import { setCachedFeatures } from "../lib/tenantFeatureCache.js";
import { replaceRolePermissions } from "../repositories/rolePermissionRepository.js";
import { replaceTenantFeatures } from "../repositories/tenantFeatureRepository.js";

let databaseManager;
let tenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Quick Sale Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await closeTestApp();
});

test("a walk-in QUICK_SALE sale completes, decrements stock, and requires full payment", async () => {
  const product = await createProduct(tenant.agent, { name: `Quick Sale Widget ${Date.now()}`, retailPrice: 50 });
  await addStock(tenant.agent, product.id, 30);

  const response = await tenant.agent.post("/api/sales-invoices").send({
    customerType: "WALK_IN",
    saleType: "QUICK_SALE",
    invoiceDate: "2026-04-01",
    items: [{ productId: product.id, quantityPieces: 4, actualSalePrice: 50 }],
    discount: 0,
    paidAmount: 200,
    paymentMethod: "CASH",
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.invoice.totalAmount, 200);
  assert.equal(response.body.invoice.dueAmount, 0);

  const productResponse = await tenant.agent.get("/api/products").query({ search: product.name });
  const updated = productResponse.body.items.find((item) => item.id === product.id);
  assert.equal(updated.stockPieces, 26);
});

test("quick-sale creation uses the quick-sale permission and feature instead of sales-invoice access", async () => {
  const limitedTenant = await createTenantAndAdmin(databaseManager, (await getTestApp()).app, { name: "Quick Sale Limited Tenant" });

  // Seed the product while the fixture still has full permissions, then downgrade to
  // just manage_retail_quick_sale to simulate a cashier-only role.
  const product = await createProduct(limitedTenant.agent, { name: `Limited Quick Sale Widget ${Date.now()}`, retailPrice: 50 });
  await addStock(limitedTenant.agent, product.id, 10);

  await databaseManager.withTransaction(async (client) => {
    await replaceRolePermissions(client, "super_admin", limitedTenant.tenantId, [PERMISSIONS.MANAGE_RETAIL_QUICK_SALE]);
    await replaceTenantFeatures(client, limitedTenant.tenantId, ["retailer-quick-sale"]);
  });
  setCachedPermissions("super_admin", limitedTenant.tenantId, [PERMISSIONS.MANAGE_RETAIL_QUICK_SALE]);
  setCachedFeatures(limitedTenant.tenantId, ["retailer-quick-sale"]);

  const response = await limitedTenant.agent.post("/api/sales-invoices").send({
    customerType: "WALK_IN",
    saleType: "QUICK_SALE",
    invoiceDate: "2026-04-01",
    items: [{ productId: product.id, quantityPieces: 1, actualSalePrice: 50 }],
    discount: 0,
    paidAmount: 50,
    paymentMethod: "CASH",
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.invoice.saleType, "QUICK_SALE");

  await databaseManager.withTransaction(async (client) => {
    await replaceRolePermissions(client, "super_admin", limitedTenant.tenantId, [PERMISSIONS.MANAGE_RETAIL_SALES_INVOICES]);
    await replaceTenantFeatures(client, limitedTenant.tenantId, ["retailer-sales-invoices"]);
  });
  setCachedPermissions("super_admin", limitedTenant.tenantId, [PERMISSIONS.MANAGE_RETAIL_SALES_INVOICES]);
  setCachedFeatures(limitedTenant.tenantId, ["retailer-sales-invoices"]);

  const blockedQuickSale = await limitedTenant.agent.post("/api/sales-invoices").send({
    customerType: "WALK_IN",
    saleType: "QUICK_SALE",
    invoiceDate: "2026-04-01",
    items: [{ productId: product.id, quantityPieces: 1, actualSalePrice: 50 }],
    paidAmount: 50,
    paymentMethod: "CASH",
  });
  assert.equal(blockedQuickSale.status, 403);

  const regularSale = await limitedTenant.agent.post("/api/sales-invoices").send({
    customerType: "WALK_IN",
    saleType: "RETAIL",
    invoiceDate: "2026-04-01",
    items: [{ productId: product.id, quantityPieces: 1, actualSalePrice: 50 }],
    paidAmount: 50,
    paymentMethod: "CASH",
  });
  assert.equal(regularSale.status, 201);
  assert.equal(regularSale.body.invoice.saleType, "RETAIL");

  await cleanupTenant(databaseManager, limitedTenant.tenantId);
});
