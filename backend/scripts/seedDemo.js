/**
 * Demo seed script — creates 3 realistic tenant organisations for live demo / Facebook showcase.
 * Run:  node --env-file=.env scripts/seedDemo.js
 * Safe to run multiple times (fully idempotent via ON CONFLICT DO NOTHING).
 *
 * Orgs created:
 *   1. Walton Electronics BD    — Electronics, DSR dealer model
 *   2. Agro Fresh Wholesale     — Grocery distributor, DSR dealer model
 *   3. Meena Bazar Grocery      — Grocery retailer, Retail POS model
 *
 * All admin passwords: Demo@1234
 */

import dotenv from "dotenv";
import { backendRoot } from "../config/paths.js";
import { DatabaseManager } from "../db/pool.js";
import { hashPassword } from "../lib/passwords.js";

dotenv.config({ path: `${backendRoot}/.env` });

// ─── Fixed IDs (prefix style, collision-safe, idempotent) ──────────────────

const TENANT = {
  elec:    "demo-t-electronics",
  grocery: "demo-t-grocery",
  retail:  "demo-t-retail",
};
const USER = {
  elec:    "demo-u-elec-admin",
  grocery: "demo-u-grocery-admin",
  retail:  "demo-u-retail-admin",
};
const DEMO_PASSWORD = "Demo@1234";

// ─── Feature sets ──────────────────────────────────────────────────────────

const DEALER_FEATURES = [
  "products", "dsrs", "customers", "morning-issue", "settlements",
  "expenses", "dsr-finance", "reports", "history", "activity-logs", "issue-center", "trash",
  "suppliers", "purchase-receive", "supplier-payments", "supplier-statement",
  "finance-accounts", "finance-dashboard", "profit", "dashboard",
  "my-profile", "security", "help-desk", "org-settings", "user-management",
  "permissions", "damaged-stock", "stock-movement", "low-stock-alerts",
  "shop-due-ledger", "database-backup",
];

const ELECTRONICS_EXTRA_FEATURES = [
  "product-serials", "warranty-claims", "repair-jobs",
];

const RETAIL_FEATURES = [
  "products", "expenses", "suppliers", "purchase-receive", "supplier-payments",
  "supplier-statement", "retailer-quick-sale", "retailer-sales-invoices",
  "retailer-promotions", "retailer-customer-due", "retailer-due-collection",
  "retailer-sales-return", "retailer-daily-sales-report",
  "finance-accounts", "finance-dashboard", "profit", "reports", "history",
  "activity-logs", "issue-center", "trash", "dashboard", "my-profile", "security", "help-desk",
  "org-settings", "user-management", "permissions", "damaged-stock",
  "stock-movement", "low-stock-alerts", "retail-customers",
  "retail-customer-retention", "database-backup",
];

// ─── Tenant data ───────────────────────────────────────────────────────────

const TENANTS = [
  {
    id:      TENANT.elec,
    name:    "Walton Electronics BD",
    slug:    "walton-electronics-bd",
    email:   "admin@walton-electronics-bd.demo",
    plan:    "professional",
    address: "45 Karwan Bazar, Dhaka-1215",
  },
  {
    id:      TENANT.grocery,
    name:    "Agro Fresh Wholesale",
    slug:    "agro-fresh-wholesale",
    email:   "admin@agrofresh.demo",
    plan:    "professional",
    address: "12 Mohakhali DOHS, Dhaka-1206",
  },
  {
    id:      TENANT.retail,
    name:    "Meena Bazar Grocery",
    slug:    "meena-bazar-grocery",
    email:   "admin@meenabazar.demo",
    plan:    "starter",
    address: "House 8, Road 3, Dhanmondi, Dhaka-1205",
  },
];

const USERS_DATA = [
  {
    id:       USER.elec,
    name:     "Rahim Uddin (Electronics Admin)",
    email:    "admin@walton-electronics-bd.demo",
    role:     "super_admin",
    tenantId: TENANT.elec,
  },
  {
    id:       USER.grocery,
    name:     "Kamal Hossain (Agro Admin)",
    email:    "admin@agrofresh.demo",
    role:     "super_admin",
    tenantId: TENANT.grocery,
  },
  {
    id:       USER.retail,
    name:     "Nasrin Akter (Retail Admin)",
    email:    "admin@meenabazar.demo",
    role:     "super_admin",
    tenantId: TENANT.retail,
  },
];

// ─── Electronics catalogue ──────────────────────────────────────────────────

const ELEC_CATEGORIES = [
  { id: "demo-cat-elec-fridge",   name: "Refrigerators" },
  { id: "demo-cat-elec-ac",       name: "Air Conditioners" },
  { id: "demo-cat-elec-tv",       name: "Televisions" },
  { id: "demo-cat-elec-wash",     name: "Washing Machines" },
  { id: "demo-cat-elec-fan",      name: "Fans & Small Appliances" },
];

