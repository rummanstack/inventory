/**
 * AutoMart BD demo seed — creates a single ready-to-demo vehicle RETAIL
 * tenant (motorcycles, cars, bicycles, trucks — POS/quick-sale model) by
 * driving the exact same service layer the app itself uses for every
 * transactional flow.
 *
 * Modeled directly on seedElectroMart.js (same retail/POS shape — serial
 * tracking, warranty, trade-ins, installment sales, repair jobs), swapped
 * to businessType VEHICLE. Nothing here fabricates a ledger balance, a
 * stock level, or a chassis/engine serial directly:
 *   - Products are created with zero stock — every unit of stock, and every
 *     product_serials row for a serial-tracked item (every motorcycle, car,
 *     and truck — bicycles and parts are not individually serialed), arrives
 *     through a real purchase-receive call to a supplier. The generic
 *     "Serial Number" field on product_serials is used for the chassis/
 *     engine number, exactly as documented for the VEHICLE business type.
 *   - Sales (quick-sale, retail, wholesale), the sales return, the quotation
 *     conversion, the trade-in (old bike traded toward a new one), and the
 *     installment-financed motorcycle sale all consume stock (and real
 *     product_serials rows) the same way the POS screen does — nothing is
 *     pre-computed and inserted.
 *   - Supplier due, customer due, installment schedules, a workshop repair
 *     job, and a warranty claim are all produced as side effects of real
 *     service calls, exactly like a user clicking through the UI.
 *
 * Run (from backend/):
 *   node scripts/seedAutoMartBD.js
 *
 * Always targets the DEV database (forces npm_lifecycle_event='dev' before
 * config/env.js is loaded) — never touches production, regardless of how
 * it's invoked. NOT safe to run twice against the same database — it exits
 * early with a message if the tenant already exists. If you need to
 * re-seed, wipe the tenant's data first.
 *
 * Login: admin@automartbd.com / Automart@1234
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

const TENANT_NAME = "AutoMart BD";
const TENANT_SLUG = "automart-bd";
const TENANT_ADDRESS = "Plot 14, Pragati Sarani, Kuril, Dhaka-1229";
const TENANT_PHONE = "01700-000002";
const ADMIN_EMAIL = "admin@automartbd.com";
const ADMIN_PASSWORD = "Automart@1234";
const ADMIN_NAME = "Kamal Hossain (AutoMart BD Admin)";

// Curated to match exactly the menu set confirmed for the VEHICLE retail
// persona — POS/quick-sale + sales invoices/returns + quotations + trade-ins
// + installment sales + warranty/repair + finance + HR, no DSR/dealer
// distribution surface and no accounting/voucher module. Same shape as
// seedElectroMart.js's FEATURES (VEHICLE gets the same default feature set
// as ELECTRONICS — see defaultFeaturesForBusinessType in tenantService.js).
const FEATURES = [
  "dashboard",
  "retailer-quick-sale", "retailer-cash-sessions", "quotations", "retailer-promotions", "trade-ins",
  "retailer-sales-invoices", "retailer-sales-return",
  "installment-plans", "installment-reports", "installment-dashboard", "installment-late-fee-rules",
  "retail-customers", "retail-customer-retention", "retailer-customer-due", "retailer-due-collection",
  "products", "stock-movement", "low-stock-alerts", "product-serials", "damaged-stock",
  "suppliers", "purchase-receive", "purchase-returns", "supplier-payments", "supplier-discounts", "supplier-statement",
  "warranty-claims", "repair-jobs",
  "finance-dashboard", "finance-accounts", "expenses", "profit",
  "retailer-daily-sales-report", "reports", "purchase-report", "stock-movement-report",
  "sales-return-report", "customer-due-report", "cash-session-report", "damaged-stock-report",
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

// Chassis/engine serial strings for a purchase-receive line item — one per
// unit, unique tenant-wide because every SKU is unique. Stored in
// product_serials.serial_number, the same generic field the VEHICLE
// business type uses for chassis/engine numbers (see ProductSerialFormModal).
function generateSerials(sku, qty) {
  const list = [];
  for (let i = 1; i <= qty; i += 1) {
    list.push(`${sku}-${String(i).padStart(4, "0")}`);
  }
  return list;
}

// ─── Categories ─────────────────────────────────────────────────────────────

const CATEGORY_NAMES = [
  "Motorcycles", "Cars", "Bicycles", "Commercial Trucks & Pickups",
  "Spare Parts & Accessories", "Tyres & Batteries", "Helmets & Riding Gear",
];

// ─── Suppliers ──────────────────────────────────────────────────────────────
// Keyed S1..S6 so PRODUCTS below can reference them without repeating names.

const SUPPLIERS = {
  S1: { name: "Uttara Motors Ltd (Yamaha)", phone: "02-9558811", address: "Uttara Motors Bhaban, 88 Motijheel C/A, Dhaka-1000" },
  S2: { name: "Bangladesh Honda Pvt. Ltd.", phone: "01919-000101", address: "Bhaluka Industrial Park, Bhaluka, Mymensingh" },
  S3: { name: "Runner Automobiles Ltd (Bajaj)", phone: "02-8878001", address: "63 Kazi Nazrul Islam Ave, Tejgaon, Dhaka-1215" },
  S4: { name: "Rangs Motors Ltd (Mitsubishi/Toyota)", phone: "02-9887701", address: "Rangs Bhaban, Gulshan-1, Dhaka-1212" },
  S5: { name: "PHP Motors Corporation (Hero)", phone: "031-2570022", address: "PHP Tower, Agrabad C/A, Chattogram-4100" },
  S6: { name: "Meghna Auto Industries (Tata/Duranta)", phone: "02-7691234", address: "Meghna Industrial Zone, Rupganj, Narayanganj" },
};

// ─── Products ───────────────────────────────────────────────────────────────
// qty = how many units will be purchased from `sup` to bring in opening
// stock (there is no other way for stock, or product_serials rows for
// serial-tracked items, to appear — see header comment). serial:true = every
// unit gets its own chassis/engine number row (motorcycles, cars, trucks);
// serial:false = case/piece stock only (bicycles, parts, tyres, gear).

const PRODUCTS = [
  // ── Motorcycles (chassis/engine serial tracked) ──────────────────────────
  { cat: "Motorcycles", name: "Yamaha FZS-FI V4 (149cc)", brand: "Yamaha", model: "FZS-FI V4", sku: "AM-BIKE-YFZSFI", ppc: 1, pp: 245000, wp: 258000, rp: 272000, qty: 12, serial: true, warranty: 24, reorder: 4, desc: "149cc fuel-injected commuter with LED headlamp and digital cluster.", sup: "S1" },
  { cat: "Motorcycles", name: "Yamaha MT-15 V2 (155cc)", brand: "Yamaha", model: "MT-15 V2", sku: "AM-BIKE-YMT15", ppc: 1, pp: 340000, wp: 358000, rp: 378000, qty: 8, serial: true, warranty: 24, reorder: 3, desc: "155cc naked street bike with VVA engine and upside-down front fork.", sup: "S1" },
  { cat: "Motorcycles", name: "Honda CB Shine 125", brand: "Honda", model: "CB Shine 125", sku: "AM-BIKE-HCBSH", ppc: 1, pp: 178000, wp: 188000, rp: 198000, qty: 15, serial: true, warranty: 18, reorder: 5, desc: "125cc fuel-efficient commuter with HET engine technology.", sup: "S2" },
  { cat: "Motorcycles", name: "Honda Livo 110", brand: "Honda", model: "Livo", sku: "AM-BIKE-HLIVO", ppc: 1, pp: 158000, wp: 168000, rp: 178000, qty: 18, serial: true, warranty: 18, reorder: 6, desc: "110cc lightweight commuter with best-in-class mileage.", sup: "S2" },
  { cat: "Motorcycles", name: "Bajaj Pulsar NS160", brand: "Bajaj", model: "Pulsar NS160", sku: "AM-BIKE-BPNS160", ppc: 1, pp: 258000, wp: 272000, rp: 288000, qty: 10, serial: true, warranty: 24, reorder: 4, desc: "160cc naked sports bike with perimeter frame and triple-spark engine.", sup: "S3" },
  { cat: "Motorcycles", name: "Bajaj Discover 125", brand: "Bajaj", model: "Discover 125", sku: "AM-BIKE-BDIS125", ppc: 1, pp: 168000, wp: 178000, rp: 189000, qty: 14, serial: true, warranty: 18, reorder: 5, desc: "125cc commuter with DTS-i engine and alloy wheels.", sup: "S3" },
  { cat: "Motorcycles", name: "Hero Hunk 150R", brand: "Hero", model: "Hunk 150R", sku: "AM-BIKE-HHUNK150", ppc: 1, pp: 218000, wp: 230000, rp: 244000, qty: 9, serial: true, warranty: 24, reorder: 4, desc: "150cc muscular street bike with XSens engine platform.", sup: "S5" },
  { cat: "Motorcycles", name: "Hero Splendor Plus 100", brand: "Hero", model: "Splendor Plus", sku: "AM-BIKE-HSPL100", ppc: 1, pp: 132000, wp: 140000, rp: 149000, qty: 20, serial: true, warranty: 18, reorder: 6, desc: "100cc, Bangladesh's best-selling everyday commuter.", sup: "S5" },

  // ── Cars (chassis serial tracked) ────────────────────────────────────────
  { cat: "Cars", name: "Toyota Axio Hybrid (2018, Reconditioned)", brand: "Toyota", model: "Axio Hybrid", sku: "AM-CAR-TOYAXIOHYB", ppc: 1, pp: 2150000, wp: 2250000, rp: 2380000, qty: 4, serial: true, warranty: 12, reorder: 2, desc: "Reconditioned Japanese hybrid sedan, low mileage, auto transmission.", sup: "S4" },
  { cat: "Cars", name: "Toyota Premio (2017, Reconditioned)", brand: "Toyota", model: "Premio", sku: "AM-CAR-TOYPREMIO", ppc: 1, pp: 2450000, wp: 2580000, rp: 2720000, qty: 3, serial: true, warranty: 12, reorder: 2, desc: "Reconditioned Japanese sedan with spacious cabin and smooth CVT.", sup: "S4" },
  { cat: "Cars", name: "Mitsubishi Xpander (Brand New)", brand: "Mitsubishi", model: "Xpander", sku: "AM-CAR-MITXPAND", ppc: 1, pp: 3450000, wp: 3600000, rp: 3790000, qty: 3, serial: true, warranty: 36, reorder: 2, desc: "Brand-new 7-seater MPV with dynamic shield design.", sup: "S4" },
  { cat: "Cars", name: "Mitsubishi Attrage (Brand New)", brand: "Mitsubishi", model: "Attrage", sku: "AM-CAR-MITATTR", ppc: 1, pp: 2650000, wp: 2780000, rp: 2920000, qty: 4, serial: true, warranty: 36, reorder: 2, desc: "Brand-new fuel-efficient sedan, ideal for city and highway use.", sup: "S4" },

  // ── Bicycles ──────────────────────────────────────────────────────────────
  { cat: "Bicycles", name: "Duranta Desire 26\" (Single Speed)", brand: "Duranta", model: "Desire", sku: "AM-CYC-DURDESIRE", ppc: 1, pp: 6800, wp: 7500, rp: 8500, qty: 40, serial: false, warranty: 12, reorder: 10, desc: "26-inch single-speed city bicycle with steel frame.", sup: "S6" },
  { cat: "Bicycles", name: "Duranta Warior X 26\" (21 Speed MTB)", brand: "Duranta", model: "Warior X", sku: "AM-CYC-DURWARX", ppc: 1, pp: 12500, wp: 13800, rp: 15500, qty: 25, serial: false, warranty: 12, reorder: 8, desc: "21-speed mountain bike with front suspension and disc brakes.", sup: "S6" },
  { cat: "Bicycles", name: "Phoenix Racer 700C (Road Bike)", brand: "Phoenix", model: "Racer 700C", sku: "AM-CYC-PHXRACER", ppc: 1, pp: 18500, wp: 20200, rp: 22500, qty: 15, serial: false, warranty: 12, reorder: 5, desc: "Lightweight aluminium-frame road bike with drop handlebar.", sup: "S6" },
  { cat: "Bicycles", name: "Veloce Kids Bicycle 20\"", brand: "Veloce", model: "Kids 20", sku: "AM-CYC-VELKID20", ppc: 1, pp: 5200, wp: 5800, rp: 6800, qty: 30, serial: false, warranty: 6, reorder: 8, desc: "20-inch kids bicycle with training wheels and basket.", sup: "S6" },

  // ── Commercial Trucks & Pickups (chassis serial tracked) ─────────────────
  { cat: "Commercial Trucks & Pickups", name: "Tata Ace Gold Pickup", brand: "Tata", model: "Ace Gold", sku: "AM-TRK-TATAACE", ppc: 1, pp: 1250000, wp: 1320000, rp: 1395000, qty: 5, serial: true, warranty: 24, reorder: 2, desc: "1-ton mini pickup, popular for last-mile commercial delivery.", sup: "S6" },
  { cat: "Commercial Trucks & Pickups", name: "Tata 407 Truck (LCV)", brand: "Tata", model: "407", sku: "AM-TRK-TATA407", ppc: 1, pp: 2150000, wp: 2280000, rp: 2420000, qty: 3, serial: true, warranty: 24, reorder: 2, desc: "Light commercial truck with 2.5-ton payload capacity.", sup: "S6" },

  // ── Spare Parts & Accessories ─────────────────────────────────────────────
  { cat: "Spare Parts & Accessories", name: "Yamaha Genuine Engine Oil 1L", brand: "Yamaha", model: "Yamalube", sku: "AM-PRT-YAMOIL1L", ppc: 12, pp: 380, wp: 450, rp: 550, qty: 100, serial: false, warranty: 0, reorder: 25, desc: "Genuine 4-stroke engine oil, 1-litre bottle.", sup: "S1" },
  { cat: "Spare Parts & Accessories", name: "Honda Genuine Brake Pad Set", brand: "Honda", model: "Universal", sku: "AM-PRT-HONBRKPAD", ppc: 1, pp: 650, wp: 780, rp: 950, qty: 60, serial: false, warranty: 6, reorder: 15, desc: "Genuine front brake pad set for Honda commuter models.", sup: "S2" },
  { cat: "Spare Parts & Accessories", name: "Bajaj Chain Sprocket Kit", brand: "Bajaj", model: "Universal", sku: "AM-PRT-BAJCHAIN", ppc: 1, pp: 1200, wp: 1400, rp: 1650, qty: 40, serial: false, warranty: 6, reorder: 10, desc: "Chain and sprocket replacement kit for Bajaj motorcycles.", sup: "S3" },
  { cat: "Spare Parts & Accessories", name: "Universal Motorcycle Cover", brand: "Generic", model: "All-Weather", sku: "AM-PRT-MCOVER", ppc: 1, pp: 450, wp: 550, rp: 750, qty: 80, serial: false, warranty: 0, reorder: 20, desc: "Waterproof all-weather motorcycle body cover.", sup: "S6" },

  // ── Tyres & Batteries ─────────────────────────────────────────────────────
  { cat: "Tyres & Batteries", name: "MRF Nylogrip Motorcycle Tyre (100/90-17)", brand: "MRF", model: "Nylogrip", sku: "AM-TYR-MRF10090", ppc: 1, pp: 2200, wp: 2500, rp: 2900, qty: 50, serial: false, warranty: 12, reorder: 12, desc: "Nylon-reinforced motorcycle tyre, 100/90-17 size.", sup: "S1" },
  { cat: "Tyres & Batteries", name: "Rahimafrooz Motorcycle Battery 12V 5Ah", brand: "Rahimafrooz", model: "12V-5Ah", sku: "AM-BAT-RAHIM12V5", ppc: 1, pp: 1800, wp: 2100, rp: 2500, qty: 45, serial: false, warranty: 12, reorder: 12, desc: "Maintenance-free 12V 5Ah motorcycle battery.", sup: "S2" },

  // ── Helmets & Riding Gear ──────────────────────────────────────────────────
  { cat: "Helmets & Riding Gear", name: "Vega Cliff Full Face Helmet", brand: "Vega", model: "Cliff", sku: "AM-GER-VEGACLIFF", ppc: 1, pp: 1800, wp: 2100, rp: 2600, qty: 60, serial: false, warranty: 12, reorder: 15, desc: "ISI-marked full-face helmet with clear visor.", sup: "S3" },
  { cat: "Helmets & Riding Gear", name: "Studds Ninja Open Face Helmet", brand: "Studds", model: "Ninja", sku: "AM-GER-STUDDSNINJA", ppc: 1, pp: 950, wp: 1150, rp: 1450, qty: 70, serial: false, warranty: 12, reorder: 18, desc: "Lightweight open-face helmet for daily commuting.", sup: "S5" },
  { cat: "Helmets & Riding Gear", name: "Riding Gloves (Pair)", brand: "Generic", model: "All-Season", sku: "AM-GER-GLOVES", ppc: 1, pp: 350, wp: 450, rp: 650, qty: 90, serial: false, warranty: 0, reorder: 20, desc: "All-season riding gloves with knuckle protection.", sup: "S3" },
];

// ─── Retail customers ───────────────────────────────────────────────────────

const RETAIL_CUSTOMERS = [
  { name: "Rafiqul Islam", phone: "01711-500011", address: "House 22, Road 9, Mirpur-11, Dhaka", note: "Prefers EMI on motorcycle purchases" },
  { name: "Shirin Akter", phone: "01811-500012", address: "Flat 6C, Bashundhara R/A, Dhaka", note: "" },
  { name: "Delwar Hossain", phone: "01911-500013", address: "Fatullah, Narayanganj", note: "Fleet buyer — runs a courier delivery business" },
  { name: "Nasima Begum", phone: "01611-500014", address: "Savar, Dhaka", note: "" },
  { name: "Tanvir Ahmed", phone: "01751-500015", address: "Banani, Dhaka", note: "Repeat customer — bought a Yamaha last year" },
];

// ─── HR ─────────────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  { name: "Sales & Showroom", code: "SLS" },
  { name: "Workshop & Service", code: "WKS" },
  { name: "Accounts & Finance", code: "ACF" },
];

const DESIGNATIONS = [
  { name: "Sales Executive", code: "SLEXEC" },
  { name: "Workshop Technician", code: "WKTECH" },
  { name: "Accounts Officer", code: "ACOFF" },
];

const EMPLOYEES = [
  { name: "Mostafizur Rahman", phone: "01777-900001", department: 0, designation: 0, salaryAmount: 24000 },
  { name: "Jahangir Alam", phone: "01777-900002", department: 1, designation: 1, salaryAmount: 27000 },
  { name: "Ruma Akter", phone: "01777-900003", department: 2, designation: 2, salaryAmount: 23000 },
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

  console.log(`\nSeeding AutoMart BD demo into ${env.DATABASE_LABEL} database via the real service layer…\n`);

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
  console.log("  [1/21] Tenant, admin user, permissions…");
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
      businessType: BUSINESS_TYPES.VEHICLE,
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
  console.log(`  [2/21] Categories (${CATEGORY_NAMES.length})…`);
  const categoryIdByName = new Map();
  for (const name of CATEGORY_NAMES) {
    const category = await catalog.categoryService.createCategory({ name }, actor);
    categoryIdByName.set(name, category.id);
  }

  // ── 3. Products (zero stock — stock only ever arrives via purchase) ─────
  console.log(`  [3/21] Products (${PRODUCTS.length}, zero opening stock)…`);
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
      model: p.model,
      sku: p.sku,
      description: p.desc,
      serialRequired: p.serial,
      warrantyMonths: p.warranty,
      reorderLevel: p.reorder,
    }, actor);
    productIdBySku.set(p.sku, product.id);
  }

  // ── 4. Suppliers ─────────────────────────────────────────────────────────
  console.log("  [4/21] Suppliers…");
  const supplierIdByKey = new Map();
  for (const [key, s] of Object.entries(SUPPLIERS)) {
    const supplier = await suppliersReg.supplierService.saveSupplier({ name: s.name, phone: s.phone, address: s.address }, actor);
    supplierIdByKey.set(key, supplier.id);
  }

  // ── 5. Retail customers ──────────────────────────────────────────────────
  console.log("  [5/21] Retail customers…");
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

  // ── 6. Owner's capital injection — every WITHDRAWAL/DEPOSIT below is
  //      asserted against a real account balance, so cash has to exist
  //      before anything spends or receives it. Vehicles are high-ticket,
  //      so opening capital is sized accordingly. ────────────────────────
  console.log("  [6/21] Owner's capital injection…");
  await finance.financeAccountService.recordTransaction({
    accountType: "CASH", type: "DEPOSIT", amount: 6000000, date: daysAgo(10),
    note: "Owner's capital injection — opening cash balance",
  }, actor);
  await finance.financeAccountService.recordTransaction({
    accountType: "BANK", type: "DEPOSIT", amount: 32000000, date: daysAgo(10),
    note: "Owner's capital injection — opening bank balance",
  }, actor);

  // ── 7. Purchase receipts — one per supplier, bringing every product's
  //      stock (and, for serial-tracked vehicles, real product_serials rows
  //      holding the chassis/engine number) in for real — this is the ONLY
  //      place stock_pieces moves off zero. ──────────────────────────────
  console.log("  [7/21] Purchase receipts (stock & chassis/engine serials arrive here, per supplier)…");
  const productsBySupplierKey = new Map();
  for (const p of PRODUCTS) {
    const list = productsBySupplierKey.get(p.sup) || [];
    list.push(p);
    productsBySupplierKey.set(p.sup, list);
  }

  const paymentMethodByKey = { S1: "BANK", S2: "CASH", S3: "BANK", S4: "BANK", S5: "CASH", S6: "BANK" };
  let purchaseInvoiceCounter = 7000;

  for (const [key, s] of Object.entries(SUPPLIERS)) {
    const productsForSupplier = productsBySupplierKey.get(key) || [];
    if (!productsForSupplier.length) continue;

    const items = productsForSupplier.map((p) => ({
      productId: productIdBySku.get(p.sku),
      productName: p.name,
      quantityPieces: p.qty,
      purchasePrice: p.pp,
      serials: p.serial ? generateSerials(p.sku, p.qty) : [],
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

  // ── 8. Extra supplier payment (beyond the down-payment already made
  //      at purchase time) ────────────────────────────────────────────────
  console.log("  [8/21] Extra supplier payment…");
  await suppliersReg.supplierPaymentService.saveSupplierPayment({
    supplierId: supplierIdByKey.get("S4"),
    paymentDate: daysAgo(7),
    amount: 500000,
    paymentMethod: "BANK",
    note: "Additional payment towards Rangs Motors Ltd outstanding due",
  }, actor);

  // ── 9. Purchase return — a wrong-size tyre batch returned to the
  //      distributor ──────────────────────────────────────────────────────
  console.log("  [9/21] Purchase return…");
  await suppliersReg.purchaseReturnService.savePurchaseReturn({
    supplierId: supplierIdByKey.get("S1"),
    returnDate: daysAgo(7),
    items: [{ productId: productIdBySku.get("AM-TYR-MRF10090"), quantityPieces: 10 }],
    note: "10 tyres returned — wrong size shipped by distributor",
  }, actor);

  // ── 10. HR: departments, designations, employees, salary payments ───────
  console.log("  [10/21] Departments, designations, employees, salary…");
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

  // ── 11. Open a retail cash session (showroom shift) before ringing up
  //       the cash sales below ────────────────────────────────────────────
  console.log("  [11/21] Opening retail cash session…");
  const { session: cashSession } = await operations.retailCashSessionService.startSession({
    openingCash: 20000,
    note: "Morning shift float",
  }, actor);

  // ── 12. Sales invoices — quick-sale, walk-in, registered w/ due,
  //       wholesale. Serial-tracked line items pull real IN_STOCK
  //       product_serials rows created by the purchase receipts above. ────
  console.log("  [12/21] Sales invoices (quick-sale, walk-in, registered, wholesale)…");

  async function availableSerialIds(sku, count) {
    const productId = productIdBySku.get(sku);
    const { serials } = await catalog.productSerialService.listAvailable(productId, actor);
    return serials.slice(0, count).map((serial) => serial.id);
  }

  // Walk-in quick-sale — parts & gear, fully paid in cash. Walk-in sales must
  // be fully paid, so paidAmount is deliberately set above the true total —
  // normalizeSalesInvoice clamps it down to the exact total automatically.
  const quickSaleInvoice = await operations.salesInvoiceService.saveSalesInvoice({
    customerType: "WALK_IN",
    saleType: "QUICK_SALE",
    invoiceDate: daysAgo(2),
    items: [
      { productId: productIdBySku.get("AM-GER-VEGACLIFF"), quantityPieces: 1, actualSalePrice: 2600 },
      { productId: productIdBySku.get("AM-PRT-YAMOIL1L"), quantityPieces: 2, actualSalePrice: 550 },
      { productId: productIdBySku.get("AM-GER-GLOVES"), quantityPieces: 1, actualSalePrice: 650 },
    ],
    discount: 100,
    paidAmount: 999999,
    paymentMethod: "CASH",
    note: "Walk-in counter sale — helmet, engine oil & gloves",
  }, actor);

  // Walk-in — one serial-tracked motorcycle, fully paid in cash.
  const shineSerialIds = await availableSerialIds("AM-BIKE-HCBSH", 1);
  const bikeSaleInvoice = await operations.salesInvoiceService.saveSalesInvoice({
    customerType: "WALK_IN",
    saleType: "RETAIL",
    invoiceDate: daysAgo(2),
    items: [
      { productId: productIdBySku.get("AM-BIKE-HCBSH"), quantityPieces: 1, actualSalePrice: 198000, serialIds: shineSerialIds },
    ],
    paidAmount: 999999,
    paymentMethod: "CASH",
    note: "Walk-in showroom sale — Honda CB Shine 125",
  }, actor);
  const soldShineSerial = bikeSaleInvoice.items[0].serials[0];

  // Registered customer — reconditioned car sale with a partial payment,
  // leaving a due balance on the customer's account.
  const axioSerialIds = await availableSerialIds("AM-CAR-TOYAXIOHYB", 1);
  await operations.salesInvoiceService.saveSalesInvoice({
    customerType: "REGISTERED",
    customerId: customerIdByName.get("Shirin Akter"),
    saleType: "RETAIL",
    invoiceDate: daysAgo(1),
    items: [
      { productId: productIdBySku.get("AM-CAR-TOYAXIOHYB"), quantityPieces: 1, actualSalePrice: 2380000, serialIds: axioSerialIds },
    ],
    paidAmount: 1500000,
    paymentMethod: "BANK",
    note: "Toyota Axio Hybrid — partial payment, balance on account",
  }, actor);

  // Wholesale bulk order to a registered fleet/workshop customer, fully paid.
  await operations.salesInvoiceService.saveSalesInvoice({
    customerType: "REGISTERED",
    customerId: customerIdByName.get("Delwar Hossain"),
    saleType: "WHOLESALE",
    invoiceDate: daysAgo(1),
    items: [
      { productId: productIdBySku.get("AM-TYR-MRF10090"), quantityPieces: 10, actualSalePrice: 2500 },
      { productId: productIdBySku.get("AM-BAT-RAHIM12V5"), quantityPieces: 10, actualSalePrice: 2100 },
    ],
    paidAmount: 999999,
    paymentMethod: "BANK",
    note: "Fleet workshop bulk order — tyres & batteries",
  }, actor);

  // ── 13. Close the retail cash session ────────────────────────────────────
  console.log("  [13/21] Closing retail cash session…");
  await operations.retailCashSessionService.stopSession(cashSession.id, {
    countedCash: 20000 + quickSaleInvoice.totalAmount + bikeSaleInvoice.totalAmount,
    note: "End of shift count",
  }, actor);

  // ── 14. Sales return — customer returns one item from the quick-sale
  //       invoice above ──────────────────────────────────────────────────
  console.log("  [14/21] Sales return…");
  const returnedItem = quickSaleInvoice.items.find((item) => item.productId === productIdBySku.get("AM-GER-GLOVES"));
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
    note: "Customer returned riding gloves — wrong size",
  }, actor);

  // ── 15. Quotation → convert to invoice ───────────────────────────────────
  console.log("  [15/21] Quotation (create + convert to invoice)…");
  const quotation = await operations.quotationService.createQuotation({
    customerId: customerIdByName.get("Tanvir Ahmed"),
    customerName: "Tanvir Ahmed",
    customerPhone: "01751-500015",
    quoteDate: daysAgo(3),
    validityDays: 7,
    items: [
      { productId: productIdBySku.get("AM-CYC-PHXRACER"), productName: "Phoenix Racer 700C (Road Bike)", quantity: 1, unitPrice: 22500 },
      { productName: "Bicycle Home Delivery Service", quantity: 1, unitPrice: 300 },
    ],
    notes: "Quote for road bike with home delivery, per customer's phone inquiry",
  }, actor);

  await operations.quotationService.convertToInvoice(quotation.id, {
    paymentMethod: "CASH",
    paidAmount: 22800,
    invoiceDate: daysAgo(2),
    note: "Converted from quotation — customer confirmed at showroom",
  }, actor);

  // ── 16. Trade-in — customer's old motorcycle credited toward a new
  //       (non-serial) accessory purchase, so the exchange never touches
  //       product_serials bookkeeping ─────────────────────────────────────
  console.log("  [16/21] Trade-in…");
  await customers.tradeInService.createTradeIn({
    customerName: "Rafiqul Islam",
    customerPhone: "01711-500011",
    tradeInDate: daysAgo(1),
    paymentMethod: "CASH",
    notes: "Customer traded in an old motorcycle toward a helmet and gear purchase",
    receivedItems: [{
      productName: "Honda CG 125 (Used, 2015 model, running condition)",
      serialNumber: "OLD-HCG125-55219",
      condition: "FAIR",
      quantity: 1,
      tradeInValue: 45000,
    }],
    soldItems: [{
      productId: productIdBySku.get("AM-GER-VEGACLIFF"),
      productName: "Vega Cliff Full Face Helmet",
      quantity: 1,
      unitPrice: 2600,
    }],
  }, actor);

  // ── 17. Installment plan — finance a motorcycle over 6 months, then
  //       collect the first scheduled payment ────────────────────────────
  console.log("  [17/21] Installment plan + payment collection…");
  const pulsarSerialIds = await availableSerialIds("AM-BIKE-BPNS160", 1);
  const { plan: installmentPlan } = await operations.installmentPlanService.createPlan({
    customerId: customerIdByName.get("Nasima Begum"),
    saleDate: daysAgo(5),
    items: [{ productId: productIdBySku.get("AM-BIKE-BPNS160"), quantityPieces: 1, actualSalePrice: 288000, serialIds: pulsarSerialIds }],
    discount: 0,
    downPayment: 88000,
    markupType: "PERCENT",
    markupValue: 8,
    numberOfMonths: 6,
    firstPaymentDate: daysFromNow(25),
    note: "Bajaj Pulsar NS160 financed over 6 months",
  }, actor);

  await operations.installmentPlanService.collectPayment({
    planId: installmentPlan.id,
    amount: installmentPlan.monthlyInstallmentAmount,
    paymentDate: daysAgo(0),
    paymentMethod: "CASH",
    note: "First installment collected in-store",
  }, actor);

  // ── 18. Repair job — walk-in customer bringing their own (non-store)
  //       motorcycle in for workshop service. technicianId is a users.id
  //       (a login account), not an HR employee id, so it's left
  //       unassigned here — this demo's HR employees aren't given login
  //       accounts. ────────────────────────────────────────────────────────
  console.log("  [18/21] Repair job…");
  await operations.repairJobService.createJob({
    customerName: "Tanvir Ahmed",
    customerPhone: "01751-500015",
    deviceName: "Yamaha FZS V3 (customer-owned)",
    problemDescription: "Engine overheating on long rides; clutch feels loose.",
    estimatedCost: 3500,
    laborCost: 1200,
    status: "IN_REPAIR",
    receivedDate: daysAgo(2),
    promisedDate: daysFromNow(3),
  }, actor);

  // ── 19. Warranty claim — against the Honda CB Shine sold in the walk-in
  //       cash sale above, using the exact chassis/engine serial that sale
  //       consumed ────────────────────────────────────────────────────────
  console.log("  [19/21] Warranty claim…");
  await operations.warrantyClaimService.createClaim({
    salesInvoiceId: bikeSaleInvoice.id,
    salesInvoiceItemId: bikeSaleInvoice.items[0].id,
    productId: productIdBySku.get("AM-BIKE-HCBSH"),
    productSerialId: soldShineSerial.productSerialId,
    problemNote: "Unusual engine noise on cold start within the first week of use.",
    receivedDate: daysAgo(0),
    status: "RECEIVED",
    supplierId: supplierIdByKey.get("S2"),
  }, actor);

  // ── 20. Expenses (+ one soft-deleted, to give the Trash page content) ───
  // expenseService only allows creating an expense dated today — unlike
  // every other flow above, there is no way to backdate one at creation.
  console.log("  [20/21] Expenses…");
  await operations.expenseService.saveExpense({ date: daysAgo(0), category: "Rent", amount: 65000, note: "Showroom monthly rent" }, actor);
  await operations.expenseService.saveExpense({ date: daysAgo(0), category: "Vehicle", amount: 8000, note: "Delivery & test-ride fuel" }, actor);
  await operations.expenseService.saveExpense({ date: daysAgo(0), category: "Load/Unload", amount: 5500, note: "Showroom unloading labour for new stock" }, actor);
  await operations.expenseService.saveExpense({ date: daysAgo(0), category: "Office", amount: 9500, note: "Electricity bill & stationery" }, actor);
  await operations.expenseService.saveExpense({ date: daysAgo(0), category: "Other", amount: 15000, note: "Facebook ads for showroom promotion" }, actor);

  const trashExpense = await operations.expenseService.saveExpense({ date: daysAgo(0), category: "Other", amount: 800, note: "Duplicate entry — to be removed" }, actor);
  await operations.expenseService.removeExpense(trashExpense.id, actor, "Entered twice by mistake");

  // ── 21. Extra users (Manager + Operator) ────────────────────────────────
  console.log("  [21/21] Extra users…");
  await platform.userService.createUser({
    name: "Rashedul Karim", email: "manager@automartbd.com", password: "Manager@1234", role: USER_ROLES.MANAGER, status: "active",
  }, actor);
  await platform.userService.createUser({
    name: "Sultana Razia", email: "operator@automartbd.com", password: "Operator@1234", role: USER_ROLES.OPERATOR, status: "active",
  }, actor);

  console.log("\n✓ AutoMart BD demo seed complete — every stock unit, chassis/engine serial, ledger");
  console.log("  balance and due amount above was produced by real service calls, not fabricated by direct SQL.\n");
  console.log(`  Tenant:      ${TENANT_NAME} (${tenantId})`);
  console.log(`  Categories:  ${CATEGORY_NAMES.length}`);
  console.log(`  Products:    ${PRODUCTS.length} (${PRODUCTS.filter((p) => p.serial).length} chassis/engine serial-tracked)`);
  console.log(`  Suppliers:   ${Object.keys(SUPPLIERS).length}`);
  console.log(`  Customers:   ${RETAIL_CUSTOMERS.length}`);
  console.log(`  Employees:   ${EMPLOYEES.length}`);
  console.log("\nLogin (Super Admin):");
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log("\nAlso created: manager@automartbd.com / Manager@1234, operator@automartbd.com / Operator@1234");
  console.log("(these two roles have no permissions granted yet — assign them from the Permissions page).");
  console.log("\nNote: permission cache refreshes at most every 60s — if you log in immediately");
  console.log("and see missing menus, wait a minute or restart the dev server.\n");

  await db.getPool().end();
}

main().catch((err) => {
  console.error("\n✗ Seed failed.\n", err);
  process.exit(1);
});
