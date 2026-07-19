import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createCategory, createProduct } from "./helpers/seeders.js";
import { PERMISSIONS, TENANT_BUSINESS_PERMISSIONS } from "../lib/permissions.js";
import { setCachedPermissions } from "../lib/permissionCache.js";
import { replaceRolePermissions } from "../repositories/rolePermissionRepository.js";
import { USER_ROLES } from "../lib/roles.js";

let databaseManager;
let tenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Product Browser Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await closeTestApp();
});

test("browse endpoint filters by category, search, and numeric spec range, and excludes inactive products", async () => {
  const tvCategory = await createCategory(tenant.agent, { name: "TVs" });
  await tenant.agent.post(`/api/categories/${tvCategory.id}/attributes`).send({
    key: "screen_size_inch",
    label: "Screen Size",
    dataType: "number",
    unit: "inch",
  });

  const smallTv = await createProduct(tenant.agent, {
    name: "Compact Smart TV",
    categoryId: tvCategory.id,
    specs: { screen_size_inch: 32 },
  });
  const bigTv = await createProduct(tenant.agent, {
    name: "Cinema Smart TV",
    categoryId: tvCategory.id,
    specs: { screen_size_inch: 65 },
  });
  const otherCategory = await createCategory(tenant.agent, { name: "Irons" });
  const iron = await createProduct(tenant.agent, { name: "Steam Iron", categoryId: otherCategory.id });
  const inactiveTv = await createProduct(tenant.agent, {
    name: "Discontinued Smart TV",
    categoryId: tvCategory.id,
    status: "INACTIVE",
  });

  const allResponse = await tenant.agent.get("/api/product-browser/products");
  assert.equal(allResponse.status, 200);
  const allIds = allResponse.body.items.map((item) => item.id);
  assert.ok(allIds.includes(smallTv.id));
  assert.ok(allIds.includes(bigTv.id));
  assert.ok(allIds.includes(iron.id));
  assert.equal(allIds.includes(inactiveTv.id), false, "inactive products must not appear in the browser");

  const categoryResponse = await tenant.agent.get("/api/product-browser/products").query({ categoryId: tvCategory.id });
  const categoryIds = categoryResponse.body.items.map((item) => item.id);
  assert.ok(categoryIds.includes(smallTv.id));
  assert.equal(categoryIds.includes(iron.id), false);

  const searchResponse = await tenant.agent.get("/api/product-browser/products").query({ search: "Cinema" });
  const searchIds = searchResponse.body.items.map((item) => item.id);
  assert.deepEqual(searchIds, [bigTv.id]);

  const specRangeResponse = await tenant.agent.get("/api/product-browser/products").query({ spec_screen_size_inch_min: 50 });
  const specRangeIds = specRangeResponse.body.items.map((item) => item.id);
  assert.ok(specRangeIds.includes(bigTv.id));
  assert.equal(specRangeIds.includes(smallTv.id), false);
});

test("browse detail endpoint returns specs, images, and category name, never cost/purchase price", async () => {
  const category = await createCategory(tenant.agent, { name: "Laptops" });
  const product = await createProduct(tenant.agent, {
    name: "Ultrabook 14",
    categoryId: category.id,
    purchasePrice: 500,
    retailPrice: 800,
    specs: { ram_gb: 16 },
    images: ["https://example.test/laptop-1.jpg", "https://example.test/laptop-2.jpg"],
  });

  const response = await tenant.agent.get(`/api/product-browser/products/${product.id}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.product.category, "Laptops");
  assert.equal(response.body.product.specs.ram_gb, 16);
  assert.deepEqual(response.body.product.images, [
    "https://example.test/laptop-1.jpg",
    "https://example.test/laptop-2.jpg",
  ]);
  assert.equal(response.body.product.retailPrice, 800);
  assert.equal("purchasePrice" in response.body.product, false, "browse endpoint must never expose cost/purchase price");
});

test("a role without view_product_browser gets 403 from the browse endpoint", async () => {
  await databaseManager.withTransaction(async (client) => {
    const restricted = TENANT_BUSINESS_PERMISSIONS.filter((permission) => permission !== PERMISSIONS.VIEW_PRODUCT_BROWSER);
    await replaceRolePermissions(client, USER_ROLES.SUPER_ADMIN, tenant.tenantId, restricted);
  });
  setCachedPermissions(
    USER_ROLES.SUPER_ADMIN,
    tenant.tenantId,
    TENANT_BUSINESS_PERMISSIONS.filter((permission) => permission !== PERMISSIONS.VIEW_PRODUCT_BROWSER),
  );

  const response = await tenant.agent.get("/api/product-browser/products");
  assert.equal(response.status, 403);

  // restore full permissions so later tests / cleanup in this file are unaffected
  await databaseManager.withTransaction(async (client) => {
    await replaceRolePermissions(client, USER_ROLES.SUPER_ADMIN, tenant.tenantId, TENANT_BUSINESS_PERMISSIONS);
  });
  setCachedPermissions(USER_ROLES.SUPER_ADMIN, tenant.tenantId, TENANT_BUSINESS_PERMISSIONS);
});