const ELEC_PRODUCTS = [
  // Refrigerators
  {
    id: "demo-p-elec-001", catId: "demo-cat-elec-fridge",
    name: "Walton Fridge 200L (Direct Cool)", brand: "Walton", model: "WFC-3A6-GDEL-XX",
    sku: "WLT-FR-200L", ppc: 1, pp: 18500, wp: 22000, rp: 25000, stock: 12,
    serial: false, warranty: 36, desc: "200-litre direct cool single-door refrigerator.",
  },
  {
    id: "demo-p-elec-002", catId: "demo-cat-elec-fridge",
    name: "Walton Fridge 350L (Frost Free)", brand: "Walton", model: "WFC-3A8-GDEL-XX",
    sku: "WLT-FR-350L", ppc: 1, pp: 28000, wp: 33000, rp: 38000, stock: 8,
    serial: false, warranty: 36, desc: "350-litre no-frost double-door refrigerator.",
  },
  {
    id: "demo-p-elec-003", catId: "demo-cat-elec-fridge",
    name: "LG Refrigerator 260L (Smart Inverter)", brand: "LG", model: "GN-B502SQCL",
    sku: "LG-FR-260L", ppc: 1, pp: 29000, wp: 35000, rp: 40000, stock: 6,
    serial: false, warranty: 24, desc: "260-litre smart inverter refrigerator with multi-air flow.",
  },
  {
    id: "demo-p-elec-004", catId: "demo-cat-elec-fridge",
    name: "Samsung Refrigerator 420L (Digital Inverter)", brand: "Samsung", model: "RT42K5552B1/D3",
    sku: "SAM-FR-420L", ppc: 1, pp: 42000, wp: 50000, rp: 58000, stock: 4,
    serial: false, warranty: 24, desc: "420-litre two-door digital inverter refrigerator.",
  },
  // Air Conditioners
  {
    id: "demo-p-elec-005", catId: "demo-cat-elec-ac",
    name: "Walton AC 1 Ton (Inverter)", brand: "Walton", model: "WSI-INVERNA-12C",
    sku: "WLT-AC-1T", ppc: 1, pp: 32000, wp: 38000, rp: 42000, stock: 10,
    serial: true, warranty: 36, desc: "1-ton split inverter AC, energy-saving grade A.",
  },
  {
    id: "demo-p-elec-006", catId: "demo-cat-elec-ac",
    name: "Walton AC 1.5 Ton (Inverter)", brand: "Walton", model: "WSI-INVERNA-18C",
    sku: "WLT-AC-15T", ppc: 1, pp: 42000, wp: 50000, rp: 55000, stock: 9,
    serial: true, warranty: 36, desc: "1.5-ton split inverter AC with auto-clean function.",
  },
  {
    id: "demo-p-elec-007", catId: "demo-cat-elec-ac",
    name: "Walton AC 2 Ton (Inverter)", brand: "Walton", model: "WSI-INVERNA-24C",
    sku: "WLT-AC-2T", ppc: 1, pp: 55000, wp: 65000, rp: 72000, stock: 5,
    serial: true, warranty: 36, desc: "2-ton inverter AC ideal for large rooms.",
  },
  {
    id: "demo-p-elec-008", catId: "demo-cat-elec-ac",
    name: "Hitachi AC 1 Ton (Frost Wash)", brand: "Hitachi", model: "RAU012HVDOA",
    sku: "HIT-AC-1T", ppc: 1, pp: 35000, wp: 42000, rp: 48000, stock: 6,
    serial: true, warranty: 24, desc: "1-ton Hitachi AC with frost-wash self-cleaning.",
  },
  {
    id: "demo-p-elec-009", catId: "demo-cat-elec-ac",
    name: "Hitachi AC 1.5 Ton (Frost Wash)", brand: "Hitachi", model: "RAU018HVDOA",
    sku: "HIT-AC-15T", ppc: 1, pp: 46000, wp: 55000, rp: 62000, stock: 5,
    serial: true, warranty: 24, desc: "1.5-ton Hitachi AC with frost-wash self-cleaning.",
  },
  {
    id: "demo-p-elec-010", catId: "demo-cat-elec-ac",
    name: "LG Dual Cool AC 1 Ton", brand: "LG", model: "S4-W12JZFAA",
    sku: "LG-AC-1T", ppc: 1, pp: 36000, wp: 43000, rp: 49000, stock: 4,
    serial: true, warranty: 24, desc: "1-ton LG dual cool inverter AC with Wi-Fi control.",
  },
  // Televisions
  {
    id: "demo-p-elec-011", catId: "demo-cat-elec-tv",
    name: "Walton TV 32\" LED (W32E200S)", brand: "Walton", model: "W32E200S",
    sku: "WLT-TV-32", ppc: 1, pp: 16000, wp: 19000, rp: 22000, stock: 15,
    serial: false, warranty: 12, desc: "32-inch HD LED TV with HDMI & USB input.",
  },
  {
    id: "demo-p-elec-012", catId: "demo-cat-elec-tv",
    name: "Walton Smart TV 43\" 4K (W43E400S)", brand: "Walton", model: "W43E400S",
    sku: "WLT-TV-43", ppc: 1, pp: 25000, wp: 30000, rp: 35000, stock: 10,
    serial: false, warranty: 12, desc: "43-inch 4K UHD smart Android TV.",
  },
  {
    id: "demo-p-elec-013", catId: "demo-cat-elec-tv",
    name: "Walton Smart TV 55\" 4K (W55D500S)", brand: "Walton", model: "W55D500S",
    sku: "WLT-TV-55", ppc: 1, pp: 38000, wp: 45000, rp: 52000, stock: 6,
    serial: false, warranty: 12, desc: "55-inch 4K UHD smart TV with Dolby audio.",
  },
  {
    id: "demo-p-elec-014", catId: "demo-cat-elec-tv",
    name: "Sony Bravia 32\" HD TV (KD-32W800)", brand: "Sony", model: "KD-32W800",
    sku: "SNY-TV-32", ppc: 1, pp: 20000, wp: 24000, rp: 28000, stock: 8,
    serial: false, warranty: 12, desc: "32-inch Sony Bravia HD TV with X-Reality Pro.",
  },
  {
    id: "demo-p-elec-015", catId: "demo-cat-elec-tv",
    name: "Sony Bravia 43\" 4K TV (KD-43X7500H)", brand: "Sony", model: "KD-43X7500H",
    sku: "SNY-TV-43", ppc: 1, pp: 38000, wp: 45000, rp: 52000, stock: 5,
    serial: false, warranty: 12, desc: "43-inch Sony 4K UHD Android TV with HDR.",
  },
  {
    id: "demo-p-elec-016", catId: "demo-cat-elec-tv",
    name: "Samsung 32\" Smart TV (T4500)", brand: "Samsung", model: "UA32T4500AK",
    sku: "SAM-TV-32", ppc: 1, pp: 19000, wp: 23000, rp: 27000, stock: 10,
    serial: false, warranty: 12, desc: "32-inch Samsung smart TV with Tizen OS.",
  },
  {
    id: "demo-p-elec-017", catId: "demo-cat-elec-tv",
    name: "Samsung QLED 55\" 4K (Q70A)", brand: "Samsung", model: "QE55Q70AATXXD",
    sku: "SAM-TV-55Q", ppc: 1, pp: 70000, wp: 85000, rp: 98000, stock: 3,
    serial: false, warranty: 24, desc: "55-inch Samsung QLED 4K TV with Quantum Dot.",
  },
  // Washing Machines
  {
    id: "demo-p-elec-018", catId: "demo-cat-elec-wash",
    name: "Walton Washing Machine 7kg (WWM-72)", brand: "Walton", model: "WWM-72S",
    sku: "WLT-WM-7K", ppc: 1, pp: 18000, wp: 22000, rp: 25000, stock: 7,
    serial: false, warranty: 24, desc: "7kg top-load fully automatic washing machine.",
  },
  {
    id: "demo-p-elec-019", catId: "demo-cat-elec-wash",
    name: "Walton Washing Machine 10kg (WWM-102)", brand: "Walton", model: "WWM-102S",
    sku: "WLT-WM-10K", ppc: 1, pp: 26000, wp: 32000, rp: 36000, stock: 4,
    serial: false, warranty: 24, desc: "10kg front-load inverter washing machine.",
  },
  // Fans
  {
    id: "demo-p-elec-020", catId: "demo-cat-elec-fan",
    name: "Walton Ceiling Fan 56\" (WCF-14)", brand: "Walton", model: "WCF-14S",
    sku: "WLT-FAN-CF56", ppc: 1, pp: 2200, wp: 2800, rp: 3200, stock: 30,
    serial: false, warranty: 12, desc: "56-inch 5-blade energy-saving ceiling fan.",
  },
];

