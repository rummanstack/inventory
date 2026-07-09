import test from "node:test";
import assert from "node:assert/strict";
import { getTestApp, closeTestApp } from "./helpers/testApp.js";
import { cleanupTenant, createTenantAndAdmin } from "./helpers/fixtures.js";

test("employees support professional profile fields and HR master data links", async (t) => {
  const { app, databaseManager } = await getTestApp();
  const { tenantId, agent } = await createTenantAndAdmin(databaseManager, app, { name: "Employees Tenant" });
  t.after(async () => cleanupTenant(databaseManager, tenantId));
  t.after(closeTestApp);

  const departmentResponse = await agent.post("/api/departments").send({ name: "Operations", code: "OPS" });
  assert.equal(departmentResponse.status, 201);
  const designationResponse = await agent.post("/api/designations").send({ name: "Store Manager", code: "SM" });
  assert.equal(designationResponse.status, 201);

  const createResponse = await agent.post("/api/employees").send({
    name: "Nadia Rahman",
    phone: "01700000000",
    email: "NADIA@example.com",
    photoUrl: "/uploads/photos/test.png",
    departmentId: departmentResponse.body.department.id,
    designationId: designationResponse.body.designation.id,
    joinDate: "2026-01-15",
    dateOfBirth: "1994-05-20",
    gender: "FEMALE",
    bloodGroup: "B+",
    nationalId: "1234567890",
    emergencyContactName: "Karim Rahman",
    emergencyContactPhone: "01800000000",
    emergencyContactRelation: "Brother",
    bankName: "Test Bank",
    bankAccountName: "Nadia Rahman",
    bankAccountNumber: "111222333",
    bankBranch: "Dhanmondi",
    salaryAmount: 45000,
    payType: "MONTHLY",
  });
  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body.name, "Nadia Rahman");
  assert.equal(createResponse.body.email, "nadia@example.com");
  assert.equal(createResponse.body.departmentId, departmentResponse.body.department.id);
  assert.equal(createResponse.body.departmentName, "Operations");
  assert.equal(createResponse.body.designationName, "Store Manager");
  assert.equal(createResponse.body.bloodGroup, "B+");
  assert.equal(createResponse.body.bankAccountNumber, "111222333");

  const listResponse = await agent.get("/api/employees").query({ departmentId: departmentResponse.body.department.id });
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.items.length, 1);
  assert.equal(listResponse.body.items[0].designationName, "Store Manager");

  const updateResponse = await agent.put(`/api/employees/${createResponse.body.id}`).send({
    ...createResponse.body,
    name: "Nadia Akter",
    status: "INACTIVE",
    salaryAmount: 50000,
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.name, "Nadia Akter");
  assert.equal(updateResponse.body.status, "INACTIVE");
  assert.equal(updateResponse.body.salaryAmount, 50000);
});


test("employee documents can be uploaded, listed, downloaded, and deleted", async (t) => {
  const { app, databaseManager } = await getTestApp();
  const { tenantId, agent } = await createTenantAndAdmin(databaseManager, app, { name: "Employee Documents Tenant" });
  t.after(async () => cleanupTenant(databaseManager, tenantId));
  t.after(closeTestApp);

  const employeeResponse = await agent.post("/api/employees").send({ name: "Document Owner" });
  assert.equal(employeeResponse.status, 201);

  const uploadResponse = await agent
    .post(`/api/employees/${employeeResponse.body.id}/documents`)
    .field("documentType", "NID")
    .field("title", "National ID")
    .attach("document", Buffer.from("%PDF-1.4\n%test\n"), { filename: "nid.pdf", contentType: "application/pdf" });
  assert.equal(uploadResponse.status, 201);
  assert.equal(uploadResponse.body.document.documentType, "NID");
  assert.equal(uploadResponse.body.document.title, "National ID");

  const listResponse = await agent.get(`/api/employees/${employeeResponse.body.id}/documents`);
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.body.items.length, 1);

  const downloadResponse = await agent.get(`/api/employees/${employeeResponse.body.id}/documents/${uploadResponse.body.document.id}/download`);
  assert.equal(downloadResponse.status, 200);
  assert.match(downloadResponse.headers["content-disposition"], /nid\.pdf/);

  const deleteResponse = await agent.delete(`/api/employees/${employeeResponse.body.id}/documents/${uploadResponse.body.document.id}`).send({ reason: "Test cleanup" });
  assert.equal(deleteResponse.status, 200);
  assert.equal(deleteResponse.body.ok, true);

  const emptyListResponse = await agent.get(`/api/employees/${employeeResponse.body.id}/documents`);
  assert.equal(emptyListResponse.status, 200);
  assert.equal(emptyListResponse.body.items.length, 0);
});
