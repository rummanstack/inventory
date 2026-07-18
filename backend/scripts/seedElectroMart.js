/**
 * ElectroMart demo seed — creates a single ready-to-demo electronics RETAIL
 * tenant (POS/quick-sale model) by driving the exact same service layer the
 * app itself uses for every transactional flow.
 *
 * Unlike a raw-SQL seed, nothing here fabricates a ledger balance, a stock
 * level, or a serial/IMEI record directly:
 *   - Products are created with zero stock — every unit of stock, and every
 *     product_serials row for a serial/IMEI-tracked item, arrives through a
 *     real purchase-receive call to a supplier.
 *   - Sales (quick-sale, retail, wholesale), the sales return, the quotation
 *     conversion, the trade-in, and the installment-plan sale all consume
 *     stock (and, for serial-tracked items, real product_serials rows) the
 *     same way the POS screen does — nothing is pre-computed and inserted.
 *   - Supplier due, customer due, installment schedules, repair jobs and the
 *     warranty claim are all produced as side effects of real service calls,
 *     exactly like a user clicking through the UI.
 *
 * Run (from backend/):
 *   node scripts/seedElectroMart.js
 *
 * Always targets the DEV database (forces npm_lifecycle_event='dev' before
 * config/env.js is loaded) — never touches production, regardless of how
 * it's invoked. NOT safe to run twice against the same database — it exits
 * early with a message if the tenant already exists (real service calls
 * enforce their own uniqueness rules, so partial-idempotency would be
 * misleading rather than helpful). If you need to re-seed, wipe the
 * tenant's data first.
 *
 * Login: admin@electromart.com / Electro@1234
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

const TENANT_NAME = "ElectroMart";
const TENANT_SLUG = "electromart";
const TENANT_ADDRESS = "Shop 42, Level 3, Bashundhara City Shopping Complex, Panthapath, Dhaka-1205";
const TENANT_PHONE = "01700-000000";
const ADMIN_EMAIL = "admin@electromart.com";
const ADMIN_PASSWORD = "Electro@1234";
const ADMIN_NAME = "Tanvir Ahmed (ElectroMart Admin)";

// Curated to match exactly the menu set confirmed for this retail persona —
// POS/quick-sale + sales invoices/returns + quotations + trade-ins +
// installment sales + warranty/repair + finance + HR, no DSR/dealer
// distribution surface and no accounting/voucher module.
const FEATURES = [
  "dashboard",
  "retailer-quick-sale", "retailer-cash-sessions", "quotations", "retailer-promotions", "trade-ins",
  "retailer-sales-invoices", "retailer-sales-return", "installment-sales",
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

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// Serial/IMEI strings for a purchase-receive line item — one per piece,
// unique tenant-wide because every SKU is unique.
function generateSerials(sku, qty) {
  const list = [];
  for (let i = 1; i <= qty; i += 1) {
    list.push(`${sku}-${String(i).padStart(4, "0")}`);
  }
  return list;
}

// ─── Categories ─────────────────────────────────────────────────────────────

const CATEGORY_NAMES = [
  "Mobile Phones", "Laptops & Computers", "Televisions", "Refrigerators",
  "Air Conditioners", "Washing Machines", "Audio & Speakers", "Cameras",
  "Kitchen Appliances", "Mobile & Computer Accessories",
];

// ─── Suppliers ──────────────────────────────────────────────────────────────
// Keyed S1..S6 so PRODUCTS below can reference them without repeating names.

const SUPPLIERS = {
  S1: { name: "Samsung Electronics BD Ltd", phone: "01811-000202", address: "Banani, Dhaka-1213" },
  S2: { name: "Walton Hi-Tech Industries Ltd", phone: "02-9861661", address: "Chandra, Kaliakoir, Gazipur" },
  S3: { name: "Xiaomi Bangladesh (Authorized Distributor)", phone: "01711-000505", address: "Bashundhara City, Panthapath, Dhaka-1205" },
  S4: { name: "Smart Technologies (BD) Ltd", phone: "02-8836801", address: "Kawran Bazar, Dhaka-1215" },
  S5: { name: "Global Brand Pvt Ltd (Apple/Sony Distributor)", phone: "01911-000707", address: "Gulshan-2, Dhaka-1212" },
  S6: { name: "Fair Electronics Ltd", phone: "01611-000808", address: "Elephant Road, Dhaka-1205" },
};

// ─── Products ───────────────────────────────────────────────────────────────
// qty = how many pieces will be purchased from `sup` to bring in opening
// stock (there is no other way for stock, or product_serials rows for
// serial-tracked items, to appear — see header comment).

const PRODUCTS = [
  // ── Mobile Phones (serial/IMEI tracked) ──────────────────────────────────
  { cat: "Mobile Phones", name: "Samsung Galaxy A16 5G (128GB)", brand: "Samsung", model: "SM-A166", sku: "EM-MOB-SGA16", ppc: 1, pp: 15500, wp: 16800, rp: 18500, qty: 25, serial: true, warranty: 12, reorder: 10, desc: "6.7-inch Super AMOLED, 5000mAh battery, 5G, 128GB storage.", sup: "S1" },
  { cat: "Mobile Phones", name: "Samsung Galaxy A55 5G (256GB)", brand: "Samsung", model: "SM-A556", sku: "EM-MOB-SGA55", ppc: 1, pp: 34000, wp: 37000, rp: 41500, qty: 15, serial: true, warranty: 12, reorder: 10, desc: "Flagship mid-ranger with Gorilla Glass Victus+ and 50MP OIS camera.", sup: "S1" },
  { cat: "Mobile Phones", name: "Samsung Galaxy S24 FE (256GB)", brand: "Samsung", model: "SM-S721", sku: "EM-MOB-SGS24FE", ppc: 1, pp: 58000, wp: 62000, rp: 69900, qty: 8, serial: true, warranty: 12, reorder: 10, desc: "Flagship-grade camera and performance in a compact body.", sup: "S1" },
  { cat: "Mobile Phones", name: "Xiaomi Redmi 13C (128GB)", brand: "Xiaomi", model: "23106RN0DI", sku: "EM-MOB-RD13C", ppc: 1, pp: 11500, wp: 12500, rp: 13990, qty: 30, serial: true, warranty: 12, reorder: 10, desc: "Budget-friendly 90Hz display with 50MP AI triple camera.", sup: "S3" },
  { cat: "Mobile Phones", name: "Xiaomi Redmi Note 13 Pro (256GB)", brand: "Xiaomi", model: "23090RA98I", sku: "EM-MOB-RN13PRO", ppc: 1, pp: 24500, wp: 26500, rp: 29900, qty: 18, serial: true, warranty: 12, reorder: 10, desc: "200MP OIS camera with curved AMOLED display.", sup: "S3" },
  { cat: "Mobile Phones", name: "Poco X6 Pro (256GB)", brand: "Poco", model: "23122PCD1I", sku: "EM-MOB-POCOX6P", ppc: 1, pp: 28000, wp: 30500, rp: 33900, qty: 12, serial: true, warranty: 12, reorder: 10, desc: "Dimensity 8300-Ultra flagship chipset with 120W fast charging.", sup: "S3" },
  { cat: "Mobile Phones", name: "realme C67 (256GB)", brand: "realme", model: "RMX3890", sku: "EM-MOB-RC67", ppc: 1, pp: 16500, wp: 17800, rp: 19990, qty: 22, serial: true, warranty: 12, reorder: 10, desc: "108MP camera with slim design and 33W SUPERVOOC charging.", sup: "S6" },
  { cat: "Mobile Phones", name: "realme 12 Pro+ (256GB)", brand: "realme", model: "RMX3840", sku: "EM-MOB-R12PROPLUS", ppc: 1, pp: 33000, wp: 35800, rp: 39900, qty: 10, serial: true, warranty: 12, reorder: 10, desc: "Periscope telephoto camera with 3x optical zoom.", sup: "S6" },
  { cat: "Mobile Phones", name: "vivo Y28 (128GB)", brand: "vivo", model: "V2318", sku: "EM-MOB-VY28", ppc: 1, pp: 15800, wp: 17000, rp: 18990, qty: 20, serial: true, warranty: 12, reorder: 10, desc: "IP64 rated with 44W FlashCharge and 6000mAh battery.", sup: "S6" },
  { cat: "Mobile Phones", name: "Apple iPhone 15 (128GB)", brand: "Apple", model: "A3092", sku: "EM-MOB-IP15", ppc: 1, pp: 92000, wp: 96000, rp: 104900, qty: 6, serial: true, warranty: 12, reorder: 10, desc: "A16 Bionic chip, Dynamic Island, USB-C, 48MP main camera.", sup: "S5" },

  // ── Laptops & Computers (serial tracked) ─────────────────────────────────
  { cat: "Laptops & Computers", name: "HP 15 Laptop (i3 13th Gen, 8GB/512GB)", brand: "HP", model: "15-fd0xxx", sku: "EM-LAP-HP15I3", ppc: 1, pp: 48000, wp: 51000, rp: 56900, qty: 10, serial: true, warranty: 24, reorder: 6, desc: "Everyday laptop with 15.6-inch FHD display and fast SSD.", sup: "S4" },
  { cat: "Laptops & Computers", name: "HP Pavilion 14 (i5 13th Gen, 16GB/512GB)", brand: "HP", model: "14-ec0xxx", sku: "EM-LAP-HPPAV14", ppc: 1, pp: 68000, wp: 72000, rp: 79900, qty: 6, serial: true, warranty: 24, reorder: 6, desc: "Slim aluminum body with backlit keyboard and B&O audio.", sup: "S4" },
  { cat: "Laptops & Computers", name: "Dell Inspiron 15 3520 (i5, 8GB/512GB)", brand: "Dell", model: "3520", sku: "EM-LAP-DELL3520", ppc: 1, pp: 55000, wp: 58500, rp: 64900, qty: 8, serial: true, warranty: 24, reorder: 6, desc: "Reliable everyday performance with 12th Gen Intel Core i5.", sup: "S4" },
  { cat: "Laptops & Computers", name: "Lenovo IdeaPad Slim 3 (Ryzen 5, 8GB/512GB)", brand: "Lenovo", model: "15ABR8", sku: "EM-LAP-LNVIP3", ppc: 1, pp: 52000, wp: 55500, rp: 61900, qty: 9, serial: true, warranty: 24, reorder: 6, desc: "AMD Ryzen 5 performance with all-day battery life.", sup: "S4" },
  { cat: "Laptops & Computers", name: "Lenovo ThinkPad E14 (i5, 16GB/512GB)", brand: "Lenovo", model: "Gen 5", sku: "EM-LAP-TPE14", ppc: 1, pp: 78000, wp: 82500, rp: 91900, qty: 5, serial: true, warranty: 24, reorder: 6, desc: "Business-grade durability with military-spec testing.", sup: "S4" },
  { cat: "Laptops & Computers", name: "ASUS Vivobook 15 (i3, 8GB/512GB)", brand: "ASUS", model: "X1502ZA", sku: "EM-LAP-ASVB15", ppc: 1, pp: 46500, wp: 49500, rp: 54900, qty: 12, serial: true, warranty: 24, reorder: 6, desc: "Lightweight design with vivid NanoEdge FHD display.", sup: "S4" },
  { cat: "Laptops & Computers", name: "ASUS TUF Gaming F15 (i5, RTX 3050, 16GB/512GB)", brand: "ASUS", model: "FX507ZC4", sku: "EM-LAP-TUFF15", ppc: 1, pp: 98000, wp: 103000, rp: 114900, qty: 4, serial: true, warranty: 24, reorder: 6, desc: "144Hz display with military-grade durability for gaming.", sup: "S4" },
  { cat: "Laptops & Computers", name: "Walton Tamarind BX350 (i5, 8GB/512GB)", brand: "Walton", model: "BX350", sku: "EM-LAP-WALTBX350", ppc: 1, pp: 42000, wp: 45000, rp: 49900, qty: 10, serial: true, warranty: 24, reorder: 6, desc: "Locally assembled laptop with solid build and value pricing.", sup: "S2" },

  // ── Televisions ───────────────────────────────────────────────────────────
  { cat: "Televisions", name: "Walton 32\" HD LED TV (W32E200S)", brand: "Walton", model: "W32E200S", sku: "EM-TV-WLT32", ppc: 1, pp: 13500, wp: 15200, rp: 16990, qty: 20, serial: false, warranty: 12, reorder: 8, desc: "32-inch HD LED TV with HDMI & USB input.", sup: "S2" },
  { cat: "Televisions", name: "Walton 43\" 4K Smart TV (W43E400S)", brand: "Walton", model: "W43E400S", sku: "EM-TV-WLT43", ppc: 1, pp: 22000, wp: 24500, rp: 27990, qty: 14, serial: false, warranty: 12, reorder: 8, desc: "43-inch 4K UHD smart Android TV.", sup: "S2" },
  { cat: "Televisions", name: "Walton 55\" 4K Smart TV (W55D500S)", brand: "Walton", model: "W55D500S", sku: "EM-TV-WLT55", ppc: 1, pp: 34500, wp: 38000, rp: 42990, qty: 8, serial: false, warranty: 12, reorder: 8, desc: "55-inch 4K UHD smart TV with Dolby Audio.", sup: "S2" },
  { cat: "Televisions", name: "Samsung 43\" Crystal UHD 4K Smart TV", brand: "Samsung", model: "UA43CU7700", sku: "EM-TV-SAM43", ppc: 1, pp: 32000, wp: 35500, rp: 39900, qty: 10, serial: false, warranty: 12, reorder: 8, desc: "Crystal processor 4K with vibrant color and Tizen OS.", sup: "S1" },
  { cat: "Televisions", name: "Samsung 50\" QLED 4K Smart TV", brand: "Samsung", model: "QA50Q60C", sku: "EM-TV-SAM50Q", ppc: 1, pp: 58000, wp: 63000, rp: 69900, qty: 5, serial: false, warranty: 12, reorder: 5, desc: "Quantum Dot technology with 100% color volume.", sup: "S1" },
  { cat: "Televisions", name: "Sony Bravia 43\" X75L 4K Google TV", brand: "Sony", model: "KD-43X75L", sku: "EM-TV-SONY43", ppc: 1, pp: 42000, wp: 46000, rp: 51900, qty: 6, serial: false, warranty: 12, reorder: 8, desc: "4K HDR processor X1 with Google TV smart platform.", sup: "S5" },
  { cat: "Televisions", name: "LG 43\" UQ7500 4K Smart TV", brand: "LG", model: "43UQ7500", sku: "EM-TV-LG43", ppc: 1, pp: 39500, wp: 43000, rp: 47900, qty: 7, serial: false, warranty: 12, reorder: 8, desc: "Alpha5 AI processor 4K with webOS smart platform.", sup: "S4" },

  // ── Refrigerators ─────────────────────────────────────────────────────────
  { cat: "Refrigerators", name: "Walton 200L Direct Cool Refrigerator", brand: "Walton", model: "WFA-2B0-GDXX-XX", sku: "EM-FRD-WLT200", ppc: 1, pp: 17500, wp: 20000, rp: 22990, qty: 10, serial: false, warranty: 36, reorder: 5, desc: "200-litre direct cool single-door refrigerator.", sup: "S2" },
  { cat: "Refrigerators", name: "Walton 300L Frost-Free Refrigerator", brand: "Walton", model: "WFC-3D8-GDEH-DD", sku: "EM-FRD-WLT300", ppc: 1, pp: 26000, wp: 29500, rp: 33990, qty: 7, serial: false, warranty: 36, reorder: 5, desc: "300-litre no-frost double-door refrigerator with inverter compressor.", sup: "S2" },
  { cat: "Refrigerators", name: "Samsung 253L Digital Inverter Refrigerator", brand: "Samsung", model: "RT25FARZDSA", sku: "EM-FRD-SAM253", ppc: 1, pp: 32000, wp: 36000, rp: 40900, qty: 6, serial: false, warranty: 36, reorder: 5, desc: "Digital inverter compressor with all-around cooling.", sup: "S1" },
  { cat: "Refrigerators", name: "LG 260L Smart Inverter Refrigerator", brand: "LG", model: "GN-B262SQCL", sku: "EM-FRD-LG260", ppc: 1, pp: 33500, wp: 37500, rp: 42900, qty: 5, serial: false, warranty: 36, reorder: 5, desc: "Smart inverter compressor with multi-air flow cooling.", sup: "S4" },
  { cat: "Refrigerators", name: "Jamuna 195L Direct Cool Refrigerator", brand: "Jamuna", model: "JE-1F5-GNW-CD", sku: "EM-FRD-JAM195", ppc: 1, pp: 15000, wp: 17200, rp: 19990, qty: 12, serial: false, warranty: 24, reorder: 5, desc: "Compact single-door refrigerator, ideal for small families.", sup: "S6" },

  // ── Air Conditioners (serial tracked) ────────────────────────────────────
  { cat: "Air Conditioners", name: "Walton 1 Ton Inverter Split AC", brand: "Walton", model: "WSI-INVERNA-12C", sku: "EM-AC-WLT1T", ppc: 1, pp: 33000, wp: 37000, rp: 41900, qty: 10, serial: true, warranty: 36, reorder: 5, desc: "1-ton split inverter AC, energy-saving grade A.", sup: "S2" },
  { cat: "Air Conditioners", name: "Walton 1.5 Ton Inverter Split AC", brand: "Walton", model: "WSI-INVERNA-18C", sku: "EM-AC-WLT15T", ppc: 1, pp: 41000, wp: 46000, rp: 51900, qty: 8, serial: true, warranty: 36, reorder: 5, desc: "1.5-ton split inverter AC with auto-clean function.", sup: "S2" },
  { cat: "Air Conditioners", name: "General 1.5 Ton Inverter Split AC", brand: "General", model: "ASGA18FMTA", sku: "EM-AC-GEN15T", ppc: 1, pp: 52000, wp: 57500, rp: 64900, qty: 6, serial: true, warranty: 36, reorder: 5, desc: "Premium Japanese inverter technology, whisper-quiet operation.", sup: "S4" },
  { cat: "Air Conditioners", name: "Gree 1 Ton Inverter Split AC", brand: "Gree", model: "GS-12FITH1S", sku: "EM-AC-GREE1T", ppc: 1, pp: 36000, wp: 40500, rp: 45900, qty: 7, serial: true, warranty: 36, reorder: 5, desc: "Fairy series inverter AC with 3D airflow.", sup: "S4" },
  { cat: "Air Conditioners", name: "Midea 2 Ton Inverter Split AC", brand: "Midea", model: "MSM-24CRN1", sku: "EM-AC-MID2T", ppc: 1, pp: 58000, wp: 64000, rp: 71900, qty: 4, serial: true, warranty: 36, reorder: 5, desc: "High-capacity inverter AC ideal for large rooms and offices.", sup: "S4" },
  { cat: "Air Conditioners", name: "Haier 1.5 Ton Inverter Split AC", brand: "Haier", model: "HSU-18TFF", sku: "EM-AC-HAI15T", ppc: 1, pp: 44000, wp: 49000, rp: 54900, qty: 5, serial: true, warranty: 36, reorder: 5, desc: "Self-clean inverter AC with dual-motor turbo cooling.", sup: "S4" },

  // ── Washing Machines ──────────────────────────────────────────────────────
  { cat: "Washing Machines", name: "Walton 7kg Top Load Fully Automatic", brand: "Walton", model: "WWM-72S", sku: "EM-WASH-WLT7K", ppc: 1, pp: 19500, wp: 22000, rp: 24990, qty: 8, serial: false, warranty: 24, reorder: 5, desc: "7kg top-load fully automatic washing machine.", sup: "S2" },
  { cat: "Washing Machines", name: "Walton 8kg Front Load Inverter Washing Machine", brand: "Walton", model: "WFM-Q80T", sku: "EM-WASH-WLT8K", ppc: 1, pp: 29500, wp: 33000, rp: 37900, qty: 5, serial: false, warranty: 24, reorder: 5, desc: "8kg front-load inverter washing machine with steam wash.", sup: "S2" },
  { cat: "Washing Machines", name: "Whirlpool 7kg Top Load Washing Machine", brand: "Whirlpool", model: "WM STAINWASH", sku: "EM-WASH-WHR7K", ppc: 1, pp: 24000, wp: 27000, rp: 30900, qty: 6, serial: false, warranty: 24, reorder: 5, desc: "6th Sense technology with hard water wash cycle.", sup: "S4" },
  { cat: "Washing Machines", name: "Samsung 8kg Front Load Inverter Washing Machine", brand: "Samsung", model: "WW80T4020CE", sku: "EM-WASH-SAM8K", ppc: 1, pp: 42000, wp: 46500, rp: 51900, qty: 4, serial: false, warranty: 24, reorder: 5, desc: "Digital inverter motor with Eco Bubble technology.", sup: "S1" },

  // ── Audio & Speakers ──────────────────────────────────────────────────────
  { cat: "Audio & Speakers", name: "JBL Flip 6 Portable Bluetooth Speaker", brand: "JBL", model: "Flip 6", sku: "EM-AUD-JBLFLIP6", ppc: 1, pp: 9500, wp: 10800, rp: 12500, qty: 20, serial: false, warranty: 12, reorder: 8, desc: "IP67 waterproof portable speaker with punchy JBL Pro Sound.", sup: "S4" },
  { cat: "Audio & Speakers", name: "JBL Charge 5 Portable Bluetooth Speaker", brand: "JBL", model: "Charge 5", sku: "EM-AUD-JBLCHRG5", ppc: 1, pp: 13500, wp: 15200, rp: 17500, qty: 15, serial: false, warranty: 12, reorder: 8, desc: "Powerful sound with 20-hour playtime and powerbank function.", sup: "S4" },
  { cat: "Audio & Speakers", name: "Walton Soundbar WSB-200", brand: "Walton", model: "WSB-200", sku: "EM-AUD-WLTSB200", ppc: 1, pp: 6500, wp: 7500, rp: 8990, qty: 12, serial: false, warranty: 12, reorder: 5, desc: "Compact soundbar with deep bass for home entertainment.", sup: "S2" },
  { cat: "Audio & Speakers", name: "Sony Home Theater Soundbar HT-S20R", brand: "Sony", model: "HT-S20R", sku: "EM-AUD-SONYS20R", ppc: 1, pp: 16500, wp: 18500, rp: 20900, qty: 8, serial: false, warranty: 12, reorder: 5, desc: "Real 5.1ch surround sound with wireless rear speakers.", sup: "S5" },
  { cat: "Audio & Speakers", name: "JBL Tune 510BT Wireless Headphones", brand: "JBL", model: "Tune 510BT", sku: "EM-AUD-JBLT510", ppc: 1, pp: 3200, wp: 3800, rp: 4500, qty: 35, serial: false, warranty: 12, reorder: 10, desc: "On-ear wireless headphones with 40 hours of battery life.", sup: "S4" },
  { cat: "Audio & Speakers", name: "boAt Rockerz 450 Wireless Headphones", brand: "boAt", model: "Rockerz 450", sku: "EM-AUD-BOATRK450", ppc: 1, pp: 2100, wp: 2500, rp: 2990, qty: 40, serial: false, warranty: 6, reorder: 10, desc: "40mm dynamic drivers with padded ear cushions for comfort.", sup: "S6" },

  // ── Cameras (serial tracked) ──────────────────────────────────────────────
  { cat: "Cameras", name: "Canon EOS 1500D DSLR (18-55mm Kit)", brand: "Canon", model: "EOS 1500D", sku: "EM-CAM-CAN1500D", ppc: 1, pp: 42000, wp: 46500, rp: 51900, qty: 5, serial: true, warranty: 24, reorder: 4, desc: "24.1MP APS-C sensor with beginner-friendly guided controls.", sup: "S4" },
  { cat: "Cameras", name: "Canon EOS M50 Mark II Mirrorless Camera", brand: "Canon", model: "EOS M50 Mark II", sku: "EM-CAM-CANM50M2", ppc: 1, pp: 68000, wp: 74000, rp: 82900, qty: 3, serial: true, warranty: 24, reorder: 4, desc: "Compact mirrorless with 4K video and vari-angle touchscreen.", sup: "S4" },
  { cat: "Cameras", name: "GoPro Hero 12 Action Camera", brand: "GoPro", model: "Hero 12 Black", sku: "EM-CAM-GOPRO12", ppc: 1, pp: 38000, wp: 42000, rp: 46900, qty: 6, serial: true, warranty: 12, reorder: 4, desc: "5.3K60 video with HyperSmooth 6.0 stabilization.", sup: "S4" },
  { cat: "Cameras", name: "Xiaomi 360° Home Security Camera", brand: "Xiaomi", model: "C500 Pro", sku: "EM-CAM-XIAOC500", ppc: 1, pp: 2800, wp: 3300, rp: 3990, qty: 25, serial: true, warranty: 12, reorder: 8, desc: "2K resolution with AI human detection and night vision.", sup: "S3" },

  // ── Kitchen Appliances ────────────────────────────────────────────────────
  { cat: "Kitchen Appliances", name: "Walton Microwave Oven 20L (Solo)", brand: "Walton", model: "WMWO-SL20", sku: "EM-KIT-WLTMW20", ppc: 1, pp: 7500, wp: 8500, rp: 9990, qty: 15, serial: false, warranty: 12, reorder: 6, desc: "20-litre solo microwave oven with 5 power levels.", sup: "S2" },
  { cat: "Kitchen Appliances", name: "Walton Microwave Oven 25L (Grill)", brand: "Walton", model: "WMWO-GR25", sku: "EM-KIT-WLTMW25", ppc: 1, pp: 10500, wp: 11800, rp: 13500, qty: 10, serial: false, warranty: 12, reorder: 6, desc: "25-litre grill microwave with auto-cook menus.", sup: "S2" },
  { cat: "Kitchen Appliances", name: "Miyako Blender & Juicer 1.5L", brand: "Miyako", model: "BL-102", sku: "EM-KIT-MIYBL102", ppc: 1, pp: 1800, wp: 2100, rp: 2500, qty: 30, serial: false, warranty: 12, reorder: 10, desc: "Multi-function blender with stainless steel blades.", sup: "S6" },
  { cat: "Kitchen Appliances", name: "Kiam Rice Cooker 1.8L", brand: "Kiam", model: "RC-18", sku: "EM-KIT-KIAMRC18", ppc: 1, pp: 1600, wp: 1900, rp: 2300, qty: 28, serial: false, warranty: 12, reorder: 10, desc: "Non-stick inner pot with keep-warm function.", sup: "S6" },
  { cat: "Kitchen Appliances", name: "Philips Electric Kettle 1.7L", brand: "Philips", model: "HD9350", sku: "EM-KIT-PHIKT17", ppc: 1, pp: 1900, wp: 2200, rp: 2650, qty: 25, serial: false, warranty: 12, reorder: 10, desc: "Rapid boil with auto shut-off and concealed heating element.", sup: "S5" },
  { cat: "Kitchen Appliances", name: "Walton Induction Cooker 2000W", brand: "Walton", model: "WIC-N20", sku: "EM-KIT-WLTIC20", ppc: 1, pp: 3200, wp: 3700, rp: 4400, qty: 18, serial: false, warranty: 12, reorder: 8, desc: "2000W induction cooktop with 8 preset cooking functions.", sup: "S2" },

  // ── Mobile & Computer Accessories ─────────────────────────────────────────
  { cat: "Mobile & Computer Accessories", name: "Anker 20W USB-C Fast Charger", brand: "Anker", model: "A2633", sku: "EM-ACC-ANK20W", ppc: 1, pp: 850, wp: 1000, rp: 1250, qty: 60, serial: false, warranty: 12, reorder: 15, desc: "Compact PowerIQ fast charger, compatible with most phones.", sup: "S6" },
  { cat: "Mobile & Computer Accessories", name: "Anker PowerCore 10000mAh Power Bank", brand: "Anker", model: "A1263", sku: "EM-ACC-ANKPC10K", ppc: 1, pp: 1800, wp: 2100, rp: 2550, qty: 40, serial: false, warranty: 12, reorder: 12, desc: "Slim high-capacity power bank with fast-charging output.", sup: "S6" },
  { cat: "Mobile & Computer Accessories", name: "Remax Type-C Data Cable 1m", brand: "Remax", model: "RC-171a", sku: "EM-ACC-RMXTC1M", ppc: 1, pp: 180, wp: 220, rp: 290, qty: 100, serial: false, warranty: 6, reorder: 25, desc: "Durable braided USB-C charging and data cable.", sup: "S6" },
  { cat: "Mobile & Computer Accessories", name: "Logitech M185 Wireless Mouse", brand: "Logitech", model: "M185", sku: "EM-ACC-LOGM185", ppc: 1, pp: 950, wp: 1100, rp: 1350, qty: 35, serial: false, warranty: 12, reorder: 12, desc: "Reliable 2.4GHz wireless mouse with long battery life.", sup: "S4" },
  { cat: "Mobile & Computer Accessories", name: "A4Tech Wired Keyboard KR-83", brand: "A4Tech", model: "KR-83", sku: "EM-ACC-A4TKR83", ppc: 1, pp: 550, wp: 650, rp: 800, qty: 30, serial: false, warranty: 12, reorder: 10, desc: "Spill-resistant wired keyboard for everyday typing.", sup: "S4" },
  { cat: "Mobile & Computer Accessories", name: "Tempered Glass Screen Protector (Universal)", brand: "Generic", model: "9H-UNI", sku: "EM-ACC-TGUNI", ppc: 1, pp: 60, wp: 90, rp: 150, qty: 150, serial: false, warranty: 0, reorder: 30, desc: "9H hardness tempered glass, anti-scratch and anti-fingerprint.", sup: "S6" },
];

// ─── Retail customers ───────────────────────────────────────────────────────

const RETAIL_CUSTOMERS = [
  { name: "Mahmudul Hasan", phone: "01711-500001", address: "House 12, Road 5, Dhanmondi, Dhaka", note: "Prefers EMI on mobile purchases" },
  { name: "Farzana Akter", phone: "01811-500002", address: "Flat 4B, Bashundhara R/A, Dhaka", note: "" },
  { name: "Shariful Islam", phone: "01911-500003", address: "Uttara Sector-7, Dhaka", note: "Regular corporate bulk buyer" },
  { name: "Nusrat Jahan", phone: "01611-500004", address: "Mirpur-10, Dhaka", note: "" },
  { name: "Kamrul Hasan", phone: "01751-500005", address: "Khilgaon, Dhaka", note: "Loyalty program member" },
];

// ─── HR ─────────────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  { name: "Sales & Retail", code: "SLR" },
  { name: "Service & Repair", code: "SVR" },
  { name: "Accounts & Finance", code: "ACF" },
];

const DESIGNATIONS = [
  { name: "Sales Executive", code: "SLEXEC" },
  { name: "Repair Technician", code: "RPRTECH" },
  { name: "Accounts Officer", code: "ACOFF" },
];

const EMPLOYEES = [
  { name: "Rakibul Hasan", phone: "01777-800001", department: 0, designation: 0, salaryAmount: 22000 },
  { name: "Sabbir Ahmed", phone: "01777-800002", department: 1, designation: 1, salaryAmount: 26000 },
  { name: "Nasrin Sultana", phone: "01777-800003", department: 2, designation: 2, salaryAmount: 24000 },
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

  console.log(`\nSeeding ElectroMart demo into ${env.DATABASE_LABEL} database via the real service layer…\n`);

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
      businessType: BUSINESS_TYPES.ELECTRONICS,
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
  //      before anything spends or receives it. ──────────────────────────
  console.log("  [6/21] Owner's capital injection…");
  await finance.financeAccountService.recordTransaction({
    accountType: "CASH", type: "DEPOSIT", amount: 6000000, date: daysAgo(10),
    note: "Owner's capital injection — opening cash balance",
  }, actor);
  await finance.financeAccountService.recordTransaction({
    accountType: "BANK", type: "DEPOSIT", amount: 3000000, date: daysAgo(10),
    note: "Owner's capital injection — opening bank balance",
  }, actor);

  // ── 7. Purchase receipts — one per supplier, bringing every product's
  //      stock (and, for serial/IMEI-tracked products, real product_serials
  //      rows) in for real — this is the ONLY place stock_pieces moves off
  //      zero. ─────────────────────────────────────────────────────────────
  console.log("  [7/21] Purchase receipts (stock & serials arrive here, per supplier)…");
  const productsBySupplierKey = new Map();
  for (const p of PRODUCTS) {
    const list = productsBySupplierKey.get(p.sup) || [];
    list.push(p);
    productsBySupplierKey.set(p.sup, list);
  }

  const paymentMethodByKey = { S1: "BANK", S2: "CASH", S3: "BANK", S4: "CASH", S5: "BANK", S6: "CASH" };
  let purchaseInvoiceCounter = 5000;

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
    supplierId: supplierIdByKey.get("S2"),
    paymentDate: daysAgo(7),
    amount: 80000,
    paymentMethod: "CASH",
    note: "Additional payment towards Walton Hi-Tech Industries outstanding due",
  }, actor);

  // ── 9. Purchase return — a small wrong-batch return against the Fair
  //      Electronics purchase ─────────────────────────────────────────────
  console.log("  [9/21] Purchase return…");
  await suppliersReg.purchaseReturnService.savePurchaseReturn({
    supplierId: supplierIdByKey.get("S6"),
    returnDate: daysAgo(7),
    items: [{ productId: productIdBySku.get("EM-ACC-TGUNI"), quantityPieces: 20 }],
    note: "20 tempered glass screen protectors returned — wrong batch shipped",
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

  const employeeIds = [];
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
    employeeIds.push(employee.id);

    await hr.salaryPaymentService.recordPayment({
      employeeId: employee.id,
      amount: e.salaryAmount,
      paymentMethod: "CASH",
      paymentDate: daysAgo(0),
      note: `Salary for ${daysAgo(0).slice(0, 7)}`,
    }, actor);
  }

  // ── 11. Open a retail cash session (POS shift) before ringing up the
  //       cash sales below ────────────────────────────────────────────────
  console.log("  [11/21] Opening retail cash session…");
  const { session: cashSession } = await operations.retailCashSessionService.startSession({
    openingCash: 10000,
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

  // Walk-in quick-sale — accessories, fully paid in cash. Walk-in sales must
  // be fully paid, so paidAmount is deliberately set above the true total —
  // normalizeSalesInvoice clamps it down to the exact total automatically.
  const quickSaleInvoice = await operations.salesInvoiceService.saveSalesInvoice({
    customerType: "WALK_IN",
    saleType: "QUICK_SALE",
    invoiceDate: daysAgo(2),
    items: [
      { productId: productIdBySku.get("EM-ACC-ANK20W"), quantityPieces: 2, actualSalePrice: 1250 },
      { productId: productIdBySku.get("EM-ACC-TGUNI"), quantityPieces: 3, actualSalePrice: 150 },
      { productId: productIdBySku.get("EM-ACC-RMXTC1M"), quantityPieces: 2, actualSalePrice: 290 },
    ],
    discount: 50,
    paidAmount: 999999,
    paymentMethod: "CASH",
    note: "Walk-in counter sale — accessories",
  }, actor);

  // Walk-in — one serial-tracked phone, fully paid in cash.
  const a16SerialIds = await availableSerialIds("EM-MOB-SGA16", 1);
  const phoneSaleInvoice = await operations.salesInvoiceService.saveSalesInvoice({
    customerType: "WALK_IN",
    saleType: "RETAIL",
    invoiceDate: daysAgo(2),
    items: [
      { productId: productIdBySku.get("EM-MOB-SGA16"), quantityPieces: 1, actualSalePrice: 18500, serialIds: a16SerialIds },
    ],
    paidAmount: 999999,
    paymentMethod: "CASH",
    note: "Walk-in counter sale — Samsung Galaxy A16 5G",
  }, actor);
  const soldA16Serial = phoneSaleInvoice.items[0].serials[0];

  // Registered customer — TV sale with a partial payment, leaving a due
  // balance on the customer's account.
  await operations.salesInvoiceService.saveSalesInvoice({
    customerType: "REGISTERED",
    customerId: customerIdByName.get("Farzana Akter"),
    saleType: "RETAIL",
    invoiceDate: daysAgo(1),
    items: [
      { productId: productIdBySku.get("EM-TV-WLT43"), quantityPieces: 1, actualSalePrice: 27990 },
    ],
    paidAmount: 15000,
    paymentMethod: "BANK",
    note: "43-inch Smart TV — partial payment, balance on account",
  }, actor);

  // Wholesale bulk order to a registered corporate customer, fully paid.
  await operations.salesInvoiceService.saveSalesInvoice({
    customerType: "REGISTERED",
    customerId: customerIdByName.get("Shariful Islam"),
    saleType: "WHOLESALE",
    invoiceDate: daysAgo(1),
    items: [
      { productId: productIdBySku.get("EM-AUD-JBLT510"), quantityPieces: 10, actualSalePrice: 3800 },
      { productId: productIdBySku.get("EM-ACC-ANKPC10K"), quantityPieces: 10, actualSalePrice: 2100 },
    ],
    paidAmount: 999999,
    paymentMethod: "BANK",
    note: "Corporate bulk order — office giveaways",
  }, actor);

  // ── 13. Close the retail cash session ────────────────────────────────────
  console.log("  [13/21] Closing retail cash session…");
  await operations.retailCashSessionService.stopSession(cashSession.id, {
    countedCash: 10000 + quickSaleInvoice.totalAmount + phoneSaleInvoice.totalAmount,
    note: "End of shift count",
  }, actor);

  // ── 14. Sales return — customer returns one accessory from the quick-sale
  //       invoice above ──────────────────────────────────────────────────
  console.log("  [14/21] Sales return…");
  const returnedItem = quickSaleInvoice.items.find((item) => item.productId === productIdBySku.get("EM-ACC-TGUNI"));
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
    note: "Customer returned 1 screen protector — wrong size for their phone model",
  }, actor);

  // ── 15. Quotation → convert to invoice ───────────────────────────────────
  console.log("  [15/21] Quotation (create + convert to invoice)…");
  const quotation = await operations.quotationService.createQuotation({
    customerId: customerIdByName.get("Kamrul Hasan"),
    customerName: "Kamrul Hasan",
    customerPhone: "01751-500005",
    quoteDate: daysAgo(3),
    validityDays: 7,
    items: [
      { productId: productIdBySku.get("EM-KIT-WLTMW20"), productName: "Walton Microwave Oven 20L (Solo)", quantity: 1, unitPrice: 9990 },
      { productId: productIdBySku.get("EM-KIT-MIYBL102"), productName: "Miyako Blender & Juicer 1.5L", quantity: 1, unitPrice: 2500 },
    ],
    notes: "Quote for microwave oven + blender, per customer's phone inquiry",
  }, actor);

  await operations.quotationService.convertToInvoice(quotation.id, {
    paymentMethod: "CASH",
    paidAmount: 12490,
    invoiceDate: daysAgo(2),
    note: "Converted from quotation — customer confirmed at store",
  }, actor);

  // ── 16. Trade-in — old device credited toward a new (non-serial) product
  //       so the exchange never touches product_serials bookkeeping ───────
  console.log("  [16/21] Trade-in…");
  await customers.tradeInService.createTradeIn({
    customerName: "Mahmudul Hasan",
    customerPhone: "01711-500001",
    tradeInDate: daysAgo(1),
    paymentMethod: "CASH",
    notes: "Customer traded in an old phone toward a new speaker purchase",
    receivedItems: [{
      productName: "Samsung Galaxy J7 (Used, 2019 model, screen scratches)",
      serialNumber: "OLD-SGJ7-88213",
      condition: "FAIR",
      quantity: 1,
      tradeInValue: 3000,
    }],
    soldItems: [{
      productId: productIdBySku.get("EM-AUD-JBLFLIP6"),
      productName: "JBL Flip 6 Portable Bluetooth Speaker",
      quantity: 1,
      unitPrice: 12500,
    }],
  }, actor);

  // ── 17. Installment plan — finance a phone over 6 months, then collect
  //       the first scheduled payment ─────────────────────────────────────
  console.log("  [17/21] Installment plan + payment collection…");
  const iphoneSerialIds = await availableSerialIds("EM-MOB-IP15", 1);
  const { plan: installmentPlan } = await operations.installmentPlanService.createPlan({
    customerId: customerIdByName.get("Nusrat Jahan"),
    saleDate: daysAgo(5),
    items: [{ productId: productIdBySku.get("EM-MOB-IP15"), quantityPieces: 1, actualSalePrice: 104900, serialIds: iphoneSerialIds }],
    discount: 0,
    downPayment: 30000,
    markupType: "PERCENT",
    markupValue: 6,
    numberOfMonths: 6,
    firstPaymentDate: daysFromNow(25),
    note: "iPhone 15 financed over 6 months",
  }, actor);

  await operations.installmentPlanService.collectPayment({
    planId: installmentPlan.id,
    amount: installmentPlan.monthlyInstallmentAmount,
    paymentDate: daysAgo(0),
    paymentMethod: "CASH",
    note: "First installment collected in-store",
  }, actor);

  // ── 18. Repair job — walk-in customer bringing their own (non-store)
  //       device. technicianId is a users.id (a login account), not an HR
  //       employee id, so it's left unassigned here — this demo's HR
  //       employees aren't given login accounts. ─────────────────────────
  console.log("  [18/21] Repair job…");
  await operations.repairJobService.createJob({
    customerName: "Kamrul Hasan",
    customerPhone: "01751-500005",
    deviceName: "Samsung Galaxy S21 (customer-owned)",
    problemDescription: "Cracked display glass, touch unresponsive in the bottom third of the screen.",
    estimatedCost: 4500,
    laborCost: 800,
    status: "IN_REPAIR",
    receivedDate: daysAgo(2),
    promisedDate: daysFromNow(3),
  }, actor);

  // ── 19. Warranty claim — against the Galaxy A16 sold in the walk-in cash
  //       sale above, using the exact serial that sale consumed ──────────
  console.log("  [19/21] Warranty claim…");
  await operations.warrantyClaimService.createClaim({
    salesInvoiceId: phoneSaleInvoice.id,
    salesInvoiceItemId: phoneSaleInvoice.items[0].id,
    productId: productIdBySku.get("EM-MOB-SGA16"),
    productSerialId: soldA16Serial.productSerialId,
    problemNote: "Battery draining unusually fast within the first week of use.",
    receivedDate: daysAgo(0),
    status: "RECEIVED",
    supplierId: supplierIdByKey.get("S1"),
  }, actor);

  // ── 20. Expenses (+ one soft-deleted, to give the Trash page content) ───
  console.log("  [20/21] Expenses…");
  await operations.expenseService.saveExpense({ date: daysAgo(4), category: "Rent", amount: 45000, note: "Showroom monthly rent" }, actor);
  await operations.expenseService.saveExpense({ date: daysAgo(3), category: "Vehicle", amount: 6000, note: "Delivery van fuel for home deliveries" }, actor);
  await operations.expenseService.saveExpense({ date: daysAgo(3), category: "Load/Unload", amount: 3500, note: "Warehouse unloading labour for new stock" }, actor);
  await operations.expenseService.saveExpense({ date: daysAgo(2), category: "Office", amount: 8500, note: "Electricity bill & stationery" }, actor);
  await operations.expenseService.saveExpense({ date: daysAgo(1), category: "Other", amount: 12000, note: "Facebook ads for Eid promotion" }, actor);

  const trashExpense = await operations.expenseService.saveExpense({ date: daysAgo(0), category: "Other", amount: 700, note: "Duplicate entry — to be removed" }, actor);
  await operations.expenseService.removeExpense(trashExpense.id, actor, "Entered twice by mistake");

  // ── 21. Extra users (Manager + Operator) ────────────────────────────────
  console.log("  [21/21] Extra users…");
  await platform.userService.createUser({
    name: "Rashed Karim", email: "manager@electromart.com", password: "Manager@1234", role: USER_ROLES.MANAGER, status: "active",
  }, actor);
  await platform.userService.createUser({
    name: "Tasnim Akter", email: "operator@electromart.com", password: "Operator@1234", role: USER_ROLES.OPERATOR, status: "active",
  }, actor);

  console.log("\n✓ ElectroMart demo seed complete — every stock unit, serial/IMEI, ledger balance and");
  console.log("  due amount above was produced by real service calls, not fabricated by direct SQL.\n");
  console.log(`  Tenant:      ${TENANT_NAME} (${tenantId})`);
  console.log(`  Categories:  ${CATEGORY_NAMES.length}`);
  console.log(`  Products:    ${PRODUCTS.length} (${PRODUCTS.filter((p) => p.serial).length} serial/IMEI-tracked)`);
  console.log(`  Suppliers:   ${Object.keys(SUPPLIERS).length}`);
  console.log(`  Customers:   ${RETAIL_CUSTOMERS.length}`);
  console.log(`  Employees:   ${EMPLOYEES.length}`);
  console.log("\nLogin (Super Admin):");
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log("\nAlso created: manager@electromart.com / Manager@1234, operator@electromart.com / Operator@1234");
  console.log("(these two roles have no permissions granted yet — assign them from the Permissions page).");
  console.log("\nNote: permission cache refreshes at most every 60s — if you log in immediately");
  console.log("and see missing menus, wait a minute or restart the dev server.\n");

  await db.getPool().end();
}

main().catch((err) => {
  console.error("\n✗ Seed failed.\n", err);
  process.exit(1);
});