const ELEC_SUPPLIERS = [
  { id: "demo-sup-elec-001", name: "Walton Hi-Tech Industries Ltd", phone: "02-9861661", address: "Chandra, Kaliakoir, Gazipur" },
  { id: "demo-sup-elec-002", name: "Sony Bangladesh Ltd", phone: "02-8833977", address: "Gulshan-1, Dhaka-1212" },
  { id: "demo-sup-elec-003", name: "Hitachi Trading Bangladesh", phone: "01711-000101", address: "Motijheel, Dhaka-1000" },
  { id: "demo-sup-elec-004", name: "Samsung Electronics BD Ltd", phone: "01811-000202", address: "Banani, Dhaka-1213" },
  { id: "demo-sup-elec-005", name: "LG Electronics Bangladesh", phone: "01911-000303", address: "Tejgaon, Dhaka-1208" },
];

const ELEC_DSRS = [
  { id: "demo-dsr-elec-001", name: "Md. Abdul Karim", phone: "01712-001001", area: "Motijheel & Paltan", status: "Active" },
  { id: "demo-dsr-elec-002", name: "Mohammad Rahman", phone: "01812-002002", area: "Gulshan & Banani", status: "Active" },
  { id: "demo-dsr-elec-003", name: "Sohel Rana", phone: "01912-003003", area: "Dhanmondi & Lalmatia", status: "Active" },
  { id: "demo-dsr-elec-004", name: "Jahirul Islam", phone: "01612-004004", area: "Mirpur & Pallabi", status: "Active" },
];

const ELEC_CUSTOMERS = [
  { id: "demo-cust-elec-001", shopName: "Dream Electronics", ownerName: "Hafizur Rahman", phone: "01711-100001", address: "7/A Jigatola, Dhanmondi", market: "Dhanmondi Electronics Market", dsrId: "demo-dsr-elec-003" },
  { id: "demo-cust-elec-002", shopName: "City Electronics Corner", ownerName: "Monirul Islam", phone: "01811-100002", address: "12 Gulshan Ave, Gulshan-1", market: "Gulshan Market", dsrId: "demo-dsr-elec-002" },
  { id: "demo-cust-elec-003", shopName: "Metro Electronics House", ownerName: "Abdur Rahim", phone: "01911-100003", address: "34 Dilkusha C/A, Motijheel", market: "Motijheel Electronics", dsrId: "demo-dsr-elec-001" },
  { id: "demo-cust-elec-004", shopName: "Star Electronics & Appliances", ownerName: "Belal Hossain", phone: "01611-100004", address: "Shop 12, Mirpur-1 Commercial", market: "Mirpur Market", dsrId: "demo-dsr-elec-004" },
  { id: "demo-cust-elec-005", shopName: "National Electronics", ownerName: "Salim Ahmed", phone: "01751-100005", address: "88 Elephant Road, New Market", market: "New Market Area", dsrId: "demo-dsr-elec-003" },
  { id: "demo-cust-elec-006", shopName: "Dhaka Electronics Emporium", ownerName: "Faruk Hossain", phone: "01851-100006", address: "45 Bangshal Rd, Old Dhaka", market: "Islampur Market", dsrId: "demo-dsr-elec-001" },
];

// ─── Grocery Wholesale catalogue ────────────────────────────────────────────

const GROCERY_CATEGORIES = [
  { id: "demo-cat-groc-rice",  name: "Rice & Grains" },
  { id: "demo-cat-groc-oil",   name: "Oil & Ghee" },
  { id: "demo-cat-groc-spice", name: "Spices & Seasonings" },
  { id: "demo-cat-groc-sugar", name: "Sugar & Salt" },
  { id: "demo-cat-groc-dal",   name: "Pulses & Dal" },
  { id: "demo-cat-groc-bev",   name: "Beverages" },
  { id: "demo-cat-groc-snack", name: "Biscuits & Snacks" },
];

