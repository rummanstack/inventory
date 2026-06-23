import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, addStock, createRetailCustomer, getCustomerDueBalance } from "./helpers/seeders.js";

let databaseManager;
let tenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "Sales Invoice Tenant" });
});

test("retail promotions reduce the sale price within the active date range", async () => {
  const product = await createProduct(tenant.agent, {
    name: "Promo Widget",
    retailPrice: 100,
  });
  await addStock(tenant.agent, product.id, 20);

  const promotionResponse = await tenant.agent.post("/api/retail-promotions").send({
    name: "Promo Widget Discount",
    targetType: "PRODUCT",
    targetId: product.id,
    saleType: "RETAIL",
    discountType: "PERCENT",
    discountValue: 20,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    active: true,
    priority: 1,
  });
  assert.equal(promotionResponse.status, 201);

  const response = await tenant.agent.post("/api/sales-invoices").send({
    customerType: "WALK_IN",
    saleType: "RETAIL",
    invoiceDate: "2026-01-15",
    items: [{ productId: product.id, quantityPieces: 3, actualSalePrice: 100 }],
    discount: 0,
    paidAmount: 240,
    paymentMethod: "CASH",
  });

  assert.equal(response.status, 201);
  const invoice = response.body.invoice;
  assert.equal(invoice.totalAmount, 240);
  assert.equal(invoice.items[0].actualSalePrice, 80);
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await closeTestApp();
});

test("a registered sale with a due balance decrements stock, records a SALE movement, and adds customer due", async () => {
  const product = await createProduct(tenant.agent, { name: "Sale Widget", retailPrice: 90 });
  await addStock(tenant.agent, product.id, 100);
  const customer = await createRetailCustomer(tenant.agent, { name: "Sale Customer" });

  const response = await tenant.agent.post("/api/sales-invoices").send({
    customerId: customer.id,
    customerType: "REGISTERED",
    saleType: "RETAIL",
    invoiceDate: "2026-01-15",
    items: [{ productId: product.id, quantityPieces: 10, actualSalePrice: 90 }],
    discount: 0,
    paidAmount: 500,
    paymentMethod: "CASH",
  });

  assert.equal(response.status, 201);
  const invoice = response.body.invoice;
  assert.equal(invoice.totalAmount, 900);
  assert.equal(invoice.paidAmount, 500);
  assert.equal(invoice.dueAmount, 400);

  const productResponse = await tenant.agent.get("/api/products").query({ search: "Sale Widget" });
  const updatedProduct = productResponse.body.items.find((item) => item.id === product.id);
  assert.equal(updatedProduct.stockPieces, 90);

  const movements = await tenant.agent.get("/api/stock-movements").query({ productId: product.id });
  const movement = movements.body.items.find((item) => item.type === "SALE");
  assert.ok(movement);
  assert.equal(movement.quantityOut, 10);
  assert.equal(movement.balanceAfter, 90);

  const balance = await getCustomerDueBalance(tenant.agent, customer.id);
  assert.equal(balance, 400);
});

test("a sale is rejected when the requested quantity exceeds available stock", async () => {
  const product = await createProduct(tenant.agent, { name: "Understocked Widget", retailPrice: 90 });
  await addStock(tenant.agent, product.id, 5);

  const response = await tenant.agent.post("/api/sales-invoices").send({
    customerType: "WALK_IN",
    saleType: "QUICK_SALE",
    invoiceDate: "2026-01-15",
    items: [{ productId: product.id, quantityPieces: 10, actualSalePrice: 90 }],
    discount: 0,
    paidAmount: 900,
    paymentMethod: "CASH",
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /does not have enough available stock/);

  const productResponse = await tenant.agent.get("/api/products").query({ search: "Understocked Widget" });
  const updatedProduct = productResponse.body.items.find((item) => item.id === product.id);
  assert.equal(updatedProduct.stockPieces, 5, "stock must be unchanged after the rejected sale");
});

test("trashing and restoring a sale flips its serials between SOLD and IN_STOCK", async () => {
  const product = await createProduct(tenant.agent, { name: "Serial Sale Widget", serialRequired: true, retailPrice: 90 });
  const supplier = await tenant.agent.post("/api/suppliers").send({ name: "Serial Sale Supplier", phone: "0100000001", address: "Addr" });
  assert.equal(supplier.status, 201);

  const purchaseResponse = await tenant.agent.post("/api/purchase-receive").send({
    supplierId: supplier.body.supplier.id,
    purchaseDate: "2026-01-14",
    items: [{ productId: product.id, quantityPieces: 1, purchasePrice: 40, serials: ["SN-SALE-1"] }],
    discount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
  });
  assert.equal(purchaseResponse.status, 201);

  const serialListResponse = await tenant.agent.get("/api/product-serials").query({ productId: product.id });
  const serial = serialListResponse.body.items.find((item) => item.serialNumber === "SN-SALE-1");
  assert.ok(serial);
  assert.equal(serial.status, "IN_STOCK");

  const saleResponse = await tenant.agent.post("/api/sales-invoices").send({
    customerType: "WALK_IN",
    saleType: "QUICK_SALE",
    invoiceDate: "2026-01-15",
    items: [{ productId: product.id, quantityPieces: 1, actualSalePrice: 90, serialIds: [serial.id] }],
    discount: 0,
    paidAmount: 90,
    paymentMethod: "CASH",
  });
  assert.equal(saleResponse.status, 201);
  const invoice = saleResponse.body.invoice;

  const soldSerial = await tenant.agent.get(`/api/product-serials/${serial.id}`);
  assert.equal(soldSerial.body.status, "SOLD");

  const deleteResponse = await tenant.agent.delete(`/api/sales-invoices/${invoice.id}`).send({ reason: "test trash" });
  assert.equal(deleteResponse.status, 200);

  const afterDelete = await tenant.agent.get(`/api/product-serials/${serial.id}`);
  assert.equal(afterDelete.status, 200);
  assert.equal(afterDelete.body.status, "IN_STOCK", "trashing the sale must put the serial back in stock");

  const restoreResponse = await tenant.agent.post(`/api/sales-invoices/${invoice.id}/restore`);
  assert.equal(restoreResponse.status, 200);

  const afterRestore = await tenant.agent.get(`/api/product-serials/${serial.id}`);
  assert.equal(afterRestore.body.status, "SOLD", "restoring the sale must mark the serial sold again");
});

test("a walk-in sale must be fully paid — a due amount is rejected", async () => {
  const product = await createProduct(tenant.agent, { name: "Walkin Widget", retailPrice: 90 });
  await addStock(tenant.agent, product.id, 20);

  const response = await tenant.agent.post("/api/sales-invoices").send({
    customerType: "WALK_IN",
    saleType: "QUICK_SALE",
    invoiceDate: "2026-01-15",
    items: [{ productId: product.id, quantityPieces: 5, actualSalePrice: 90 }],
    discount: 0,
    paidAmount: 100,
    paymentMethod: "CASH",
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /fully paid/);
});
