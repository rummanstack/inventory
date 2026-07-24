/**
 * PharmaCare BD demo seed — creates a single ready-to-demo pharmacy RETAIL
 * tenant (counter/dispensing POS model) by driving the exact same service
 * layer the app itself uses for every transactional flow.
 *
 * Modeled on seedElectroMart.js / seedAutoMartBD.js (same retail/POS shape),
 * swapped to businessType DRUG_PHARMACY. The pharmacy vertical replaces
 * serial/IMEI tracking with batch/expiry tracking — nothing here fabricates
 * a ledger balance, a stock level, or a drug_batches row directly:
 *   - Products are created with zero stock — every unit of stock, and every
 *     drug_batches row for a requiresBatch product, arrives through a real
 *     purchase-receive call to a supplier (batchNumber/manufactureDate/
 *     expiryDate on the line item — purchaseReceiveService auto-creates the
 *     batch row whenever any of those are present, no separate batch API).
 *   - Sales (quick-sale, retail, wholesale) consume stock via real FEFO
 *     (first-expire-first-out) batch allocation inside salesInvoiceService —
 *     nothing is pre-computed and inserted; the sales return and the
 *     quotation conversion work the same way.
 *   - Supplier due, customer due, and finance account balances are all
 *     produced as side effects of real service calls, exactly like a user
 *     clicking through the UI.
 *
 * No trade-ins, installment sales, warranty claims, or repair jobs — those
 * don't apply to a pharmacy counter, so this tenant's FEATURES list (and the
 * flows below) intentionally omit them, unlike seedElectroMart.js/
 * seedAutoMartBD.js.
 *
 * Run (from backend/):
 *   node scripts/seedPharmaCareBD.js
 *
 * Always targets the DEV database (forces npm_lifecycle_event='dev' before
 * config/env.js is loaded) — never touches production, regardless of how
 * it's invoked. NOT safe to run twice against the same database — it exits
 * early with a message if the tenant already exists. If you need to
 * re-seed, wipe the tenant's data first.
 *
 * Login: admin@pharmacarebd.com / Pharma@1234
 */

import dotenv from "dotenv";
import { envPath } from "../config/paths.js";
import { hashPassword } from "../lib/passwords.js";
import { USER_ROLES } from "../lib/roles.js";
import { BUSINESS_TYPES, SELLER_TYPES } from "../lib/businessTypes.js";
import { TENANT_BUSINESS_PERMISSIONS } from "../lib/permissions.js";
import { createId } from "../lib/ids.js";

dotenv.config({ path: envPath });

// This script is for demo/dev use only — never let it run against production.
if (process.env.npm_lifecycle_event !== "dev" && process.env.npm_lifecycle_event !== "test") {
  process.env.npm_lifecycle_event = "dev";
}

const TENANT_NAME = "PharmaCare BD";
const TENANT_SLUG = "pharmacare-bd";
const TENANT_ADDRESS = "Shop 3, Green Corner Market, Dhanmondi 27, Dhaka-1209";
const TENANT_PHONE = "01700-000003";
const ADMIN_EMAIL = "admin@pharmacarebd.com";
const ADMIN_PASSWORD = "Pharma@1234";
const ADMIN_NAME = "Farhana Yeasmin (PharmaCare BD Admin)";

// Curated for the pharmacy retail persona — POS/quick-sale + sales invoices/
// returns + quotations (bulk clinic orders) + batch/expiry tracking +
// finance + HR. No DSR/dealer distribution, and none of the electronics/
// vehicle-only modules (product-serials, warranty-claims, repair-jobs,
// trade-ins, installment-*) — a pharmacy counter doesn't sell on EMI or
// carry chassis/IMEI numbers.
const FEATURES = [
  "dashboard",
  "retailer-quick-sale", "retailer-cash-sessions", "quotations", "retailer-promotions",
  "retailer-sales-invoices", "retailer-sales-return",
  "retail-customers", "retail-customer-retention", "retailer-customer-due", "retailer-due-collection",
  "products", "stock-movement", "low-stock-alerts", "damaged-stock",
  "suppliers", "purchase-receive", "purchase-returns", "supplier-payments", "supplier-discounts", "supplier-statement",
  "finance-dashboard", "finance-accounts", "expenses", "profit",
  "retailer-daily-sales-report", "reports", "purchase-report", "stock-movement-report",
  "sales-return-report", "customer-due-report", "cash-session-report", "damaged-stock-report",
  "batch-sales-report", "expiry-alerts",
  "history", "activity-logs", "issue-center",
  "departments", "designations", "employees", "salary-payments",
  "user-management", "permissions", "trash", "database-backup",
  "my-profile", "security", "help-desk", "org-settings",
];

// Anchored to Asia/Dhaka's calendar date (not the host machine's UTC date) so
// "today" here always matches expenseService's own todayIsoDate() check —
// a plain `new Date().toISOString()` anchor can be a day off depending on
// what UTC hour the script happens to run in (the same UTC+6 gotcha the
// frontend has to handle for date-only strings).
function todayInDhaka() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function daysAgo(n) {
  const [y, m, d] = todayInDhaka().split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - n);
  return dt.toISOString().slice(0, 10);
}

function daysFromNow(n) {
  return daysAgo(-n);
}