const GROCERY_PRODUCTS = [
  // Rice
  { id: "demo-p-groc-001", catId: "demo-cat-groc-rice", name: "Miniket Rice 50kg (Bag)", brand: "Local", model: "", sku: "GRC-RICE-MK50", ppc: 1, pp: 2600, wp: 2800, rp: 2900, stock: 120, serial: false, warranty: 0, desc: "Premium Miniket white rice, 50kg sack." },
  { id: "demo-p-groc-002", catId: "demo-cat-groc-rice", name: "Nazirshail Rice 50kg (Bag)", brand: "Local", model: "", sku: "GRC-RICE-NZ50", ppc: 1, pp: 3000, wp: 3200, rp: 3350, stock: 80, serial: false, warranty: 0, desc: "Fragrant Nazirshail rice, 50kg sack." },
  { id: "demo-p-groc-003", catId: "demo-cat-groc-rice", name: "PRAN Basmati Rice 5kg", brand: "PRAN", model: "", sku: "GRC-RICE-BAS5", ppc: 6, pp: 250, wp: 280, rp: 295, stock: 240, serial: false, warranty: 0, desc: "PRAN long-grain basmati rice, 5kg pack." },
  { id: "demo-p-groc-004", catId: "demo-cat-groc-rice", name: "Teer Flour (Atta) 10kg", brand: "Teer", model: "", sku: "GRC-ATTA-10K", ppc: 2, pp: 450, wp: 490, rp: 520, stock: 180, serial: false, warranty: 0, desc: "Teer whole-wheat flour, 10kg bag." },
  // Oil
  { id: "demo-p-groc-005", catId: "demo-cat-groc-oil", name: "Teer Soybean Oil 5L", brand: "Teer", model: "", sku: "GRC-OIL-TER5", ppc: 4, pp: 680, wp: 740, rp: 770, stock: 400, serial: false, warranty: 0, desc: "Teer refined soybean oil, 5-litre jar." },
  { id: "demo-p-groc-006", catId: "demo-cat-groc-oil", name: "PRAN Soybean Oil 1L", brand: "PRAN", model: "", sku: "GRC-OIL-PRN1", ppc: 12, pp: 150, wp: 165, rp: 175, stock: 600, serial: false, warranty: 0, desc: "PRAN refined soybean oil, 1-litre bottle." },
  { id: "demo-p-groc-007", catId: "demo-cat-groc-oil", name: "Meghna Soybean Oil 5L", brand: "Meghna", model: "", sku: "GRC-OIL-MGN5", ppc: 4, pp: 670, wp: 730, rp: 760, stock: 300, serial: false, warranty: 0, desc: "Meghna fresh soybean oil, 5-litre jar." },
  { id: "demo-p-groc-008", catId: "demo-cat-groc-oil", name: "Pran Mustard Oil 1L", brand: "PRAN", model: "", sku: "GRC-OIL-MST1", ppc: 12, pp: 185, wp: 205, rp: 220, stock: 360, serial: false, warranty: 0, desc: "PRAN cold-pressed mustard oil, 1-litre." },
  // Spices
  { id: "demo-p-groc-009", catId: "demo-cat-groc-spice", name: "Radhuni Turmeric Powder 200g", brand: "Radhuni", model: "", sku: "GRC-SPC-TUR200", ppc: 24, pp: 45, wp: 55, rp: 62, stock: 720, serial: false, warranty: 0, desc: "Radhuni pure turmeric powder, 200g pack." },
  { id: "demo-p-groc-010", catId: "demo-cat-groc-spice", name: "Radhuni Cumin Powder 200g", brand: "Radhuni", model: "", sku: "GRC-SPC-CUM200", ppc: 24, pp: 55, wp: 65, rp: 72, stock: 600, serial: false, warranty: 0, desc: "Radhuni ground cumin powder, 200g pack." },
  { id: "demo-p-groc-011", catId: "demo-cat-groc-spice", name: "ACI Pure Turmeric 200g", brand: "ACI", model: "", sku: "GRC-SPC-ACI-TUR", ppc: 24, pp: 48, wp: 58, rp: 65, stock: 480, serial: false, warranty: 0, desc: "ACI triple-tested pure turmeric, 200g." },
  { id: "demo-p-groc-012", catId: "demo-cat-groc-spice", name: "Radhuni Coriander Powder 200g", brand: "Radhuni", model: "", sku: "GRC-SPC-COR200", ppc: 24, pp: 42, wp: 52, rp: 58, stock: 480, serial: false, warranty: 0, desc: "Radhuni coriander powder, 200g pack." },
  // Sugar & Salt
  { id: "demo-p-groc-013", catId: "demo-cat-groc-sugar", name: "Meghna Sugar 1kg", brand: "Meghna", model: "", sku: "GRC-SGR-MGN1", ppc: 24, pp: 112, wp: 125, rp: 132, stock: 1200, serial: false, warranty: 0, desc: "Meghna refined white sugar, 1kg packet." },
  { id: "demo-p-groc-014", catId: "demo-cat-groc-sugar", name: "ACI Iodized Salt 1kg", brand: "ACI", model: "", sku: "GRC-SLT-ACI1", ppc: 24, pp: 35, wp: 42, rp: 48, stock: 1440, serial: false, warranty: 0, desc: "ACI iodized table salt, 1kg packet." },
  { id: "demo-p-groc-015", catId: "demo-cat-groc-sugar", name: "Molla Salt 1kg", brand: "Molla", model: "", sku: "GRC-SLT-MOL1", ppc: 24, pp: 30, wp: 38, rp: 44, stock: 960, serial: false, warranty: 0, desc: "Molla refined iodized salt, 1kg pack." },
  // Dal
  { id: "demo-p-groc-016", catId: "demo-cat-groc-dal", name: "ACI Moosur Dal 1kg", brand: "ACI", model: "", sku: "GRC-DAL-MSR1", ppc: 12, pp: 90, wp: 100, rp: 110, stock: 600, serial: false, warranty: 0, desc: "ACI red lentils (moosur dal), 1kg pack." },
  { id: "demo-p-groc-017", catId: "demo-cat-groc-dal", name: "PRAN Mung Dal 500g", brand: "PRAN", model: "", sku: "GRC-DAL-MNG500", ppc: 24, pp: 75, wp: 85, rp: 95, stock: 480, serial: false, warranty: 0, desc: "PRAN green mung dal, 500g packet." },
  { id: "demo-p-groc-018", catId: "demo-cat-groc-dal", name: "Chola Dal (Chickpea) 1kg", brand: "Local", model: "", sku: "GRC-DAL-CHL1", ppc: 12, pp: 95, wp: 110, rp: 120, stock: 360, serial: false, warranty: 0, desc: "Split chickpea dal (chola dal), 1kg pack." },
  // Beverages
  { id: "demo-p-groc-019", catId: "demo-cat-groc-bev", name: "RC Cola 250ml (24 pcs Crate)", brand: "RC Cola", model: "", sku: "GRC-BEV-RC250", ppc: 24, pp: 12, wp: 15, rp: 18, stock: 2400, serial: false, warranty: 0, desc: "RC Cola carbonated drink, 250ml can." },
  { id: "demo-p-groc-020", catId: "demo-cat-groc-bev", name: "PRAN Frooto Mango 250ml", brand: "PRAN", model: "", sku: "GRC-BEV-FRT250", ppc: 24, pp: 15, wp: 18, rp: 22, stock: 1440, serial: false, warranty: 0, desc: "PRAN Frooto mango juice drink, 250ml." },
  { id: "demo-p-groc-021", catId: "demo-cat-groc-bev", name: "Pran Mango Juice 1L (Tetra)", brand: "PRAN", model: "", sku: "GRC-BEV-MNG1L", ppc: 12, pp: 65, wp: 75, rp: 85, stock: 720, serial: false, warranty: 0, desc: "PRAN mango juice in 1-litre tetra pack." },
  // Snacks
  { id: "demo-p-groc-022", catId: "demo-cat-groc-snack", name: "Olympic Banana Chips 150g", brand: "Olympic", model: "", sku: "GRC-SNK-BAN150", ppc: 24, pp: 28, wp: 35, rp: 42, stock: 960, serial: false, warranty: 0, desc: "Olympic crispy banana chips, 150g pack." },
  { id: "demo-p-groc-023", catId: "demo-cat-groc-snack", name: "PRAN Chanachur Hot 300g", brand: "PRAN", model: "", sku: "GRC-SNK-CHN300", ppc: 24, pp: 32, wp: 40, rp: 48, stock: 720, serial: false, warranty: 0, desc: "PRAN spicy chanachur snack mix, 300g pack." },
  { id: "demo-p-groc-024", catId: "demo-cat-groc-snack", name: "Hacks Biscuit Cream 100g", brand: "Hacks", model: "", sku: "GRC-SNK-BCT100", ppc: 48, pp: 18, wp: 22, rp: 28, stock: 1440, serial: false, warranty: 0, desc: "Hacks cream sandwich biscuit, 100g pack." },
];

const GROCERY_SUPPLIERS = [
  { id: "demo-sup-groc-001", name: "PRAN-RFL Group", phone: "02-7793007", address: "PRAN Centre, 105 Bir Uttam Rafiqul Islam Ave, Dhaka-1206" },
  { id: "demo-sup-groc-002", name: "Meghna Group of Industries", phone: "02-9566026", address: "Meghna Industrial Zone, Rupganj, Narayanganj" },
  { id: "demo-sup-groc-003", name: "ACI Limited", phone: "02-9887091", address: "245 Tejgaon I/A, Dhaka-1208" },
  { id: "demo-sup-groc-004", name: "Teer Brand (City Group)", phone: "01711-200001", address: "City House, 20 Rajuk Avenue, Dhaka-1000" },
  { id: "demo-sup-groc-005", name: "Olympic Industries Ltd", phone: "02-7812101", address: "Goaltek Depot, Rupganj, Narayanganj" },
  { id: "demo-sup-groc-006", name: "RC Cola Bangladesh (Globe Beverages)", phone: "01811-200002", address: "Tongi I/E Area, Gazipur" },
];

