// Thin wrappers around the real HTTP API so test files build fixtures the same way a
// real client would — this exercises the actual validation/normalizer code instead of
// reaching into repositories directly.

let categoryCounter = 0;

export async function createCategory(agent, overrides = {}) {
  categoryCounter += 1;
  const response = await agent.post("/api/categories").send({ name: `Test Category ${categoryCounter}`, ...overrides });
  if (response.status !== 201) {
    throw new Error(`createCategory failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.category;
}

export async function createProduct(agent, overrides = {}) {
  const category = overrides.categoryId ? null : await createCategory(agent);
  const response = await agent.post("/api/products").send({
    name: "Test Product",
    categoryId: category ? category.id : overrides.categoryId,
    piecesPerCase: 12,
    purchasePrice: 50,
    wholesalePrice: 70,
    retailPrice: 90,
    refundable: true,
    ...overrides,
  });
  if (response.status !== 201) {
    throw new Error(`createProduct failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.product;
}

export async function addStock(agent, productId, addPieces, reason = "Initial stock") {
  const response = await agent.post(`/api/products/${productId}/stock`).send({ addPieces, reason });
  if (response.status !== 200) {
    throw new Error(`addStock failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.product;
}

export async function createSupplier(agent, overrides = {}) {
  const response = await agent.post("/api/suppliers").send({
    name: "Test Supplier",
    phone: "0100000000",
    address: "Test address",
    ...overrides,
  });
  if (response.status !== 201) {
    throw new Error(`createSupplier failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.supplier;
}

export async function createRetailCustomer(agent, overrides = {}) {
  const response = await agent.post("/api/retail-customers").send({
    name: "Test Customer",
    phone: "0177000000",
    address: "Test address",
    ...overrides,
  });
  if (response.status !== 201) {
    throw new Error(`createRetailCustomer failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.retailCustomer;
}

export async function createDsr(agent, overrides = {}) {
  const response = await agent.post("/api/dsrs").send({
    name: "Test DSR",
    phone: "0188000000",
    area: "Test area",
    ...overrides,
  });
  if (response.status !== 201) {
    throw new Error(`createDsr failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.dsr;
}

export async function createSr(agent, overrides = {}) {
  const response = await agent.post("/api/srs").send({
    name: "Test SR",
    phone: "0199000000",
    ...overrides,
  });
  if (response.status !== 201) {
    throw new Error(`createSr failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.sr;
}

export async function depositCash(agent, amount, overrides = {}) {
  const response = await agent.post("/api/finance-accounts/transactions").send({
    accountType: "CASH",
    type: "DEPOSIT",
    amount,
    date: new Date().toISOString().slice(0, 10),
    note: "Test cash funding",
    ...overrides,
  });
  if (response.status !== 201) {
    throw new Error(`depositCash failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.transaction;
}

export async function getCustomerDueBalance(agent, customerId) {
  const response = await agent.get("/api/customer-due-ledger/balance").query({ customerId });
  if (response.status !== 200) {
    throw new Error(`getCustomerDueBalance failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.balance;
}

export async function getCashAccount(agent) {
  const response = await agent.get("/api/finance-accounts");
  if (response.status !== 200) {
    throw new Error(`getCashAccount failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.accounts.find((account) => account.type === "CASH");
}