// ─── Categories ─────────────────────────────────────────────────────────────

const CATEGORY_NAMES = [
  "Tablets & Capsules", "Syrups & Suspensions", "Injections", "Ointments & Creams",
  "Medical Devices & Supplies", "Vitamins & Supplements", "Personal Care & Hygiene",
];

// ─── Generic medicines ──────────────────────────────────────────────────────
// Created before PRODUCTS so each product can link genericMedicineId — the
// same "generic name behind many brand names" catalog real pharmacies keep.

const GENERICS = {
  G1: "Paracetamol",
  G2: "Omeprazole",
  G3: "Fexofenadine",
  G4: "Montelukast",
  G5: "Amlodipine",
  G6: "Pantoprazole",
  G7: "Cetirizine",
  G8: "Azithromycin",
  G9: "Ceftriaxone",
  G10: "Clotrimazole",
  G11: "Silver Sulfadiazine",
  G12: "Vitamin C + Zinc",
  G13: "Calcium + Vitamin D3",
};

// ─── Suppliers ──────────────────────────────────────────────────────────────
// Keyed S1..S6 so PRODUCTS below can reference them without repeating names.

const SUPPLIERS = {
  S1: { name: "Square Pharmaceuticals PLC", phone: "02-8836088", address: "Square Centre, 48 Mohakhali C/A, Dhaka-1212" },
  S2: { name: "Beximco Pharmaceuticals Ltd", phone: "02-9887070", address: "Beximco Industrial Park, Sarabo, Kashimpur, Gazipur" },
  S3: { name: "Incepta Pharmaceuticals Ltd", phone: "02-8991747", address: "Zirabo, Ashulia, Savar, Dhaka" },
  S4: { name: "ACME Laboratories Ltd", phone: "02-7789990", address: "Road 2, Dhanmondi, Dhaka-1205" },
  S5: { name: "Renata PLC", phone: "02-7789199", address: "Plot 47-49, Section 7, Mirpur, Dhaka-1216" },
  S6: { name: "Opsonin Pharma Ltd", phone: "031-750332", address: "Fouzderhat Industrial Area, Chattogram-4218" },
};

// ─── Products ───────────────────────────────────────────────────────────────
// qty = strips/bottles/units purchased from `sup` for opening stock (the
// only way stock, or a drug_batches row for requiresBatch items, appears —
// see header comment). ppc = strips/units per box (pricing below is always
// PER STRIP/UNIT, matching how these are actually sold at the counter).
// nearExpiryDays, when set, makes that purchase's batch expire soon so the
// Expiry Alerts page has real, current data to show.