const GROCERY_DSRS = [
  { id: "demo-dsr-groc-001", name: "Md. Alam Hossain", phone: "01712-005001", area: "Mirpur 1-6", status: "Active" },
  { id: "demo-dsr-groc-002", name: "Jalal Uddin Ahmed", phone: "01812-006002", area: "Mohammadpur & Adabor", status: "Active" },
  { id: "demo-dsr-groc-003", name: "Abdur Razzak", phone: "01912-007003", area: "Uttara & Turag", status: "Active" },
  { id: "demo-dsr-groc-004", name: "Shahidul Islam", phone: "01612-008004", area: "Badda & Rampura", status: "Active" },
];

const GROCERY_CUSTOMERS = [
  { id: "demo-cust-groc-001", shopName: "Rahim Brothers Store", ownerName: "Abdul Rahim", phone: "01711-300001", address: "Shop 5, Mirpur-1 Bazar", market: "Mirpur-1 Market", dsrId: "demo-dsr-groc-001" },
  { id: "demo-cust-groc-002", shopName: "Lucky Grocery Depot", ownerName: "Nur Islam", phone: "01811-300002", address: "16 Mohammadpur Town Hall", market: "Mohammadpur Bazar", dsrId: "demo-dsr-groc-002" },
  { id: "demo-cust-groc-003", shopName: "Salam Trading Co.", ownerName: "Abdus Salam", phone: "01911-300003", address: "Sector-4, Uttara", market: "Uttara Market", dsrId: "demo-dsr-groc-003" },
  { id: "demo-cust-groc-004", shopName: "Al-Amin General Store", ownerName: "Al-Amin Khan", phone: "01611-300004", address: "Merul Badda, Badda", market: "Badda Bazar", dsrId: "demo-dsr-groc-004" },
  { id: "demo-cust-groc-005", shopName: "Hasan Provision Store", ownerName: "Md. Hasan", phone: "01751-300005", address: "Pirerbag, Mirpur-2", market: "Mirpur-2 Market", dsrId: "demo-dsr-groc-001" },
  { id: "demo-cust-groc-006", shopName: "Bismillah General Traders", ownerName: "Kadir Mia", phone: "01851-300006", address: "Shyamoli Road, Mohammadpur", market: "Shyamoli Market", dsrId: "demo-dsr-groc-002" },
  { id: "demo-cust-groc-007", shopName: "Rupali Grocery Center", ownerName: "Habibur Rahman", phone: "01951-300007", address: "House 3, Sector-7, Uttara", market: "Uttara Market", dsrId: "demo-dsr-groc-003" },
  { id: "demo-cust-groc-008", shopName: "Star Provisions & Trading", ownerName: "Rafiq Ahmed", phone: "01651-300008", address: "Badda Link Road, Dhaka", market: "Badda Bazar", dsrId: "demo-dsr-groc-004" },
];

// ─── Grocery Retail catalogue ───────────────────────────────────────────────

const RETAIL_CATEGORIES = [
  { id: "demo-cat-ret-rice",   name: "Rice & Grains" },
  { id: "demo-cat-ret-oil",    name: "Oil & Ghee" },
  { id: "demo-cat-ret-spice",  name: "Spices" },
  { id: "demo-cat-ret-sugar",  name: "Sugar & Salt" },
  { id: "demo-cat-ret-dal",    name: "Pulses" },
  { id: "demo-cat-ret-dairy",  name: "Dairy & Eggs" },
  { id: "demo-cat-ret-bev",    name: "Beverages" },
  { id: "demo-cat-ret-bread",  name: "Bread & Bakery" },
];

