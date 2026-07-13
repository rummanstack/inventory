import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { createTenantAndAdmin, cleanupTenant } from "./helpers/fixtures.js";
import { createProduct, addStock, createDsr } from "./helpers/seeders.js";

let databaseManager;
let tenant;
let otherTenant;

before(async () => {
  const testApp = await getTestApp();
  databaseManager = testApp.databaseManager;
  tenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "DSR Targets Tenant" });
  otherTenant = await createTenantAndAdmin(databaseManager, testApp.app, { name: "DSR Targets Other Tenant" });
});

after(async () => {
  await cleanupTenant(databaseManager, tenant.tenantId);
  await cleanupTenant(databaseManager, otherTenant.tenantId);
  await closeTestApp();
});

test("setting targets requires an array and a valid YYYY-MM month", async () => {
  const dsr = await createDsr(tenant.agent, { name: `Target Validation DSR ${Date.now()}` });

  const empty = await tenant.agent.post("/api/dsr-targets").send({ targets: [] });
  assert.equal(empty.status, 400);

  const badMonth = await tenant.agent.post("/api/dsr-targets").send({
    targets: [{ dsrId: dsr.id, month: "2026-4", targetAmount: 1000 }],
  });
  assert.equal(badMonth.status, 400);

  const negativeAmount = await tenant.agent.post("/api/dsr-targets").send({
    targets: [{ dsrId: dsr.id, month: "2026-04", targetAmount: -1 }],
  });
  assert.equal(negativeAmount.status, 400);
});

test("setting a DSR's target for a month can be updated (upsert), and is listed by month", async () => {
  const dsr = await createDsr(tenant.agent, { name: `Target DSR ${Date.now()}` });

  const createResponse = await tenant.agent.post("/api/dsr-targets").send({
    targets: [{ dsrId: dsr.id, month: "2026-05", targetAmount: 5000 }],
  });
  assert.equal(createResponse.status, 200);
  assert.equal(createResponse.body.targets[0].targetAmount, 5000);

  const updateResponse = await tenant.agent.post("/api/dsr-targets").send({
    targets: [{ dsrId: dsr.id, month: "2026-05", targetAmount: 8000 }],
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.targets[0].targetAmount, 8000);

  const listResponse = await tenant.agent.get("/api/dsr-targets").query({ month: "2026-05" });
  assert.equal(listResponse.status, 200);
  const targets = listResponse.body.targets.filter((item) => item.dsrId === dsr.id);
  assert.equal(targets.length, 1, "the upsert must not create a second row for the same DSR/month");
  assert.equal(targets[0].targetAmount, 8000);
});

test("monthly summary sums settlement value into actual_amount and defaults target to 0 when unset", async () => {
  const product = await createProduct(tenant.agent, { name: `Target Widget ${Date.now()}`, wholesalePrice: 50 });
  await addStock(tenant.agent, product.id, 100);
  const dsrWithTarget = await createDsr(tenant.agent, { name: `Summary DSR With Target ${Date.now()}` });
  const dsrWithoutTarget = await createDsr(tenant.agent, { name: `Summary DSR No Target ${Date.now()}` });

  await tenant.agent.post("/api/dsr-targets").send({
    targets: [{ dsrId: dsrWithTarget.id, month: "2026-06", targetAmount: 2000 }],
  });

  const issueResponse = await tenant.agent.post("/api/issues").send({
    date: "2026-06-05",
    dsrId: dsrWithoutTarget.id,
    items: [{ productId: product.id, issuedPieces: 20 }],
  });
  assert.equal(issueResponse.status, 201);

  // Sold 20 @ 50 = 1000 payable, nothing previously due.
  const settleResponse = await tenant.agent.post("/api/settlements").send({
    date: "2026-06-05",
    dsrId: dsrWithoutTarget.id,
    items: [{ productId: product.id, returnedPieces: 0, damagedPieces: 0 }],
    discount: 0,
    extraReturnValue: 0,
    amountPaid: 1000,
  });
  assert.equal(settleResponse.status, 201);

  const summaryResponse = await tenant.agent.get("/api/dsr-targets/summary").query({ month: "2026-06" });
  assert.equal(summaryResponse.status, 200);

  const targetedRow = summaryResponse.body.summary.find((row) => row.dsrId === dsrWithTarget.id);
  assert.ok(targetedRow, "a DSR with a set target but no settlement this month must still appear");
  assert.equal(Number(targetedRow.targetAmount), 2000);
  assert.equal(Number(targetedRow.actualAmount), 0);

  const settledRow = summaryResponse.body.summary.find((row) => row.dsrId === dsrWithoutTarget.id);
  assert.ok(settledRow, "a DSR with a settlement but no set target must still appear");
  assert.equal(Number(settledRow.targetAmount), 0);
  assert.equal(Number(settledRow.actualAmount), 1000);
});

test("tenant isolation: another tenant cannot see or set targets for a DSR that isn't theirs", async () => {
  const dsr = await createDsr(tenant.agent, { name: `Isolated Target DSR ${Date.now()}` });

  await tenant.agent.post("/api/dsr-targets").send({
    targets: [{ dsrId: dsr.id, month: "2026-07", targetAmount: 3000 }],
  });

  const listResponse = await otherTenant.agent.get("/api/dsr-targets").query({ month: "2026-07" });
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.targets.some((item) => item.dsrId === dsr.id), false);

  const summaryResponse = await otherTenant.agent.get("/api/dsr-targets/summary").query({ month: "2026-07" });
  assert.equal(summaryResponse.status, 200);
  assert.equal(summaryResponse.body.summary.some((row) => row.dsrId === dsr.id), false);
});