const PRODUCTS = [
  // ── Tablets & Capsules (batch/expiry tracked) ────────────────────────────
  { cat: "Tablets & Capsules", name: "Napa 500mg Tablet", brand: "Beximco", generic: "G1", drugType: "Analgesic", dosageForm: "Tablet", strength: "500mg", regNumber: "DAR-1023", medicineType: "OTC", sku: "PH-TAB-NAPA500", ppc: 10, pp: 8, wp: 10, rp: 12, qty: 500, reorder: 100, desc: "Paracetamol 500mg tablet, strip of 10.", sup: "S2" },
  { cat: "Tablets & Capsules", name: "Seclo 20mg Capsule", brand: "Square", generic: "G2", drugType: "PPI", dosageForm: "Capsule", strength: "20mg", regNumber: "DAR-1045", medicineType: "Prescription", sku: "PH-TAB-SECLO20", ppc: 10, pp: 25, wp: 30, rp: 36, qty: 300, reorder: 60, desc: "Omeprazole 20mg capsule, strip of 10.", sup: "S1" },
  { cat: "Tablets & Capsules", name: "Fexo 120mg Tablet", brand: "Square", generic: "G3", drugType: "Antihistamine", dosageForm: "Tablet", strength: "120mg", regNumber: "DAR-1067", medicineType: "OTC", sku: "PH-TAB-FEXO120", ppc: 10, pp: 22, wp: 27, rp: 32, qty: 260, reorder: 50, desc: "Fexofenadine 120mg tablet, strip of 10.", sup: "S1" },
  { cat: "Tablets & Capsules", name: "Monas 10 Tablet", brand: "Incepta", generic: "G4", drugType: "Leukotriene antagonist", dosageForm: "Tablet", strength: "10mg", regNumber: "DAR-1089", medicineType: "Prescription", sku: "PH-TAB-MONAS10", ppc: 7, pp: 45, wp: 52, rp: 60, qty: 210, reorder: 45, desc: "Montelukast 10mg tablet, strip of 7.", sup: "S3" },
  { cat: "Tablets & Capsules", name: "Amdocal 5mg Tablet", brand: "ACME", generic: "G5", drugType: "Antihypertensive", dosageForm: "Tablet", strength: "5mg", regNumber: "DAR-1102", medicineType: "Prescription", sku: "PH-TAB-AMDOCAL5", ppc: 10, pp: 12, wp: 15, rp: 18, qty: 320, reorder: 60, desc: "Amlodipine 5mg tablet, strip of 10.", sup: "S4" },
  { cat: "Tablets & Capsules", name: "Ace 665mg Tablet", brand: "Square", generic: "G1", drugType: "Analgesic", dosageForm: "Tablet", strength: "665mg", regNumber: "DAR-1124", medicineType: "OTC", sku: "PH-TAB-ACE665", ppc: 10, pp: 10, wp: 12, rp: 15, qty: 400, reorder: 80, desc: "Extra-strength paracetamol 665mg, strip of 10.", sup: "S1" },
  { cat: "Tablets & Capsules", name: "Antop 40mg Tablet", brand: "Beximco", generic: "G6", drugType: "PPI", dosageForm: "Tablet", strength: "40mg", regNumber: "DAR-1146", medicineType: "Prescription", sku: "PH-TAB-ANTOP40", ppc: 10, pp: 28, wp: 33, rp: 39, qty: 240, reorder: 50, desc: "Pantoprazole 40mg tablet, strip of 10.", sup: "S2" },
  { cat: "Tablets & Capsules", name: "Cetim 10mg Tablet", brand: "Incepta", generic: "G7", drugType: "Antihistamine", dosageForm: "Tablet", strength: "10mg", regNumber: "DAR-1168", medicineType: "OTC", sku: "PH-TAB-CETIM10", ppc: 10, pp: 6, wp: 8, rp: 10, qty: 350, reorder: 70, desc: "Cetirizine 10mg tablet, strip of 10.", sup: "S3" },

  // ── Syrups & Suspensions (batch/expiry tracked) ──────────────────────────
  { cat: "Syrups & Suspensions", name: "Napa Syrup 120mg/5ml", brand: "Beximco", generic: "G1", drugType: "Analgesic", dosageForm: "Syrup", strength: "120mg/5ml", regNumber: "DAR-1190", medicineType: "OTC", sku: "PH-SYR-NAPA120", ppc: 1, pp: 35, wp: 42, rp: 50, qty: 150, reorder: 30, desc: "Paracetamol suspension, 100ml bottle.", sup: "S2", nearExpiryDays: 25 },
  { cat: "Syrups & Suspensions", name: "Fenadin Syrup 30mg/5ml", brand: "Incepta", generic: "G3", drugType: "Antihistamine", dosageForm: "Syrup", strength: "30mg/5ml", regNumber: "DAR-1212", medicineType: "OTC", sku: "PH-SYR-FENADIN30", ppc: 1, pp: 55, wp: 65, rp: 78, qty: 100, reorder: 20, desc: "Fexofenadine syrup, 100ml bottle.", sup: "S3", nearExpiryDays: 60 },
  { cat: "Syrups & Suspensions", name: "Zimax Syrup 200mg/5ml", brand: "Square", generic: "G8", drugType: "Antibiotic", dosageForm: "Suspension", strength: "200mg/5ml", regNumber: "DAR-1234", medicineType: "Prescription", sku: "PH-SYR-ZIMAX200", ppc: 1, pp: 85, wp: 98, rp: 115, qty: 80, reorder: 20, desc: "Azithromycin suspension, 15ml bottle.", sup: "S1", nearExpiryDays: 45 },

  // ── Injections (batch/expiry tracked) ────────────────────────────────────
  { cat: "Injections", name: "Ceftriaxone 1gm Injection", brand: "ACME", generic: "G9", drugType: "Antibiotic", dosageForm: "Injection", strength: "1gm", regNumber: "DAR-1256", medicineType: "Prescription", sku: "PH-INJ-CEFTRX1G", ppc: 1, pp: 45, wp: 55, rp: 68, qty: 120, reorder: 30, desc: "Ceftriaxone injection vial, 1gm.", sup: "S4" },

  // ── Ointments & Creams (batch/expiry tracked) ────────────────────────────
  { cat: "Ointments & Creams", name: "Fungin Cream 20g", brand: "Square", generic: "G10", drugType: "Antifungal", dosageForm: "Cream", strength: "1% w/w", regNumber: "DAR-1278", medicineType: "OTC", sku: "PH-OIN-FUNGIN20", ppc: 1, pp: 40, wp: 48, rp: 58, qty: 130, reorder: 25, desc: "Clotrimazole cream, 20g tube.", sup: "S1" },
  { cat: "Ointments & Creams", name: "Silvadex Cream 25g", brand: "Renata", generic: "G11", drugType: "Antibacterial", dosageForm: "Cream", strength: "1% w/w", regNumber: "DAR-1290", medicineType: "OTC", sku: "PH-OIN-SILVADEX25", ppc: 1, pp: 55, wp: 65, rp: 78, qty: 90, reorder: 20, desc: "Silver sulfadiazine burn cream, 25g tube.", sup: "S5" },

  // ── Medical Devices & Supplies (durable — no batch/expiry) ───────────────
  { cat: "Medical Devices & Supplies", name: "Omron Digital BP Machine (HEM-7120)", brand: "Omron", sku: "PH-DEV-OMRONBP", ppc: 1, pp: 1800, wp: 2100, rp: 2600, qty: 25, reorder: 6, desc: "Automatic upper-arm digital blood pressure monitor.", sup: "S5" },
  { cat: "Medical Devices & Supplies", name: "Dr. Morepen Glucometer (BG-03)", brand: "Dr. Morepen", sku: "PH-DEV-MOREPENGLU", ppc: 1, pp: 950, wp: 1150, rp: 1450, qty: 30, reorder: 8, desc: "Blood glucose monitoring system with 10 test strips.", sup: "S5" },
  { cat: "Medical Devices & Supplies", name: "Disposable Syringe 5ml (Box of 100)", brand: "Generic", sku: "PH-DEV-SYR5ML", ppc: 1, pp: 350, wp: 420, rp: 500, qty: 60, reorder: 15, desc: "Sterile disposable syringes, box of 100.", sup: "S6" },
  { cat: "Medical Devices & Supplies", name: "Digital Thermometer", brand: "Generic", sku: "PH-DEV-THERMO", ppc: 1, pp: 180, wp: 220, rp: 280, qty: 70, reorder: 15, desc: "Digital body thermometer with fast read.", sup: "S6" },

  // ── Vitamins & Supplements (batch/expiry tracked) ────────────────────────
  { cat: "Vitamins & Supplements", name: "Cevit Zinc Tablet", brand: "Square", generic: "G12", drugType: "Supplement", dosageForm: "Tablet", strength: "500mg+10mg", regNumber: "DAR-1312", medicineType: "OTC", sku: "PH-VIT-CEVITZN", ppc: 10, pp: 18, wp: 22, rp: 27, qty: 300, reorder: 60, desc: "Vitamin C + Zinc effervescent tablet, strip of 10.", sup: "S1" },
  { cat: "Vitamins & Supplements", name: "Calbo-D Tablet", brand: "Incepta", generic: "G13", drugType: "Supplement", dosageForm: "Tablet", strength: "500mg+200IU", regNumber: "DAR-1334", medicineType: "OTC", sku: "PH-VIT-CALBOD", ppc: 10, pp: 15, wp: 18, rp: 22, qty: 280, reorder: 55, desc: "Calcium + Vitamin D3 tablet, strip of 10.", sup: "S3" },
  { cat: "Vitamins & Supplements", name: "Kinder Multivitamin Syrup 100ml", brand: "Renata", sku: "PH-VIT-KINDERMV", ppc: 1, pp: 95, wp: 112, rp: 135, qty: 70, reorder: 15, desc: "Children's multivitamin syrup, 100ml bottle.", sup: "S5" },

  // ── Personal Care & Hygiene (durable/non-drug — no batch) ────────────────
  { cat: "Personal Care & Hygiene", name: "Hand Sanitizer 200ml", brand: "Square", sku: "PH-PCH-SANITIZER200", ppc: 1, pp: 60, wp: 75, rp: 95, qty: 150, reorder: 30, desc: "70% alcohol-based hand sanitizer, 200ml bottle.", sup: "S1" },
  { cat: "Personal Care & Hygiene", name: "Surgical Face Mask (Box of 50)", brand: "Generic", sku: "PH-PCH-MASK50", ppc: 1, pp: 220, wp: 260, rp: 320, qty: 80, reorder: 20, desc: "3-ply disposable surgical face masks, box of 50.", sup: "S6" },
  { cat: "Personal Care & Hygiene", name: "Antiseptic Liquid 100ml", brand: "ACME", sku: "PH-PCH-ANTISEP100", ppc: 1, pp: 45, wp: 55, rp: 68, qty: 120, reorder: 25, desc: "Antiseptic disinfectant liquid, 100ml bottle.", sup: "S4" },
];