const RETAIL_PRODUCTS = [
  { id: "demo-p-ret-001", catId: "demo-cat-ret-rice",  name: "Miniket Rice 5kg",         brand: "Local",   sku: "RET-RICE-MK5",  ppc: 6,  pp: 260,  wp: 278,  rp: 295,  stock: 200, serial: false, warranty: 0, desc: "Premium Miniket rice, 5kg retail pack." },
  { id: "demo-p-ret-002", catId: "demo-cat-ret-rice",  name: "Kataribhog Rice 1kg",       brand: "Local",   sku: "RET-RICE-KT1",  ppc: 12, pp: 75,   wp: 85,   rp: 95,   stock: 300, serial: false, warranty: 0, desc: "Aromatic Kataribhog rice, 1kg pack." },
  { id: "demo-p-ret-003", catId: "demo-cat-ret-rice",  name: "Teer Atta (Flour) 2kg",     brand: "Teer",    sku: "RET-ATTA-TR2",  ppc: 6,  pp: 95,   wp: 105,  rp: 115,  stock: 180, serial: false, warranty: 0, desc: "Teer whole-wheat flour, 2kg pack." },
  { id: "demo-p-ret-004", catId: "demo-cat-ret-oil",   name: "Teer Soybean Oil 1L",       brand: "Teer",    sku: "RET-OIL-TR1",   ppc: 12, pp: 152,  wp: 162,  rp: 175,  stock: 360, serial: false, warranty: 0, desc: "Teer refined soybean oil, 1-litre bottle." },
  { id: "demo-p-ret-005", catId: "demo-cat-ret-oil",   name: "Teer Soybean Oil 2L",       brand: "Teer",    sku: "RET-OIL-TR2",   ppc: 6,  pp: 300,  wp: 318,  rp: 340,  stock: 240, serial: false, warranty: 0, desc: "Teer refined soybean oil, 2-litre bottle." },
  { id: "demo-p-ret-006", catId: "demo-cat-ret-oil",   name: "PRAN Mustard Oil 500ml",    brand: "PRAN",    sku: "RET-OIL-MST5",  ppc: 12, pp: 95,   wp: 108,  rp: 120,  stock: 240, serial: false, warranty: 0, desc: "PRAN cold-pressed mustard oil, 500ml." },
  { id: "demo-p-ret-007", catId: "demo-cat-ret-spice", name: "Radhuni Turmeric 100g",     brand: "Radhuni", sku: "RET-SPC-TUR1",  ppc: 24, pp: 28,   wp: 33,   rp: 40,   stock: 600, serial: false, warranty: 0, desc: "Radhuni pure turmeric powder, 100g." },
  { id: "demo-p-ret-008", catId: "demo-cat-ret-spice", name: "Radhuni Cumin 100g",        brand: "Radhuni", sku: "RET-SPC-CUM1",  ppc: 24, pp: 32,   wp: 38,   rp: 45,   stock: 480, serial: false, warranty: 0, desc: "Radhuni cumin powder, 100g pack." },
  { id: "demo-p-ret-009", catId: "demo-cat-ret-spice", name: "Radhuni Chilli Powder 100g",brand: "Radhuni", sku: "RET-SPC-CHL1",  ppc: 24, pp: 30,   wp: 36,   rp: 45,   stock: 480, serial: false, warranty: 0, desc: "Radhuni red chilli powder, 100g pack." },
  { id: "demo-p-ret-010", catId: "demo-cat-ret-sugar", name: "Meghna Sugar 1kg",          brand: "Meghna",  sku: "RET-SGR-MGN1",  ppc: 24, pp: 112,  wp: 120,  rp: 130,  stock: 600, serial: false, warranty: 0, desc: "Meghna refined white sugar, 1kg." },
  { id: "demo-p-ret-011", catId: "demo-cat-ret-sugar", name: "ACI Iodized Salt 1kg",      brand: "ACI",     sku: "RET-SLT-ACI1",  ppc: 24, pp: 35,   wp: 42,   rp: 50,   stock: 720, serial: false, warranty: 0, desc: "ACI iodized table salt, 1kg." },
  { id: "demo-p-ret-012", catId: "demo-cat-ret-dal",   name: "Moosur Dal 500g",           brand: "Local",   sku: "RET-DAL-MSR5",  ppc: 24, pp: 48,   wp: 55,   rp: 65,   stock: 480, serial: false, warranty: 0, desc: "Red lentils (moosur dal), 500g pack." },
  { id: "demo-p-ret-013", catId: "demo-cat-ret-dal",   name: "Mung Dal 500g",             brand: "PRAN",    sku: "RET-DAL-MNG5",  ppc: 24, pp: 75,   wp: 85,   rp: 95,   stock: 360, serial: false, warranty: 0, desc: "PRAN green mung dal, 500g packet." },
  { id: "demo-p-ret-014", catId: "demo-cat-ret-dairy", name: "Aarong UHT Milk 1L",        brand: "Aarong",  sku: "RET-MLK-ARG1",  ppc: 12, pp: 90,   wp: 100,  rp: 115,  stock: 360, serial: false, warranty: 0, desc: "Aarong full-fat UHT milk, 1-litre tetra." },
  { id: "demo-p-ret-015", catId: "demo-cat-ret-dairy", name: "Farm Fresh Milk 500ml",     brand: "Farm Fresh", sku: "RET-MLK-FF5", ppc: 12, pp: 48,   wp: 55,   rp: 65,   stock: 240, serial: false, warranty: 0, desc: "Farm Fresh pasteurised milk, 500ml." },
  { id: "demo-p-ret-016", catId: "demo-cat-ret-dairy", name: "Egg (12 pcs Tray)",         brand: "Local",   sku: "RET-EGG-12",    ppc: 1,  pp: 125,  wp: 135,  rp: 145,  stock: 200, serial: false, warranty: 0, desc: "Fresh farm eggs, 1 tray of 12 pieces." },
  { id: "demo-p-ret-017", catId: "demo-cat-ret-bev",   name: "Coca-Cola 250ml Can",       brand: "Coca-Cola",sku: "RET-BEV-CC250", ppc: 24, pp: 35,   wp: 42,   rp: 50,   stock: 480, serial: false, warranty: 0, desc: "Coca-Cola classic, 250ml can." },
  { id: "demo-p-ret-018", catId: "demo-cat-ret-bev",   name: "PRAN Frooto 250ml",         brand: "PRAN",    sku: "RET-BEV-FR250", ppc: 24, pp: 15,   wp: 18,   rp: 22,   stock: 720, serial: false, warranty: 0, desc: "PRAN Frooto mango drink, 250ml." },
  { id: "demo-p-ret-019", catId: "demo-cat-ret-bread", name: "Bread Loaf (Large)",        brand: "Nabisco", sku: "RET-BRD-LG",    ppc: 1,  pp: 35,   wp: 40,   rp: 48,   stock: 150, serial: false, warranty: 0, desc: "Soft wheat bread loaf, large size." },
  { id: "demo-p-ret-020", catId: "demo-cat-ret-bread", name: "Olympic Marie Biscuit 200g", brand: "Olympic", sku: "RET-BCT-MR200", ppc: 24, pp: 28,   wp: 33,   rp: 40,   stock: 600, serial: false, warranty: 0, desc: "Olympic Marie biscuit, 200g pack." },
];

const RETAIL_SUPPLIERS = [
  { id: "demo-sup-ret-001", name: "PRAN-RFL Group",             phone: "02-7793007",  address: "PRAN Centre, 105 Bir Uttam Rafiqul Islam Ave, Dhaka" },
  { id: "demo-sup-ret-002", name: "ACI Limited",                phone: "02-9887091",  address: "245 Tejgaon I/A, Dhaka-1208" },
  { id: "demo-sup-ret-003", name: "Meghna Group of Industries", phone: "02-9566026",  address: "Rupganj, Narayanganj" },
  { id: "demo-sup-ret-004", name: "Aarong Dairy (BRAC)",        phone: "02-9881265",  address: "75 Mohakhali, Dhaka-1212" },
  { id: "demo-sup-ret-005", name: "Olympic Industries Ltd",     phone: "02-7812101",  address: "Goaltek Depot, Rupganj, Narayanganj" },
];

const RETAIL_CUSTOMERS = [
  { id: "demo-rcust-ret-001", name: "Fatema Begum",    phone: "01711-400001", address: "House 7, Dhanmondi-2", note: "Regular customer" },
  { id: "demo-rcust-ret-002", name: "Rafiqul Islam",   phone: "01811-400002", address: "Flat 3B, Green Road", note: "" },
  { id: "demo-rcust-ret-003", name: "Shahnaz Parvin",  phone: "01911-400003", address: "Kalabagan, Dhaka", note: "Monthly credit customer" },
  { id: "demo-rcust-ret-004", name: "Jamal Uddin",     phone: "01611-400004", address: "Jigatola, Dhaka", note: "" },
  { id: "demo-rcust-ret-005", name: "Roshni Khatun",   phone: "01751-400005", address: "Hazaribag, Dhaka", note: "Loyal customer since 2022" },
];

