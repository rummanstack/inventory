import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { TENANT_BUSINESS_PERMISSIONS, PERMISSIONS } from "../lib/permissions.js";
import { setCachedPermissions } from "../lib/permissionCache.js";
import { setCachedFeatures } from "../lib/tenantFeatureCache.js";
import { createAuditRoutes } from "../routes/audit.routes.js";
import { createBrandsRoutes } from "../routes/brands.routes.js";
import { createCategoriesRoutes } from "../routes/categories.routes.js";
import { createDsrTargetsRoutes } from "../routes/dsrTargets.routes.js";
import { createHelpDeskRoutes } from "../routes/helpDesk.routes.js";
import { createProductsRoutes } from "../routes/products.routes.js";
import { createSalesInvoicesRoutes } from "../routes/salesInvoices.routes.js";
import { createSupplierDiscountsRoutes } from "../routes/supplierDiscounts.routes.js";
import { createSupplierPaymentsRoutes } from "../routes/supplierPayments.routes.js";

const actor = {
  id: "route-auth-user",
  role: "super_admin",
  tenantId: "route-auth-tenant",
};

const controller = new Proxy({}, {
  get: () => (_req, res) => res.status(204).end(),
});

function buildApp(router) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.currentUser = actor;
    next();
  });
  app.use(router);
  app.use((error, _req, res, _next) => {
    res.status(error.status || 500).json({ error: error.message });
  });
  return app;
}

test("audit entity history requires view_activity_logs", async () => {
  setCachedPermissions(actor.role, actor.tenantId, [PERMISSIONS.VIEW_STATE]);
  const response = await request(buildApp(createAuditRoutes(controller))).get("/entity/product/example");
  assert.equal(response.status, 403);
});

test("supporting resource routes enforce their owning feature", async () => {
  setCachedPermissions(actor.role, actor.tenantId, TENANT_BUSINESS_PERMISSIONS);
  setCachedFeatures(actor.tenantId, ["unrelated-feature"]);

  const checks = [
    [createBrandsRoutes(controller), "/"],
    [createCategoriesRoutes(controller), "/"],
    [createDsrTargetsRoutes(controller), "/"],
    [createSupplierDiscountsRoutes(controller), "/"],
    [createSupplierPaymentsRoutes(controller), "/"],
  ];

  for (const [router, path] of checks) {
    const response = await request(buildApp(router)).get(path);
    assert.equal(response.status, 403);
  }
});

test("permanent deletion requires both permanent-delete and domain management access", async () => {
  setCachedFeatures(actor.tenantId, ["products"]);
  const app = buildApp(createProductsRoutes(controller));

  setCachedPermissions(actor.role, actor.tenantId, [PERMISSIONS.PERMANENT_DELETE]);
  assert.equal((await request(app).delete("/example/permanent")).status, 403);

  setCachedPermissions(actor.role, actor.tenantId, [PERMISSIONS.MANAGE_PRODUCTS]);
  assert.equal((await request(app).delete("/example/permanent")).status, 403);

  setCachedPermissions(actor.role, actor.tenantId, [
    PERMISSIONS.PERMANENT_DELETE,
    PERMISSIONS.MANAGE_PRODUCTS,
  ]);
  assert.equal((await request(app).delete("/example/permanent")).status, 204);
});

test("help desk read and write access are separated", async () => {
  setCachedFeatures(actor.tenantId, ["help-desk"]);
  const app = buildApp(createHelpDeskRoutes(controller));

  setCachedPermissions(actor.role, actor.tenantId, [PERMISSIONS.VIEW_HELP_DESK]);
  assert.equal((await request(app).get("/")).status, 204);
  assert.equal((await request(app).post("/").send({ subject: "Denied write" })).status, 403);

  setCachedPermissions(actor.role, actor.tenantId, [
    PERMISSIONS.VIEW_HELP_DESK,
    PERMISSIONS.MANAGE_HELP_DESK,
  ]);
  assert.equal((await request(app).post("/").send({ subject: "Allowed write" })).status, 204);
});

test("sales creation binds quick and regular invoice types to their own feature and permission", async () => {
  const app = buildApp(createSalesInvoicesRoutes(controller));
  const quickPayload = { saleType: "QUICK_SALE" };

  setCachedFeatures(actor.tenantId, ["retailer-quick-sale"]);
  setCachedPermissions(actor.role, actor.tenantId, [PERMISSIONS.MANAGE_RETAIL_SALES_INVOICES]);
  assert.equal((await request(app).post("/").send(quickPayload)).status, 403);

  setCachedFeatures(actor.tenantId, ["retailer-sales-invoices"]);
  setCachedPermissions(actor.role, actor.tenantId, [PERMISSIONS.MANAGE_RETAIL_QUICK_SALE]);
  assert.equal((await request(app).post("/").send(quickPayload)).status, 403);

  setCachedFeatures(actor.tenantId, ["retailer-quick-sale"]);
  setCachedPermissions(actor.role, actor.tenantId, [PERMISSIONS.MANAGE_RETAIL_QUICK_SALE]);
  assert.equal((await request(app).post("/").send(quickPayload)).status, 204);

  setCachedFeatures(actor.tenantId, ["retailer-sales-invoices"]);
  setCachedPermissions(actor.role, actor.tenantId, [PERMISSIONS.MANAGE_RETAIL_SALES_INVOICES]);
  assert.equal((await request(app).post("/").send({ saleType: "RETAIL" })).status, 204);
});