// ─── Retail customers ───────────────────────────────────────────────────────

const RETAIL_CUSTOMERS = [
  { name: "Rehana Begum", phone: "01711-500021", address: "House 8, Road 27, Dhanmondi, Dhaka", note: "Regular customer — monthly prescription refills" },
  { name: "Abdul Kader", phone: "01811-500022", address: "Jigatola, Dhaka", note: "" },
  { name: "Dr. Farida Yasmin", phone: "01911-500023", address: "Green Life Medical Chamber, Green Road, Dhaka", note: "Runs a small clinic — bulk buyer" },
  { name: "Shamim Reza", phone: "01611-500024", address: "Rayerbazar, Dhaka", note: "" },
  { name: "Nasrin Akter", phone: "01751-500025", address: "Lalmatia, Dhaka", note: "Loyalty program member" },
];

// ─── HR ─────────────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  { name: "Pharmacy Counter", code: "PHC" },
  { name: "Dispensing & Inventory", code: "DIS" },
  { name: "Accounts & Finance", code: "ACF" },
];

const DESIGNATIONS = [
  { name: "Pharmacist", code: "PHARM" },
  { name: "Counter Sales Executive", code: "CSEXEC" },
  { name: "Accounts Officer", code: "ACOFF" },
];

const EMPLOYEES = [
  { name: "Mahfuzur Rahman", phone: "01777-950001", department: 1, designation: 0, salaryAmount: 26000 },
  { name: "Taslima Khatun", phone: "01777-950002", department: 0, designation: 1, salaryAmount: 18000 },
  { name: "Anisur Rahman", phone: "01777-950003", department: 2, designation: 2, salaryAmount: 21000 },
];

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const { env } = await import("../config/env.js");
  const { DatabaseManager } = await import("../db/pool.js");
  const { createServiceRegistry } = await import("../composition/createServiceRegistry.js");
  const { permissionMatchesEnabledFeatures } = await import("../services/permissionService.js");
  const { insertTenant, findTenantBySlug } = await import("../repositories/tenantRepository.js");
  const { replaceTenantFeatures } = await import("../repositories/tenantFeatureRepository.js");
  const { insertUser } = await import("../repositories/userRepository.js");
  const { replaceRolePermissions } = await import("../repositories/rolePermissionRepository.js");

  if (env.DATABASE_LABEL !== "dev") {
    throw new Error(`Refusing to seed: resolved database label is "${env.DATABASE_LABEL}", expected "dev". Check DEV_DATABASE_URL in .env.`);
  }

  const db = new DatabaseManager(env.DATABASE_URL);
  const registry = createServiceRegistry({ databaseManager: db, env });
  const { platform, finance, catalog, customers, suppliers: suppliersReg, operations, hr } = registry;

  console.log(`\nSeeding PharmaCare BD demo into ${env.DATABASE_LABEL} database via the real service layer…\n`);

  const alreadyExists = await db.withClient((client) => findTenantBySlug(client, TENANT_SLUG));
  if (alreadyExists) {
    console.log(`Tenant "${TENANT_SLUG}" already exists (id: ${alreadyExists.id}). Refusing to re-seed.`);
    console.log("Wipe this tenant's data first if you want a fresh run.\n");
    await db.getPool().end();
    return;
  }

  // ── 1. Tenant + admin user + role permissions ──────────────────────────
  // Mirrors registrationService.register()'s own sequence exactly (tenant →
  // features → owner user → permissions → audit log), so the very first rows
  // in this tenant are created the same way a real signup creates them.
  console.log("  [1/18] Tenant, admin user, permissions…");
  const { tenantId, actor } = await db.withTransaction(async (client) => {
    const tenant = await insertTenant(client, {
      id: createId("tenant"),
      name: TENANT_NAME,
      slug: TENANT_SLUG,
      email: ADMIN_EMAIL,
      plan: "professional",
      status: "active",
      address: TENANT_ADDRESS,
      phone: TENANT_PHONE,
      businessType: BUSINESS_TYPES.DRUG_PHARMACY,
      sellerType: SELLER_TYPES.RETAILER,
    });

    await replaceTenantFeatures(client, tenant.id, FEATURES);

    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    const owner = {
      id: createId("user"),
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: USER_ROLES.SUPER_ADMIN,
      status: "active",
      tenantId: tenant.id,
    };
    await insertUser(client, owner);

    const ownerPermissions = TENANT_BUSINESS_PERMISSIONS.filter((permission) =>
      permissionMatchesEnabledFeatures(permission, FEATURES),
    );
    await replaceRolePermissions(client, USER_ROLES.SUPER_ADMIN, tenant.id, ownerPermissions);

    const ownerActor = { id: owner.id, tenantId: tenant.id, name: owner.name, role: owner.role };

    await platform.auditService.record(client, {
      tenantId: tenant.id,
      userId: owner.id,
      actionType: "tenant.create",
      entityType: "tenant",
      entityId: tenant.id,
      description: `${owner.name} created organization ${tenant.name}`,
      metadata: { name: tenant.name, slug: tenant.slug, businessType: tenant.businessType, sellerType: tenant.sellerType },
    });
    await platform.auditService.record(client, {
      tenantId: tenant.id,
      userId: owner.id,
      actionType: "user.create",
      entityType: "user",
      entityId: owner.id,
      description: `${owner.name} created the admin account`,
      metadata: { role: owner.role, email: owner.email },
    });

    return { tenantId: tenant.id, actor: ownerActor };
  });

  // ── 2. Categories ────────────────────────────────────────────────────────
  console.log(`  [2/18] Categories (${CATEGORY_NAMES.length})…`);
  const categoryIdByName = new Map();
  for (const name of CATEGORY_NAMES) {
    const category = await catalog.categoryService.createCategory({ name }, actor);
    categoryIdByName.set(name, category.id);
  }

  // ── 3. Generic medicines ─────────────────────────────────────────────────
  console.log(`  [3/18] Generic medicines (${Object.keys(GENERICS).length})…`);
  const genericIdByKey = new Map();
  for (const [key, name] of Object.entries(GENERICS)) {
    const generic = await catalog.genericMedicineService.createGenericMedicine({ name }, actor);
    genericIdByKey.set(key, generic.id);
  }

  // ── 4. Products (zero stock — stock only ever arrives via purchase) ─────
  console.log(`  [4/18] Products (${PRODUCTS.length}, zero opening stock)…`);
  const productIdBySku = new Map();
  for (const p of PRODUCTS) {
    const product = await catalog.productService.saveProduct({
      name: p.name,
      categoryId: categoryIdByName.get(p.cat),
      piecesPerCase: p.ppc,
      purchasePrice: p.pp,
      wholesalePrice: p.wp,
      retailPrice: p.rp,
      brand: p.brand,
      sku: p.sku,
      description: p.desc,
      reorderLevel: p.reorder,
      requiresBatch: Boolean(p.generic),
      genericMedicineId: p.generic ? genericIdByKey.get(p.generic) : null,
      genericName: p.generic ? GENERICS[p.generic] : "",
      drugType: p.drugType || "",
      dosageForm: p.dosageForm || "",
      strength: p.strength || "",
      manufacturer: p.brand,
      regNumber: p.regNumber || "",
      medicineType: p.medicineType || "",
    }, actor);
    productIdBySku.set(p.sku, product.id);
  }

  // ── 5. Suppliers ─────────────────────────────────────────────────────────
  console.log("  [5/18] Suppliers…");
  const supplierIdByKey = new Map();
  for (const [key, s] of Object.entries(SUPPLIERS)) {
    const supplier = await suppliersReg.supplierService.saveSupplier({ name: s.name, phone: s.phone, address: s.address }, actor);
    supplierIdByKey.set(key, supplier.id);
  }

  // ── 6. Retail customers ──────────────────────────────────────────────────
  console.log("  [6/18] Retail customers…");
  const customerIdByName = new Map();
  for (const c of RETAIL_CUSTOMERS) {
    const customer = await customers.retailCustomerService.saveRetailCustomer({
      name: c.name,
      phone: c.phone,
      address: c.address,
      note: c.note,
      status: "ACTIVE",
    }, actor);
    customerIdByName.set(c.name, customer.id);
  }

  // ── 7. Owner's capital injection — every WITHDRAWAL/DEPOSIT below is
  //      asserted against a real account balance, so cash has to exist
  //      before anything spends or receives it. Pharmacy stock is low
  //      ticket-size compared to electronics/vehicles. ─────────────────────
  console.log("  [7/18] Owner's capital injection…");
  await finance.financeAccountService.recordTransaction({
    accountType: "CASH", type: "DEPOSIT", amount: 400000, date: daysAgo(10),
    note: "Owner's capital injection — opening cash balance",
  }, actor);
  await finance.financeAccountService.recordTransaction({
    accountType: "BANK", type: "DEPOSIT", amount: 400000, date: daysAgo(10),
    note: "Owner's capital injection — opening bank balance",
  }, actor);

  // ── 8. Purchase receipts — one per supplier, bringing every product's
  //      stock (and, for requiresBatch medicines, a real drug_batches row
  //      with batch number, manufacture date and expiry date) in for real —
  //      this is the ONLY place stock_pieces moves off zero. ───────────────
  console.log("  [8/18] Purchase receipts (stock & batches arrive here, per supplier)…");
  const productsBySupplierKey = new Map();
  for (const p of PRODUCTS) {
    const list = productsBySupplierKey.get(p.sup) || [];
    list.push(p);
    productsBySupplierKey.set(p.sup, list);
  }

  const paymentMethodByKey = { S1: "BANK", S2: "CASH", S3: "BANK", S4: "CASH", S5: "BANK", S6: "CASH" };
  let purchaseInvoiceCounter = 9000;
  let batchCounter = 1;

  for (const [key, s] of Object.entries(SUPPLIERS)) {
    const productsForSupplier = productsBySupplierKey.get(key) || [];
    if (!productsForSupplier.length) continue;

    const items = productsForSupplier.map((p) => ({
      productId: productIdBySku.get(p.sku),
      productName: p.name,
      quantityPieces: p.qty,
      purchasePrice: p.pp,
      ...(p.generic ? {
        batchNumber: `${p.sku}-B${batchCounter++}`,
        manufactureDate: daysAgo(200),
        expiryDate: daysFromNow(p.nearExpiryDays ?? 700),
      } : {}),
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.quantityPieces * item.purchasePrice, 0);
    const paidAmount = Math.round(totalAmount * 0.4);

    await suppliersReg.purchaseReceiveService.savePurchaseReceipt({
      supplierId: supplierIdByKey.get(key),
      supplierInvoiceNo: `PINV-${purchaseInvoiceCounter++}`,
      purchaseDate: daysAgo(9),
      items,
      discount: 0,
      paidAmount,
      paymentMethod: paymentMethodByKey[key],
      note: `Opening stock purchase from ${s.name}`,
    }, actor);
  }

  // ── 9. Extra supplier payment (beyond the down-payment already made
  //      at purchase time) ────────────────────────────────────────────────
  console.log("  [9/18] Extra supplier payment…");
  await suppliersReg.supplierPaymentService.saveSupplierPayment({
    supplierId: supplierIdByKey.get("S5"),
    paymentDate: daysAgo(7),
    amount: 20000,
    paymentMethod: "BANK",
    note: "Additional payment towards Renata PLC outstanding due",
  }, actor);

  // ── 10. Purchase return — a wrong-batch syrup return to the distributor ──
  console.log("  [10/18] Purchase return…");
  await suppliersReg.purchaseReturnService.savePurchaseReturn({
    supplierId: supplierIdByKey.get("S3"),
    returnDate: daysAgo(7),
    items: [{ productId: productIdBySku.get("PH-SYR-FENADIN30"), quantityPieces: 10 }],
    note: "10 bottles of Fenadin Syrup returned — damaged carton on delivery",
  }, actor);

  // ── 11. HR: departments, designations, employees, salary payments ───────
  console.log("  [11/18] Departments, designations, employees, salary…");
  const departmentIds = [];
  for (const d of DEPARTMENTS) {
    const department = await hr.departmentService.createDepartment({ name: d.name, code: d.code, status: "ACTIVE" }, actor);
    departmentIds.push(department.id);
  }

  const designationIds = [];
  for (const d of DESIGNATIONS) {
    const designation = await hr.designationService.createDesignation({ name: d.name, code: d.code, status: "ACTIVE" }, actor);
    designationIds.push(designation.id);
  }

  for (const e of EMPLOYEES) {
    const employee = await hr.employeeService.createEmployee({
      name: e.name,
      phone: e.phone,
      departmentId: departmentIds[e.department],
      designationId: designationIds[e.designation],
      joinDate: daysAgo(200),
      salaryAmount: e.salaryAmount,
      payType: "MONTHLY",
      status: "ACTIVE",
    }, actor);

    await hr.salaryPaymentService.recordPayment({
      employeeId: employee.id,
      amount: e.salaryAmount,
      paymentMethod: "CASH",
      paymentDate: daysAgo(0),
      note: `Salary for ${daysAgo(0).slice(0, 7)}`,
    }, actor);
  }

  // ── 12. Open a retail cash session (counter shift) before ringing up
  //       the cash sales below ───────────────────────────────────────────
  console.log("  [12/18] Opening retail cash session…");
  const { session: cashSession } = await operations.retailCashSessionService.startSession({
    openingCash: 5000,
    note: "Morning shift float",
  }, actor);

  // ── 13. Sales invoices — quick-sale, walk-in, registered w/ due,
  //       wholesale. requiresBatch line items auto-allocate FEFO from the
  //       drug_batches rows the purchase receipts above created. ─────────
  console.log("  [13/18] Sales invoices (quick-sale, walk-in, registered, wholesale)…");

  // Walk-in quick-sale — OTC counter sale, fully paid in cash. Walk-in sales
  // must be fully paid, so paidAmount is deliberately set above the true
  // total — normalizeSalesInvoice clamps it down to the exact total.
  const quickSaleInvoice = await operations.salesInvoiceService.saveSalesInvoice({
    customerType: "WALK_IN",
    saleType: "QUICK_SALE",
    invoiceDate: daysAgo(2),
    items: [
      { productId: productIdBySku.get("PH-TAB-NAPA500"), quantityPieces: 2, actualSalePrice: 12 },
      { productId: productIdBySku.get("PH-PCH-SANITIZER200"), quantityPieces: 1, actualSalePrice: 95 },
      { productId: productIdBySku.get("PH-PCH-MASK50"), quantityPieces: 1, actualSalePrice: 320 },
    ],
    discount: 10,
    paidAmount: 999999,
    paymentMethod: "CASH",
    note: "Walk-in counter sale — paracetamol, sanitizer & masks",
  }, actor);

  // Walk-in — prescription meds, fully paid in cash.
  const bikeSaleInvoice = await operations.salesInvoiceService.saveSalesInvoice({
    customerType: "WALK_IN",
    saleType: "RETAIL",
    invoiceDate: daysAgo(2),
    items: [
      { productId: productIdBySku.get("PH-TAB-SECLO20"), quantityPieces: 2, actualSalePrice: 36 },
      { productId: productIdBySku.get("PH-TAB-ANTOP40"), quantityPieces: 1, actualSalePrice: 39 },
    ],
    paidAmount: 999999,
    paymentMethod: "CASH",
    note: "Walk-in counter sale — prescription refill",
  }, actor);

  // Registered customer — monthly refill with a partial payment, leaving a
  // due balance on the customer's account.
  await operations.salesInvoiceService.saveSalesInvoice({
    customerType: "REGISTERED",
    customerId: customerIdByName.get("Rehana Begum"),
    saleType: "RETAIL",
    invoiceDate: daysAgo(1),
    items: [
      { productId: productIdBySku.get("PH-TAB-AMDOCAL5"), quantityPieces: 3, actualSalePrice: 18 },
      { productId: productIdBySku.get("PH-TAB-CETIM10"), quantityPieces: 1, actualSalePrice: 10 },
    ],
    paidAmount: 40,
    paymentMethod: "CASH",
    note: "Monthly prescription refill — partial payment, balance on account",
  }, actor);

  // Wholesale bulk order to a registered clinic customer, fully paid.
  await operations.salesInvoiceService.saveSalesInvoice({
    customerType: "REGISTERED",
    customerId: customerIdByName.get("Dr. Farida Yasmin"),
    saleType: "WHOLESALE",
    invoiceDate: daysAgo(1),
    items: [
      { productId: productIdBySku.get("PH-INJ-CEFTRX1G"), quantityPieces: 20, actualSalePrice: 68 },
      { productId: productIdBySku.get("PH-DEV-SYR5ML"), quantityPieces: 5, actualSalePrice: 500 },
    ],
    paidAmount: 999999,
    paymentMethod: "BANK",
    note: "Clinic bulk order — injections & syringes",
  }, actor);

  // ── 14. Close the retail cash session ────────────────────────────────────
  console.log("  [14/18] Closing retail cash session…");
  await operations.retailCashSessionService.stopSession(cashSession.id, {
    countedCash: 5000 + quickSaleInvoice.totalAmount + bikeSaleInvoice.totalAmount,
    note: "End of shift count",
  }, actor);

  // ── 15. Sales return — customer returns one item from the quick-sale
  //       invoice above ──────────────────────────────────────────────────
  console.log("  [15/18] Sales return…");
  const returnedItem = quickSaleInvoice.items.find((item) => item.productId === productIdBySku.get("PH-PCH-MASK50"));
  await operations.salesReturnService.saveSalesReturn({
    salesInvoiceId: quickSaleInvoice.id,
    returnDate: daysAgo(1),
    refundMethod: "CASH",
    items: [{
      salesInvoiceItemId: returnedItem.id,
      productId: returnedItem.productId,
      productName: returnedItem.productName,
      quantityPieces: 1,
      actualSalePrice: returnedItem.actualSalePrice,
      costPriceSnapshot: returnedItem.costPriceSnapshot,
      condition: "GOOD",
    }],
    note: "Customer returned face mask box — unopened, wrong item picked up",
  }, actor);

  // ── 16. Quotation → convert to invoice — bulk clinic order ──────────────
  console.log("  [16/18] Quotation (create + convert to invoice)…");
  const quotation = await operations.quotationService.createQuotation({
    customerId: customerIdByName.get("Dr. Farida Yasmin"),
    customerName: "Dr. Farida Yasmin",
    customerPhone: "01911-500023",
    quoteDate: daysAgo(3),
    validityDays: 7,
    items: [
      { productId: productIdBySku.get("PH-DEV-OMRONBP"), productName: "Omron Digital BP Machine (HEM-7120)", quantity: 2, unitPrice: 2500 },
      { productId: productIdBySku.get("PH-DEV-MOREPENGLU"), productName: "Dr. Morepen Glucometer (BG-03)", quantity: 2, unitPrice: 1400 },
    ],
    notes: "Quote for clinic equipment restock, per phone inquiry",
  }, actor);

  await operations.quotationService.convertToInvoice(quotation.id, {
    paymentMethod: "BANK",
    paidAmount: 7800,
    invoiceDate: daysAgo(2),
    note: "Converted from quotation — clinic confirmed order",
  }, actor);

  // ── 17. Expenses (+ one soft-deleted, to give the Trash page content) ───
  // expenseService only allows creating an expense dated today — unlike
  // every other flow above, there is no way to backdate one at creation.
  console.log("  [17/18] Expenses…");
  await operations.expenseService.saveExpense({ date: daysAgo(0), category: "Rent", amount: 28000, note: "Shop monthly rent" }, actor);
  await operations.expenseService.saveExpense({ date: daysAgo(0), category: "Vehicle", amount: 2500, note: "Delivery bike fuel for home delivery orders" }, actor);
  await operations.expenseService.saveExpense({ date: daysAgo(0), category: "Load/Unload", amount: 1200, note: "Stock unloading labour" }, actor);
  await operations.expenseService.saveExpense({ date: daysAgo(0), category: "Office", amount: 3800, note: "Electricity bill & stationery" }, actor);
  await operations.expenseService.saveExpense({ date: daysAgo(0), category: "Other", amount: 5000, note: "Local newspaper ad for health camp" }, actor);

  const trashExpense = await operations.expenseService.saveExpense({ date: daysAgo(0), category: "Other", amount: 300, note: "Duplicate entry — to be removed" }, actor);
  await operations.expenseService.removeExpense(trashExpense.id, actor, "Entered twice by mistake");

  // ── 18. Extra users (Manager + Operator) ────────────────────────────────
  console.log("  [18/18] Extra users…");
  await platform.userService.createUser({
    name: "Golam Mostafa", email: "manager@pharmacarebd.com", password: "Manager@1234", role: USER_ROLES.MANAGER, status: "active",
  }, actor);
  await platform.userService.createUser({
    name: "Ferdousi Priya", email: "operator@pharmacarebd.com", password: "Operator@1234", role: USER_ROLES.OPERATOR, status: "active",
  }, actor);

  console.log("\n✓ PharmaCare BD demo seed complete — every stock unit, batch/expiry record, ledger");
  console.log("  balance and due amount above was produced by real service calls, not fabricated by direct SQL.\n");
  console.log(`  Tenant:      ${TENANT_NAME} (${tenantId})`);
  console.log(`  Categories:  ${CATEGORY_NAMES.length}`);
  console.log(`  Products:    ${PRODUCTS.length} (${PRODUCTS.filter((p) => p.generic).length} batch/expiry-tracked)`);
  console.log(`  Suppliers:   ${Object.keys(SUPPLIERS).length}`);
  console.log(`  Customers:   ${RETAIL_CUSTOMERS.length}`);
  console.log(`  Employees:   ${EMPLOYEES.length}`);
  console.log("\nLogin (Super Admin):");
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log("\nAlso created: manager@pharmacarebd.com / Manager@1234, operator@pharmacarebd.com / Operator@1234");
  console.log("(these two roles have no permissions granted yet — assign them from the Permissions page).");
  console.log("\nNote: permission cache refreshes at most every 60s — if you log in immediately");
  console.log("and see missing menus, wait a minute or restart the dev server.\n");

  await db.getPool().end();
}

main().catch((err) => {
  console.error("\n✗ Seed failed.\n", err);
  process.exit(1);
});