// ─── Product image URLs ────────────────────────────────────────────────────
// Confirmed-working CDN links.  Add remaining product IDs here when you have
// the URLs — re-run the seed and they will be applied via the DO UPDATE below.
const PRODUCT_IMAGES = {
  // ── Electronics: Walton (waltonbd.com CDN) ───────────────────────────────
  "demo-p-elec-001": "https://waltonbd.com/image/catalog/refrigerator-and-freezer/direct-cool-refrigerator/wfa-2b0-gdxx-xx/wfa-2b0-gdxx-xx.jpg",
  "demo-p-elec-002": "https://waltonbd.com/image/catalog/refrigerator-and-freezer/direct-cool-refrigerator/wfc-3d8-gdeh-dd-inverter/wfc-3d8-gdeh-dd-inverter-v7-id-1.jpg",
  "demo-p-elec-005": "https://waltonbd.com/image/catalog/air-conditioner/split-ac/12000-btu/wsi-riverine-12a/wsi-riverine-12a-new-front-id-image.jpg",
  "demo-p-elec-006": "https://waltonbd.com/image/catalog/air-conditioner/split-ac/18000-btu/wsi-riverine-18c-smart/wsi-riverine-18c-smart-new-id-image.jpg",
  "demo-p-elec-007": "https://waltonbd.com/image/catalog/air-conditioner/split-ac/24000-btu/wsi-inverna-supersaver-24h-plasma/wsi-inverna-supersaver-24h-plasma-front-id-img-new.jpg",
  "demo-p-elec-011": "https://waltonbd.com/image/catalog/tv/w32d210cs/w32d210cs%20revised.jpg",
  "demo-p-elec-012": "https://waltonbd.com/image/catalog/tv/w43s2fg/02.jpg",
  "demo-p-elec-013": "https://waltonbd.com/image/catalog/tv/w55s3bg/W55S3BG.jpg",
  "demo-p-elec-018": "https://waltonbd.com/image/catalog/washing-machine/automatic-top-load/wwm-q70/WWM-Q70.jpg",
  "demo-p-elec-019": "https://waltonbd.com/image/catalog/washing-machine/automatic-front-load/wmm-afi70t/01.jpg",
  "demo-p-elec-020": "https://waltonbd.com/image/catalog/fan/ceiling-fan-60/new/update/update/wcf5605-popular.jpg",
  // ── Electronics: LG (lg.com/bd CDN) ─────────────────────────────────────
  "demo-p-elec-003": "https://www.lg.com/bd/images/refrigerators/md07533043/gallery/D01.jpg",
  // ── Electronics: Samsung — TODO: add image URLs ──────────────────────────
  // "demo-p-elec-004": "",   // Samsung Fridge 420L
  // "demo-p-elec-016": "",   // Samsung TV 32" T4500
  // "demo-p-elec-017": "",   // Samsung QLED 55" Q70A
  // ── Electronics: Hitachi — TODO: add image URLs ──────────────────────────
  // "demo-p-elec-008": "",   // Hitachi AC 1T
  // "demo-p-elec-009": "",   // Hitachi AC 1.5T
  // ── Electronics: LG AC — TODO: add image URL ────────────────────────────
  // "demo-p-elec-010": "",   // LG Dual Cool AC 1T
  // ── Electronics: Sony — TODO: add image URLs ────────────────────────────
  // "demo-p-elec-014": "",   // Sony Bravia 32"
  // "demo-p-elec-015": "",   // Sony Bravia 43"
  // ── Grocery Wholesale — TODO: add image URLs ─────────────────────────────
  // "demo-p-groc-001": "",  "demo-p-groc-002": "",  "demo-p-groc-003": "",
  // "demo-p-groc-004": "",  "demo-p-groc-005": "",  "demo-p-groc-006": "",
  // "demo-p-groc-007": "",  "demo-p-groc-008": "",  "demo-p-groc-009": "",
  // "demo-p-groc-010": "",  "demo-p-groc-011": "",  "demo-p-groc-012": "",
  // "demo-p-groc-013": "",  "demo-p-groc-014": "",  "demo-p-groc-015": "",
  // "demo-p-groc-016": "",  "demo-p-groc-017": "",  "demo-p-groc-018": "",
  // "demo-p-groc-019": "",  "demo-p-groc-020": "",  "demo-p-groc-021": "",
  // "demo-p-groc-022": "",  "demo-p-groc-023": "",  "demo-p-groc-024": "",
  // ── Grocery Retail — TODO: add image URLs ────────────────────────────────
  // "demo-p-ret-001": "",  "demo-p-ret-002": "",  "demo-p-ret-003": "",
  // "demo-p-ret-004": "",  "demo-p-ret-005": "",  "demo-p-ret-006": "",
  // "demo-p-ret-007": "",  "demo-p-ret-008": "",  "demo-p-ret-009": "",
  // "demo-p-ret-010": "",  "demo-p-ret-011": "",  "demo-p-ret-012": "",
  // "demo-p-ret-013": "",  "demo-p-ret-014": "",  "demo-p-ret-015": "",
  // "demo-p-ret-016": "",  "demo-p-ret-017": "",  "demo-p-ret-018": "",
  // "demo-p-ret-019": "",  "demo-p-ret-020": "",
};

// ─── Serial number prefix map ──────────────────────────────────────────────
// Returns a realistic-looking serial prefix for each serial-required product.
const SERIAL_PREFIXES = {
  "demo-p-elec-005": "WLT-AC1T-BD23-",   // Walton AC 1T
  "demo-p-elec-006": "WLT-AC15T-BD23-",  // Walton AC 1.5T
  "demo-p-elec-007": "WLT-AC2T-BD23-",   // Walton AC 2T
  "demo-p-elec-008": "HIT-RA12-BD23-",   // Hitachi AC 1T
  "demo-p-elec-009": "HIT-RA18-BD23-",   // Hitachi AC 1.5T
  "demo-p-elec-010": "LGS4-W12-BD23-",   // LG AC 1T
};
function serialPrefix(productId) {
  return SERIAL_PREFIXES[productId] || `SN-${productId.slice(-6).toUpperCase()}-`;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const { env } = await import("../config/env.js");
  const db = new DatabaseManager(env.DATABASE_URL);
  const pool = db.getPool();

  console.log(`\nSeeding demo data into ${env.DATABASE_LABEL} database…\n`);

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  await pool.query("BEGIN");
  try {
    // ── 1. Tenants ──────────────────────────────────────────────────────────
    console.log("  [1/8] Tenants…");
    for (const t of TENANTS) {
      await pool.query(
        `INSERT INTO tenants (id, name, slug, email, plan, status, address)
         VALUES ($1,$2,$3,$4,$5,'active',$6)
         ON CONFLICT (id) DO NOTHING`,
        [t.id, t.name, t.slug, t.email, t.plan, t.address],
      );
    }

    // ── 2. Features ─────────────────────────────────────────────────────────
    console.log("  [2/8] Tenant features…");
    const elecFeatures    = [...DEALER_FEATURES, ...ELECTRONICS_EXTRA_FEATURES];
    const groceryFeatures = [...DEALER_FEATURES];
    const retailFeatures  = [...RETAIL_FEATURES];

    const featureRows = [
      ...elecFeatures.map((f) => [TENANT.elec, f]),
      ...groceryFeatures.map((f) => [TENANT.grocery, f]),
      ...retailFeatures.map((f) => [TENANT.retail, f]),
    ];
    for (const [tid, feat] of featureRows) {
      await pool.query(
        `INSERT INTO tenant_features (tenant_id, feature) VALUES ($1,$2)
         ON CONFLICT (tenant_id, feature) DO NOTHING`,
        [tid, feat],
      );
    }

    // ── 3. Admin users ──────────────────────────────────────────────────────
    console.log("  [3/8] Admin users…");
    for (const u of USERS_DATA) {
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, tenant_id, status)
         VALUES ($1,$2,$3,$4,$5,$6,'active')
         ON CONFLICT (id) DO NOTHING`,
        [u.id, u.name, u.email, passwordHash, u.role, u.tenantId],
      );
    }

    // ── 4. Categories ───────────────────────────────────────────────────────
    console.log("  [4/8] Categories…");
    const allCats = [
      ...ELEC_CATEGORIES.map((c) => ({ ...c, tid: TENANT.elec })),
      ...GROCERY_CATEGORIES.map((c) => ({ ...c, tid: TENANT.grocery })),
      ...RETAIL_CATEGORIES.map((c) => ({ ...c, tid: TENANT.retail })),
    ];
    for (const cat of allCats) {
      await pool.query(
        `INSERT INTO categories (id, tenant_id, name)
         VALUES ($1,$2,$3)
         ON CONFLICT (id) DO NOTHING`,
        [cat.id, cat.tid, cat.name],
      );
    }

    // ── 5. Products + opening stock movements ───────────────────────────────
    console.log("  [5/8] Products, stock & serials…");
    const allProducts = [
      ...ELEC_PRODUCTS.map((p) => ({ ...p, tid: TENANT.elec })),
      ...GROCERY_PRODUCTS.map((p) => ({ ...p, tid: TENANT.grocery })),
      ...RETAIL_PRODUCTS.map((p) => ({ ...p, tid: TENANT.retail })),
    ];

    for (const p of allProducts) {
      await pool.query(
        `INSERT INTO products (
           id, tenant_id, name, category_id,
           pieces_per_case, purchase_price, wholesale_price, retail_price,
           stock_pieces, brand, model, sku, description,
           serial_required, warranty_months, image_url, status, order_index
         ) VALUES (
           $1,$2,$3,$4,
           $5,$6,$7,$8,
           $9,$10,$11,$12,$13,
           $14,$15,$16,'ACTIVE',9999
         )
         ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url`,
        [
          p.id, p.tid, p.name, p.catId,
          p.ppc, p.pp, p.wp, p.rp,
          p.stock, p.brand, p.model || "", p.sku, p.desc,
          p.serial, p.warranty, PRODUCT_IMAGES[p.id] || null,
        ],
      );

      // Opening stock movement — keeps invariants consistent
      const movId = `demo-sm-${p.id}`;
      await pool.query(
        `INSERT INTO stock_movements (
           id, tenant_id, product_id, type,
           quantity_in, quantity_out, balance_after,
           reference_type, reference_id, note
         ) VALUES ($1,$2,$3,'MANUAL_ADJUSTMENT',$4,0,$4,'opening',NULL,'Opening stock')
         ON CONFLICT (id) DO NOTHING`,
        [movId, p.tid, p.id, p.stock],
      );

      // Serial-required products need one product_serials row per unit in stock
      if (p.serial) {
        const prefix = serialPrefix(p.id);
        for (let i = 1; i <= p.stock; i++) {
          const sn = `${prefix}${String(i).padStart(3, "0")}`;
          await pool.query(
            `INSERT INTO product_serials (id, tenant_id, product_id, serial_number, status)
             VALUES ($1,$2,$3,$4,'IN_STOCK')
             ON CONFLICT (id) DO NOTHING`,
            [`demo-ser-${p.id}-${i}`, p.tid, p.id, sn],
          );
        }
      }
    }

    // ── 6. Suppliers ────────────────────────────────────────────────────────
    console.log("  [6/8] Suppliers…");
    const allSuppliers = [
      ...ELEC_SUPPLIERS.map((s) => ({ ...s, tid: TENANT.elec })),
      ...GROCERY_SUPPLIERS.map((s) => ({ ...s, tid: TENANT.grocery })),
      ...RETAIL_SUPPLIERS.map((s) => ({ ...s, tid: TENANT.retail })),
    ];
    for (const s of allSuppliers) {
      await pool.query(
        `INSERT INTO suppliers (id, tenant_id, name, phone, address, status)
         VALUES ($1,$2,$3,$4,$5,'ACTIVE')
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.tid, s.name, s.phone, s.address],
      );
    }

    // ── 7. DSRs ─────────────────────────────────────────────────────────────
    console.log("  [7/8] DSRs…");
    const allDsrs = [
      ...ELEC_DSRS.map((d) => ({ ...d, tid: TENANT.elec })),
      ...GROCERY_DSRS.map((d) => ({ ...d, tid: TENANT.grocery })),
    ];
    for (const d of allDsrs) {
      await pool.query(
        `INSERT INTO dsrs (id, tenant_id, name, phone, area, status)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO NOTHING`,
        [d.id, d.tid, d.name, d.phone, d.area, d.status],
      );
    }

    // ── 8. Customers / shops & retail customers ─────────────────────────────
    console.log("  [8/8] Customers…");
    const allShops = [
      ...ELEC_CUSTOMERS.map((c) => ({ ...c, tid: TENANT.elec })),
      ...GROCERY_CUSTOMERS.map((c) => ({ ...c, tid: TENANT.grocery })),
    ];
    for (const c of allShops) {
      await pool.query(
        `INSERT INTO customers (
           id, tenant_id, shop_name, owner_name, phone, address, market,
           assigned_dsr_id, status
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ACTIVE')
         ON CONFLICT (id) DO NOTHING`,
        [c.id, c.tid, c.shopName, c.ownerName, c.phone, c.address, c.market, c.dsrId],
      );
    }

    for (const rc of RETAIL_CUSTOMERS) {
      await pool.query(
        `INSERT INTO retail_customers (id, tenant_id, name, phone, address, note, status)
         VALUES ($1,$2,$3,$4,$5,$6,'ACTIVE')
         ON CONFLICT (id) DO NOTHING`,
        [rc.id, TENANT.retail, rc.name, rc.phone, rc.address, rc.note],
      );
    }

    // ── Finance accounts (cash) for each tenant ─────────────────────────────
    for (const [tid, label] of [
      [TENANT.elec,    "Walton Electronics - Cash"],
      [TENANT.grocery, "Agro Fresh - Cash"],
      [TENANT.retail,  "Meena Bazar - Cash"],
    ]) {
      await pool.query(
        `INSERT INTO finance_accounts (id, tenant_id, type, name, balance)
         VALUES ($1,$2,'CASH',$3,0)
         ON CONFLICT (tenant_id, type) DO NOTHING`,
        [`demo-fa-cash-${tid}`, tid, label],
      );
    }

    await pool.query("COMMIT");
    console.log("\n✓ Demo seed complete.\n");

    console.log("Credentials (all passwords: Demo@1234):");
    for (const u of USERS_DATA) {
      const tenant = TENANTS.find((t) => t.id === u.tenantId);
      console.log(`  ${tenant.name.padEnd(28)} ${u.email}`);
    }
    console.log();

  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("\n✗ Seed failed — rolled back.\n", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
