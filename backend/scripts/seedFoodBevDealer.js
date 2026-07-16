/**
 * FoodBev Distribution demo seed — creates a single ready-to-demo food &
 * beverage FMCG dealer/distributor tenant (DSR model) by driving the exact
 * same service layer the app itself uses for every transactional flow.
 *
 * Unlike a raw-SQL seed, nothing here fabricates a ledger balance or a stock
 * level directly:
 *   - Products are created with zero stock (the product service refuses to
 *     accept an initial stockPieces on create) — every unit of stock in the
 *     tenant arrives through a real purchase-receive call to a supplier.
 *   - Trade promotion rules are created first, so the purchase-receive calls
 *     that follow trigger the real promotion engine and earn real
 *     trade_promotion_earnings rows, which are then settled (STOCK/CASH/
 *     CREDIT_NOTE) through the real settlement service.
 *   - DSR due, shop due, SR due, supplier due, and finance account balances
 *     are all produced as side effects of morning-issue / evening-settlement
 *     / payment / expense calls, exactly like a user clicking through the UI.
 *
 * Run (from backend/):
 *   node scripts/seedFoodBevDealer.js
 *
 * Always targets the DEV database (forces npm_lifecycle_event='dev' before
 * config/env.js is loaded) — never touches production, regardless of how
 * it's invoked. NOT safe to run twice against the same database — it exits
 * early with a message if the tenant already exists (real service calls
 * enforce their own uniqueness rules — e.g. "settlement already exists for
 * this DSR and date" — so partial-idempotency would be misleading rather
 * than helpful). If you need to re-seed, wipe the tenant's data first.
 *
 * Login: admin@foodbev.com / Foodbev@1234
 */

import dotenv from "dotenv";
import { backendRoot } from "../config/paths.js";
import { hashPassword } from "../lib/passwords.js";
import { USER_ROLES } from "../lib/roles.js";
import { BUSINESS_TYPES, SELLER_TYPES } from "../lib/businessTypes.js";
import { TENANT_BUSINESS_PERMISSIONS } from "../lib/permissions.js";
import { createId } from "../lib/ids.js";

dotenv.config({ path: `${backendRoot}/.env` });

// This script is for demo/dev use only — never let it run against production.
if (process.env.npm_lifecycle_event !== "dev" && process.env.npm_lifecycle_event !== "test") {
  process.env.npm_lifecycle_event = "dev";
}

const TENANT_NAME = "FoodBev Distribution";
const TENANT_SLUG = "foodbev-distribution";
const TENANT_ADDRESS = "Warehouse 7, Postogola Industrial Area, Jatrabari, Dhaka-1204";
const TENANT_PHONE = "01700-000001";
const ADMIN_EMAIL = "admin@foodbev.com";
const ADMIN_PASSWORD = "Foodbev@1234";
const ADMIN_NAME = "Jashim Uddin (FoodBev Admin)";

// Curated to match exactly the menu set confirmed for this dealer persona —
// pure DSR distribution + purchases + trade promotions + finance + HR, no
// retail POS / warranty / accounting-module surface.
const FEATURES = [
  "dashboard",
  "products", "stock-movement", "low-stock-alerts", "damaged-stock",
  "dsrs", "customers", "morning-issue", "settlements", "dsr-finance",
  "shop-due-ledger", "srs", "sr-due-ledger",
  "suppliers", "purchase-receive", "purchase-returns", "supplier-payments", "supplier-discounts", "supplier-statement",
  "trade-promotions",
  "finance-dashboard", "finance-accounts", "expenses", "profit",
  "reports", "history", "activity-logs", "issue-center",
  "departments", "designations", "employees", "salary-payments",
  "user-management", "permissions", "trash", "database-backup",
  "my-profile", "security", "help-desk", "org-settings",
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ─── Categories ─────────────────────────────────────────────────────────────

const CATEGORY_NAMES = [
  "Rice & Grains", "Cooking Oil & Ghee", "Spices & Seasonings", "Sugar & Salt",
  "Pulses & Dal", "Soft Drinks & Juices", "Dairy & Milk Products",
  "Biscuits & Snacks", "Noodles & Instant Food", "Tea & Coffee",
];

// ─── Suppliers ──────────────────────────────────────────────────────────────
// Keyed S1..S6 so PRODUCTS below can reference them without repeating names.

const SUPPLIERS = {
  S1: { name: "PRAN-RFL Group", phone: "02-7793007", address: "PRAN Centre, 105 Bir Uttam Rafiqul Islam Ave, Dhaka-1206" },
  S2: { name: "ACI Limited", phone: "02-9887091", address: "245 Tejgaon I/A, Dhaka-1208" },
  S3: { name: "Meghna Group of Industries", phone: "02-9566026", address: "Meghna Industrial Zone, Rupganj, Narayanganj" },
  S4: { name: "Teer Brand (City Group)", phone: "01711-200001", address: "City House, 20 Rajuk Avenue, Dhaka-1000" },
  S5: { name: "Olympic Industries Ltd", phone: "02-7812101", address: "Goaltek Depot, Rupganj, Narayanganj" },
  S6: { name: "Coca-Cola Bottling Bangladesh", phone: "01811-200002", address: "Bhaluka Industrial Area, Mymensingh" },
};

// ─── Products ───────────────────────────────────────────────────────────────
// qty = how many pieces will be purchased from `sup` to bring in opening
// stock (there is no other way for stock to appear — see header comment).

const PRODUCTS = [
  // ── Rice & Grains ─────────────────────────────────────────────────────────
  { cat: "Rice & Grains", name: "Miniket Rice 50kg (Bag)", brand: "Local", sku: "FB-RICE-MK50", ppc: 1, pp: 2600, wp: 2800, rp: 2950, qty: 150, reorder: 40, desc: "Premium Miniket white rice, 50kg sack.", sup: "S4" },
  { cat: "Rice & Grains", name: "Nazirshail Rice 50kg (Bag)", brand: "Local", sku: "FB-RICE-NZ50", ppc: 1, pp: 3000, wp: 3200, rp: 3400, qty: 100, reorder: 30, desc: "Fragrant Nazirshail rice, 50kg sack.", sup: "S4" },
  { cat: "Rice & Grains", name: "BRRI-28 Rice 50kg (Bag)", brand: "Local", sku: "FB-RICE-BR2850", ppc: 1, pp: 2400, wp: 2600, rp: 2750, qty: 120, reorder: 35, desc: "Everyday BRRI-28 coarse rice, 50kg sack.", sup: "S4" },
  { cat: "Rice & Grains", name: "PRAN Basmati Rice 5kg", brand: "PRAN", sku: "FB-RICE-BAS5", ppc: 6, pp: 250, wp: 280, rp: 310, qty: 300, reorder: 80, desc: "PRAN long-grain basmati rice, 5kg pack.", sup: "S1" },
  { cat: "Rice & Grains", name: "Chinigura Rice 1kg", brand: "Local", sku: "FB-RICE-CHG1", ppc: 12, pp: 95, wp: 108, rp: 120, qty: 360, reorder: 90, desc: "Aromatic Chinigura rice, 1kg pack.", sup: "S4" },
  { cat: "Rice & Grains", name: "Teer Atta (Wheat Flour) 10kg", brand: "Teer", sku: "FB-ATTA-TR10", ppc: 2, pp: 450, wp: 490, rp: 520, qty: 200, reorder: 50, desc: "Teer whole-wheat flour, 10kg bag.", sup: "S4" },
  { cat: "Rice & Grains", name: "Fresh Maida (Refined Flour) 10kg", brand: "Fresh", sku: "FB-MAIDA-FR10", ppc: 2, pp: 460, wp: 500, rp: 530, qty: 150, reorder: 40, desc: "Fresh refined flour for bakery use, 10kg bag.", sup: "S3" },

  // ── Cooking Oil & Ghee ────────────────────────────────────────────────────
  { cat: "Cooking Oil & Ghee", name: "Teer Soybean Oil 5L", brand: "Teer", sku: "FB-OIL-TER5", ppc: 4, pp: 680, wp: 740, rp: 780, qty: 450, reorder: 100, desc: "Teer refined soybean oil, 5-litre jar.", sup: "S4" },
  { cat: "Cooking Oil & Ghee", name: "PRAN Soybean Oil 1L", brand: "PRAN", sku: "FB-OIL-PRN1", ppc: 12, pp: 150, wp: 165, rp: 178, qty: 700, reorder: 150, desc: "PRAN refined soybean oil, 1-litre bottle.", sup: "S1" },
  { cat: "Cooking Oil & Ghee", name: "Rupchanda Soybean Oil 5L", brand: "Rupchanda", sku: "FB-OIL-RUP5", ppc: 4, pp: 690, wp: 750, rp: 790, qty: 400, reorder: 100, desc: "Rupchanda fortified soybean oil, 5-litre jar.", sup: "S2" },
  { cat: "Cooking Oil & Ghee", name: "Meghna Soybean Oil 5L", brand: "Meghna", sku: "FB-OIL-MGN5", ppc: 4, pp: 670, wp: 730, rp: 770, qty: 350, reorder: 90, desc: "Meghna fresh soybean oil, 5-litre jar.", sup: "S3" },
  { cat: "Cooking Oil & Ghee", name: "Pran Mustard Oil 1L", brand: "PRAN", sku: "FB-OIL-MST1", ppc: 12, pp: 185, wp: 205, rp: 225, qty: 420, reorder: 100, desc: "PRAN cold-pressed mustard oil, 1-litre.", sup: "S1" },
  { cat: "Cooking Oil & Ghee", name: "Fresh Ghee (Pure) 1kg", brand: "Fresh", sku: "FB-GHEE-FR1", ppc: 6, pp: 850, wp: 920, rp: 980, qty: 120, reorder: 30, desc: "Pure cow ghee, 1kg tin.", sup: "S5" },

  // ── Spices & Seasonings ───────────────────────────────────────────────────
  { cat: "Spices & Seasonings", name: "Radhuni Turmeric Powder 200g", brand: "Radhuni", sku: "FB-SPC-TUR200", ppc: 24, pp: 45, wp: 55, rp: 63, qty: 800, reorder: 150, desc: "Radhuni pure turmeric powder, 200g pack.", sup: "S2" },
  { cat: "Spices & Seasonings", name: "Radhuni Cumin Powder 200g", brand: "Radhuni", sku: "FB-SPC-CUM200", ppc: 24, pp: 55, wp: 65, rp: 73, qty: 700, reorder: 150, desc: "Radhuni ground cumin powder, 200g pack.", sup: "S2" },
  { cat: "Spices & Seasonings", name: "ACI Pure Turmeric 200g", brand: "ACI", sku: "FB-SPC-ACITUR", ppc: 24, pp: 48, wp: 58, rp: 66, qty: 600, reorder: 120, desc: "ACI triple-tested pure turmeric, 200g.", sup: "S2" },
  { cat: "Spices & Seasonings", name: "Radhuni Coriander Powder 200g", brand: "Radhuni", sku: "FB-SPC-COR200", ppc: 24, pp: 42, wp: 52, rp: 59, qty: 560, reorder: 120, desc: "Radhuni coriander powder, 200g pack.", sup: "S2" },
  { cat: "Spices & Seasonings", name: "Radhuni Red Chilli Powder 200g", brand: "Radhuni", sku: "FB-SPC-CHL200", ppc: 24, pp: 50, wp: 60, rp: 68, qty: 650, reorder: 130, desc: "Radhuni red chilli powder, 200g pack.", sup: "S2" },
  { cat: "Spices & Seasonings", name: "Pran Garam Masala 100g", brand: "PRAN", sku: "FB-SPC-GRM100", ppc: 24, pp: 60, wp: 72, rp: 82, qty: 400, reorder: 90, desc: "PRAN blended garam masala, 100g pack.", sup: "S1" },

  // ── Sugar & Salt ──────────────────────────────────────────────────────────
  { cat: "Sugar & Salt", name: "Meghna Sugar 1kg", brand: "Meghna", sku: "FB-SGR-MGN1", ppc: 24, pp: 112, wp: 125, rp: 135, qty: 1400, reorder: 250, desc: "Meghna refined white sugar, 1kg packet.", sup: "S3" },
  { cat: "Sugar & Salt", name: "ACI Iodized Salt 1kg", brand: "ACI", sku: "FB-SLT-ACI1", ppc: 24, pp: 35, wp: 42, rp: 49, qty: 1600, reorder: 300, desc: "ACI iodized table salt, 1kg packet.", sup: "S2" },
  { cat: "Sugar & Salt", name: "Molla Salt 1kg", brand: "Molla", sku: "FB-SLT-MOL1", ppc: 24, pp: 30, wp: 38, rp: 45, qty: 1000, reorder: 200, desc: "Molla refined iodized salt, 1kg pack.", sup: "S5" },
  { cat: "Sugar & Salt", name: "Fresh Sugar 1kg", brand: "Fresh", sku: "FB-SGR-FR1", ppc: 24, pp: 110, wp: 122, rp: 132, qty: 900, reorder: 200, desc: "Fresh brand refined white sugar, 1kg packet.", sup: "S4" },

  // ── Pulses & Dal ──────────────────────────────────────────────────────────
  { cat: "Pulses & Dal", name: "ACI Moosur Dal 1kg", brand: "ACI", sku: "FB-DAL-MSR1", ppc: 12, pp: 90, wp: 100, rp: 112, qty: 700, reorder: 150, desc: "ACI red lentils (moosur dal), 1kg pack.", sup: "S2" },
  { cat: "Pulses & Dal", name: "PRAN Mung Dal 500g", brand: "PRAN", sku: "FB-DAL-MNG500", ppc: 24, pp: 75, wp: 85, rp: 96, qty: 560, reorder: 120, desc: "PRAN green mung dal, 500g packet.", sup: "S1" },
  { cat: "Pulses & Dal", name: "Chola Dal (Chickpea) 1kg", brand: "Local", sku: "FB-DAL-CHL1", ppc: 12, pp: 95, wp: 110, rp: 122, qty: 400, reorder: 90, desc: "Split chickpea dal (chola dal), 1kg pack.", sup: "S3" },
  { cat: "Pulses & Dal", name: "Motor Dal (Split Pea) 1kg", brand: "Local", sku: "FB-DAL-MTR1", ppc: 12, pp: 80, wp: 92, rp: 104, qty: 360, reorder: 80, desc: "Split yellow pea dal, 1kg pack.", sup: "S4" },
  { cat: "Pulses & Dal", name: "Anchor Dal (Red Lentil) 1kg", brand: "Anchor", sku: "FB-DAL-ANC1", ppc: 12, pp: 92, wp: 102, rp: 114, qty: 420, reorder: 90, desc: "Anchor brand red lentils, 1kg pack.", sup: "S5" },

  // ── Soft Drinks & Juices ──────────────────────────────────────────────────
  { cat: "Soft Drinks & Juices", name: "RC Cola 250ml (24pcs Crate)", brand: "RC Cola", sku: "FB-BEV-RC250", ppc: 24, pp: 12, wp: 15, rp: 19, qty: 2800, reorder: 400, desc: "RC Cola carbonated drink, 250ml can.", sup: "S6" },
  { cat: "Soft Drinks & Juices", name: "Coca-Cola 250ml Can (24pcs)", brand: "Coca-Cola", sku: "FB-BEV-CC250", ppc: 24, pp: 35, wp: 42, rp: 50, qty: 1600, reorder: 300, desc: "Coca-Cola classic, 250ml can.", sup: "S6" },
  { cat: "Soft Drinks & Juices", name: "PRAN Frooto Mango 250ml", brand: "PRAN", sku: "FB-BEV-FRT250", ppc: 24, pp: 15, wp: 18, rp: 23, qty: 1800, reorder: 350, desc: "PRAN Frooto mango juice drink, 250ml.", sup: "S1" },
  { cat: "Soft Drinks & Juices", name: "Pran Mango Juice 1L (Tetra)", brand: "PRAN", sku: "FB-BEV-MNG1L", ppc: 12, pp: 65, wp: 75, rp: 88, qty: 900, reorder: 180, desc: "PRAN mango juice in 1-litre tetra pack.", sup: "S1" },
  { cat: "Soft Drinks & Juices", name: "Sprite 250ml Can (24pcs)", brand: "Sprite", sku: "FB-BEV-SPR250", ppc: 24, pp: 35, wp: 42, rp: 50, qty: 1200, reorder: 250, desc: "Sprite lemon-lime soda, 250ml can.", sup: "S6" },
  { cat: "Soft Drinks & Juices", name: "ACI Pure Drinking Water 1L (12pcs)", brand: "ACI", sku: "FB-BEV-ACIW1L", ppc: 12, pp: 10, wp: 13, rp: 16, qty: 2400, reorder: 400, desc: "ACI purified drinking water, 1-litre bottle.", sup: "S2" },
  { cat: "Soft Drinks & Juices", name: "Fanta 250ml Can (24pcs)", brand: "Fanta", sku: "FB-BEV-FAN250", ppc: 24, pp: 35, wp: 42, rp: 50, qty: 1100, reorder: 250, desc: "Fanta orange soda, 250ml can.", sup: "S6" },

  // ── Dairy & Milk Products ─────────────────────────────────────────────────
  { cat: "Dairy & Milk Products", name: "Aarong UHT Milk 1L", brand: "Aarong", sku: "FB-MLK-ARG1", ppc: 12, pp: 90, wp: 100, rp: 118, qty: 500, reorder: 100, desc: "Aarong full-fat UHT milk, 1-litre tetra.", sup: "S4" },
  { cat: "Dairy & Milk Products", name: "Farm Fresh Milk 500ml", brand: "Farm Fresh", sku: "FB-MLK-FF5", ppc: 12, pp: 48, wp: 55, rp: 66, qty: 400, reorder: 80, desc: "Farm Fresh pasteurised milk, 500ml.", sup: "S5" },
  { cat: "Dairy & Milk Products", name: "Marks Condensed Milk 400g (Tin)", brand: "Marks", sku: "FB-MLK-MRKCND", ppc: 24, pp: 95, wp: 108, rp: 122, qty: 500, reorder: 100, desc: "Marks sweetened condensed milk, 400g tin.", sup: "S2" },
  { cat: "Dairy & Milk Products", name: "Danish Full Cream Milk Powder 500g", brand: "Danish", sku: "FB-MLK-DAN500", ppc: 12, pp: 380, wp: 410, rp: 450, qty: 300, reorder: 320, desc: "Danish full cream instant milk powder, 500g.", sup: "S3" },
  { cat: "Dairy & Milk Products", name: "Pran Yogurt (Mishti Doi) 400g", brand: "PRAN", sku: "FB-MLK-YOG400", ppc: 12, pp: 70, wp: 80, rp: 92, qty: 280, reorder: 70, desc: "PRAN sweetened yogurt (mishti doi), 400g cup.", sup: "S1" },

  // ── Biscuits & Snacks ─────────────────────────────────────────────────────
  { cat: "Biscuits & Snacks", name: "Olympic Banana Chips 150g", brand: "Olympic", sku: "FB-SNK-BAN150", ppc: 24, pp: 28, wp: 35, rp: 44, qty: 960, reorder: 180, desc: "Olympic crispy banana chips, 150g pack.", sup: "S5" },
  { cat: "Biscuits & Snacks", name: "PRAN Chanachur Hot 300g", brand: "PRAN", sku: "FB-SNK-CHN300", ppc: 24, pp: 32, wp: 40, rp: 50, qty: 800, reorder: 160, desc: "PRAN spicy chanachur snack mix, 300g pack.", sup: "S1" },
  { cat: "Biscuits & Snacks", name: "Hacks Biscuit Cream 100g", brand: "Hacks", sku: "FB-SNK-BCT100", ppc: 48, pp: 18, wp: 22, rp: 29, qty: 1500, reorder: 300, desc: "Hacks cream sandwich biscuit, 100g pack.", sup: "S2" },
  { cat: "Biscuits & Snacks", name: "Olympic Marie Biscuit 200g", brand: "Olympic", sku: "FB-SNK-MR200", ppc: 24, pp: 28, wp: 33, rp: 41, qty: 700, reorder: 150, desc: "Olympic Marie biscuit, 200g pack.", sup: "S5" },
  { cat: "Biscuits & Snacks", name: "Nabisco Nice Biscuit 250g", brand: "Nabisco", sku: "FB-SNK-NC250", ppc: 24, pp: 32, wp: 38, rp: 47, qty: 650, reorder: 140, desc: "Nabisco coconut-flavoured Nice biscuit, 250g.", sup: "S3" },
  { cat: "Biscuits & Snacks", name: "Pran Potato Crackers 100g", brand: "PRAN", sku: "FB-SNK-POT100", ppc: 24, pp: 20, wp: 25, rp: 32, qty: 900, reorder: 180, desc: "PRAN crispy potato crackers, 100g pack.", sup: "S1" },
  { cat: "Biscuits & Snacks", name: "Bombay Sweets Toast Biscuit 350g", brand: "Bombay Sweets", sku: "FB-SNK-TST350", ppc: 24, pp: 45, wp: 53, rp: 63, qty: 500, reorder: 110, desc: "Bombay Sweets crunchy toast biscuit, 350g pack.", sup: "S4" },

  // ── Noodles & Instant Food ────────────────────────────────────────────────
  { cat: "Noodles & Instant Food", name: "Mama Instant Noodles (Chicken) 65g", brand: "Mama", sku: "FB-NOD-MAMCHK65", ppc: 40, pp: 12, wp: 15, rp: 19, qty: 2200, reorder: 400, desc: "Mama chicken-flavour instant noodles, 65g pack.", sup: "S6" },
  { cat: "Noodles & Instant Food", name: "PRAN Chotpoti Mix 200g", brand: "PRAN", sku: "FB-NOD-CHOT200", ppc: 24, pp: 45, wp: 53, rp: 63, qty: 450, reorder: 100, desc: "PRAN ready chotpoti mix, 200g pack.", sup: "S1" },
  { cat: "Noodles & Instant Food", name: "Mr. Noodles Instant Cup 70g", brand: "Mr. Noodles", sku: "FB-NOD-CUP70", ppc: 24, pp: 30, wp: 36, rp: 44, qty: 800, reorder: 160, desc: "Mr. Noodles instant cup noodles, 70g.", sup: "S2" },
  { cat: "Noodles & Instant Food", name: "Pran Instant Khichuri Mix 350g", brand: "PRAN", sku: "FB-NOD-KHI350", ppc: 24, pp: 75, wp: 88, rp: 102, qty: 350, reorder: 80, desc: "PRAN ready-to-cook khichuri mix, 350g pack.", sup: "S1" },
  { cat: "Noodles & Instant Food", name: "Sajeeb Vermicelli (Shemai) 200g", brand: "Sajeeb", sku: "FB-NOD-SHEMAI200", ppc: 24, pp: 35, wp: 42, rp: 50, qty: 600, reorder: 130, desc: "Sajeeb roasted vermicelli (shemai), 200g pack.", sup: "S3" },

  // ── Tea & Coffee ──────────────────────────────────────────────────────────
  { cat: "Tea & Coffee", name: "Ispahani Mirzapore Tea 400g", brand: "Ispahani", sku: "FB-TEA-MIRZA400", ppc: 24, pp: 180, wp: 205, rp: 230, qty: 700, reorder: 150, desc: "Ispahani Mirzapore blended black tea, 400g pack.", sup: "S4" },
  { cat: "Tea & Coffee", name: "Kazi & Kazi Organic Tea 100g", brand: "Kazi & Kazi", sku: "FB-TEA-KZORG100", ppc: 24, pp: 95, wp: 110, rp: 128, qty: 450, reorder: 100, desc: "Certified organic black tea, 100g pack.", sup: "S5" },
  { cat: "Tea & Coffee", name: "Nescafe Classic Coffee 50g (Jar)", brand: "Nescafe", sku: "FB-TEA-NESC50", ppc: 24, pp: 210, wp: 235, rp: 260, qty: 380, reorder: 400, desc: "Nescafe Classic instant coffee, 50g jar.", sup: "S2" },
  { cat: "Tea & Coffee", name: "Ispahani Tea Bag (100pcs Box)", brand: "Ispahani", sku: "FB-TEA-BAG100", ppc: 12, pp: 220, wp: 250, rp: 280, qty: 300, reorder: 70, desc: "Ispahani tagged tea bags, box of 100.", sup: "S4" },
  { cat: "Tea & Coffee", name: "Pran Green Tea 25 Bags", brand: "PRAN", sku: "FB-TEA-GRN25", ppc: 24, pp: 85, wp: 98, rp: 112, qty: 400, reorder: 90, desc: "PRAN green tea, box of 25 bags.", sup: "S1" },
];

// ─── DSRs (Delivery Sales Reps) ─────────────────────────────────────────────

const DSRS = [
  { name: "Md. Alamgir Hossain", phone: "01712-010001", area: "Mirpur 1-14" },
  { name: "Jashim Uddin Ahmed", phone: "01812-010002", area: "Mohammadpur & Adabor" },
  { name: "Habibur Rahman", phone: "01912-010003", area: "Uttara & Turag" },
  { name: "Shafiqul Islam", phone: "01612-010004", area: "Badda & Rampura" },
];

// ─── SRs (route/area supervisors who receive cash handovers from DSRs) ─────

const SRS = [
  { name: "Rafiqul Islam (SR)", phone: "01722-020001" },
  { name: "Nasima Begum (SR)", phone: "01822-020002" },
];

// ─── Customer shops (assigned to DSRs) ──────────────────────────────────────

const CUSTOMERS = [
  { shopName: "Karim General Store", ownerName: "Abdul Karim", phone: "01711-600001", address: "Shop 5, Mirpur-1 Bazar", market: "Mirpur-1 Market", dsr: 0, openingDue: 4500 },
  { shopName: "Lucky Grocery Mart", ownerName: "Nurul Islam", phone: "01811-600002", address: "16 Mohammadpur Town Hall Rd", market: "Mohammadpur Bazar", dsr: 1, openingDue: 3200 },
  { shopName: "Salam Traders", ownerName: "Abdus Salam", phone: "01911-600003", address: "Sector-4, Uttara", market: "Uttara Market", dsr: 2, openingDue: 2800 },
  { shopName: "Al-Amin Super Shop", ownerName: "Al-Amin Khan", phone: "01611-600004", address: "Merul Badda, Badda", market: "Badda Bazar", dsr: 3, openingDue: 0 },
  { shopName: "Hasan Provision Store", ownerName: "Md. Hasan", phone: "01751-600005", address: "Pirerbag, Mirpur-2", market: "Mirpur-2 Market", dsr: 0, openingDue: 0 },
  { shopName: "Bismillah Grocery", ownerName: "Kadir Mia", phone: "01851-600006", address: "Shyamoli Road, Mohammadpur", market: "Shyamoli Market", dsr: 1, openingDue: 0 },
  { shopName: "Rupali Store", ownerName: "Habibur Rahman Jr.", phone: "01951-600007", address: "Sector-7, Uttara", market: "Uttara Market", dsr: 2, openingDue: 0 },
  { shopName: "Star Family Mart", ownerName: "Rafiq Ahmed", phone: "01651-600008", address: "Badda Link Road, Dhaka", market: "Badda Bazar", dsr: 3, openingDue: 0 },
];

// ─── HR ─────────────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  { name: "Sales & Distribution", code: "SLD" },
  { name: "Warehouse", code: "WHS" },
  { name: "Accounts & Finance", code: "ACF" },
];

const DESIGNATIONS = [
  { name: "DSR Supervisor", code: "DSRSUP" },
  { name: "Warehouse Manager", code: "WHMGR" },
  { name: "Accounts Officer", code: "ACOFF" },
];

const EMPLOYEES = [
  { name: "Mahmudul Hasan", phone: "01777-700001", department: 0, designation: 0, salaryAmount: 25000 },
  { name: "Kamrul Islam", phone: "01777-700002", department: 1, designation: 1, salaryAmount: 30000 },
  { name: "Farzana Yasmin", phone: "01777-700003", department: 2, designation: 2, salaryAmount: 22000 },
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
  const { platform, finance, catalog, customers: customersReg, field, suppliers: suppliersReg, operations, hr, tradePromotions } = registry;

  console.log(`\nSeeding FoodBev Distribution demo into ${env.DATABASE_LABEL} database via the real service layer…\n`);

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
      businessType: BUSINESS_TYPES.GROCERY,
      sellerType: SELLER_TYPES.DEALER,
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

  // ── 3. Products (zero stock — stock only ever arrives via purchase) ─────
  console.log(`  [3/18] Products (${PRODUCTS.length}, zero opening stock)…`);
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
    }, actor);
    productIdBySku.set(p.sku, product.id);
  }

  // ── 4. Suppliers ─────────────────────────────────────────────────────────
  console.log("  [4/18] Suppliers…");
  const supplierIdByKey = new Map();
  for (const [key, s] of Object.entries(SUPPLIERS)) {
    const supplier = await suppliersReg.supplierService.saveSupplier({ name: s.name, phone: s.phone, address: s.address }, actor);
    supplierIdByKey.set(key, supplier.id);
  }

  // ── 5. DSRs ──────────────────────────────────────────────────────────────
  console.log("  [5/18] DSRs…");
  const dsrIds = [];
  for (const d of DSRS) {
    const dsr = await field.dsrService.saveDsr({ name: d.name, phone: d.phone, area: d.area, status: "Active" }, actor);
    dsrIds.push(dsr.id);
  }

  // ── 6. SRs ───────────────────────────────────────────────────────────────
  console.log("  [6/18] SRs…");
  const srIds = [];
  for (const s of SRS) {
    const sr = await field.srService.saveSr({ name: s.name, phone: s.phone, status: "Active" }, actor);
    srIds.push(sr.id);
  }

  // ── 7. Customer shops ────────────────────────────────────────────────────
  console.log("  [7/18] Customer shops…");
  const customerIdByShopName = new Map();
  for (const c of CUSTOMERS) {
    const customer = await customersReg.customerService.saveCustomer({
      shopName: c.shopName,
      ownerName: c.ownerName,
      phone: c.phone,
      address: c.address,
      market: c.market,
      assignedDsrId: dsrIds[c.dsr],
      openingDue: c.openingDue,
      status: "ACTIVE",
    }, actor);
    customerIdByShopName.set(c.shopName, customer.id);
  }

  // ── 8. Trade promotion rules (created before purchases so the promotion
  //      engine has active rules to evaluate against them) ─────────────────
  console.log("  [8/18] Trade promotion rules…");
  const promoOilRule = await tradePromotions.tradePromotionRuleService.createRule({
    name: "PRAN Soybean Oil 1L — Case Bonus",
    remarks: "Buy 200 pieces of PRAN Soybean Oil 1L from PRAN-RFL Group, get 1 free case (12pcs) as stock.",
    supplierScope: "SPECIFIC",
    supplierId: supplierIdByKey.get("S1"),
    targetType: "PRODUCT",
    targetId: productIdBySku.get("FB-OIL-PRN1"),
    buyUnit: "PIECE",
    buyQuantity: 200,
    rewardType: "FREE_QUANTITY",
    rewardUnit: "PIECE",
    rewardQuantity: 12,
    settlementMethod: "STOCK",
    effectiveFrom: daysAgo(60),
    active: true,
  }, actor);

  const promoAciRule = await tradePromotions.tradePromotionRuleService.createRule({
    name: "ACI Volume Cashback",
    remarks: "2% cash back for every 1,000 pieces purchased from ACI Limited (any product).",
    supplierScope: "SPECIFIC",
    supplierId: supplierIdByKey.get("S2"),
    targetType: "ALL",
    buyUnit: "PIECE",
    buyQuantity: 1000,
    rewardType: "PERCENTAGE",
    rewardPercentage: 2,
    settlementMethod: "CASH",
    effectiveFrom: daysAgo(60),
    active: true,
  }, actor);

  const promoCocaColaRule = await tradePromotions.tradePromotionRuleService.createRule({
    name: "Coca-Cola Bulk Credit",
    remarks: "৳500 supplier credit note for every 1,000 pieces purchased from Coca-Cola Bottling Bangladesh.",
    supplierScope: "SPECIFIC",
    supplierId: supplierIdByKey.get("S6"),
    targetType: "ALL",
    buyUnit: "PIECE",
    buyQuantity: 1000,
    rewardType: "FIXED_AMOUNT",
    rewardAmount: 500,
    settlementMethod: "CREDIT_NOTE",
    effectiveFrom: daysAgo(60),
    active: true,
  }, actor);

  // ── 9. Owner's capital injection — every WITHDRAWAL below (purchase
  //      down-payments, salaries, expenses) is asserted against a real
  //      account balance, so cash has to exist before anything spends it. ──
  console.log("  [9/18] Owner's capital injection…");
  await finance.financeAccountService.recordTransaction({
    accountType: "CASH", type: "DEPOSIT", amount: 2000000, date: daysAgo(8),
    note: "Owner's capital injection — opening cash balance",
  }, actor);
  await finance.financeAccountService.recordTransaction({
    accountType: "BANK", type: "DEPOSIT", amount: 1500000, date: daysAgo(8),
    note: "Owner's capital injection — opening bank balance",
  }, actor);

  // ── 10. Purchase receipts — one per supplier, bringing every product's
  //       stock in for real (this is the ONLY place stock_pieces moves off
  //       zero), and — for suppliers S1/S2/S6 — triggering the trade
  //       promotion rules above via the real engine. ─────────────────────
  console.log("  [10/18] Purchase receipts (stock arrives here, per supplier)…");
  const productsBySupplierKey = new Map();
  for (const p of PRODUCTS) {
    const list = productsBySupplierKey.get(p.sup) || [];
    list.push(p);
    productsBySupplierKey.set(p.sup, list);
  }

  const paymentMethodByKey = { S1: "CASH", S2: "BANK", S3: "CASH", S4: "BANK", S5: "CASH", S6: "BANK" };
  const purchaseBySupplierKey = new Map();
  let purchaseInvoiceCounter = 1000;

  for (const [key, s] of Object.entries(SUPPLIERS)) {
    const items = (productsBySupplierKey.get(key) || []).map((p) => ({
      productId: productIdBySku.get(p.sku),
      productName: p.name,
      quantityPieces: p.qty,
      purchasePrice: p.pp,
    }));
    if (!items.length) continue;

    const totalAmount = items.reduce((sum, item) => sum + item.quantityPieces * item.purchasePrice, 0);
    const paidAmount = Math.round(totalAmount * 0.4);

    const purchase = await suppliersReg.purchaseReceiveService.savePurchaseReceipt({
      supplierId: supplierIdByKey.get(key),
      supplierInvoiceNo: `INV-${purchaseInvoiceCounter++}`,
      purchaseDate: daysAgo(7),
      items,
      discount: 0,
      paidAmount,
      paymentMethod: paymentMethodByKey[key],
      note: `Opening stock purchase from ${s.name}`,
    }, actor);
    purchaseBySupplierKey.set(key, purchase);
  }

  // ── 11. Trade promotion settlements — settle each earning the purchases
  //       above just created, one per method (STOCK / CASH / CREDIT_NOTE). ─
  console.log("  [11/18] Trade promotion settlements…");
  const earningsPage = await tradePromotions.tradePromotionEngineService.listEarnings({ pageSize: 50 }, actor);
  const earnings = earningsPage.items || [];

  const oilEarning = earnings.find((e) => e.ruleId === promoOilRule.id);
  if (oilEarning) {
    await tradePromotions.tradePromotionSettlementService.createSettlement({
      earningId: oilEarning.id,
      method: "STOCK",
      settlementDate: daysAgo(5),
      quantityPieces: oilEarning.earnedQuantityPieces,
      note: "Free stock collected from PRAN-RFL Group depot",
    }, actor);
  }

  const aciEarning = earnings.find((e) => e.ruleId === promoAciRule.id);
  if (aciEarning) {
    await tradePromotions.tradePromotionSettlementService.createSettlement({
      earningId: aciEarning.id,
      method: "CASH",
      settlementDate: daysAgo(5),
      amount: aciEarning.earnedAmount,
      financeAccountType: "CASH",
      note: "ACI volume cashback received",
    }, actor);
  }

  const cocaColaEarning = earnings.find((e) => e.ruleId === promoCocaColaRule.id);
  if (cocaColaEarning) {
    await tradePromotions.tradePromotionSettlementService.createSettlement({
      earningId: cocaColaEarning.id,
      method: "CREDIT_NOTE",
      settlementDate: daysAgo(5),
      amount: cocaColaEarning.earnedAmount,
      note: "Coca-Cola bulk credit applied against supplier due",
    }, actor);
  }

  // ── 12. Extra supplier payment (beyond the down-payment already made
  //       at purchase time) ────────────────────────────────────────────────
  console.log("  [12/18] Extra supplier payment…");
  await suppliersReg.supplierPaymentService.saveSupplierPayment({
    supplierId: supplierIdByKey.get("S1"),
    paymentDate: daysAgo(4),
    amount: 50000,
    paymentMethod: "CASH",
    note: "Additional payment towards PRAN-RFL Group outstanding due",
  }, actor);

  // ── 13. Purchase return — a small quality-issue return against the Teer
  //       purchase ───────────────────────────────────────────────────────
  console.log("  [13/18] Purchase return…");
  await suppliersReg.purchaseReturnService.savePurchaseReturn({
    supplierId: supplierIdByKey.get("S4"),
    returnDate: daysAgo(4),
    items: [{ productId: productIdBySku.get("FB-RICE-MK50"), quantityPieces: 5 }],
    note: "5 bags of Miniket Rice 50kg returned — torn packaging",
  }, actor);

  // ── 14. DSR morning issue → evening settlement, one full day per DSR ────
  console.log("  [14/18] DSR morning issue + evening settlement cycles…");

  const dsrCycles = [
    {
      dsrIndex: 0, date: daysAgo(3),
      issueItems: [
        { sku: "FB-RICE-MK50", pieces: 10 }, { sku: "FB-OIL-PRN1", pieces: 48 },
        { sku: "FB-BEV-RC250", pieces: 96 }, { sku: "FB-SNK-BCT100", pieces: 96 },
        { sku: "FB-MLK-ARG1", pieces: 24 }, { sku: "FB-TEA-MIRZA400", pieces: 24 },
      ],
      settlementItems: [
        { sku: "FB-RICE-MK50", returned: 1, damaged: 0 }, { sku: "FB-OIL-PRN1", returned: 2, damaged: 1 },
        { sku: "FB-BEV-RC250", returned: 4, damaged: 0 }, { sku: "FB-SNK-BCT100", returned: 0, damaged: 2 },
        { sku: "FB-MLK-ARG1", returned: 1, damaged: 0 }, { sku: "FB-TEA-MIRZA400", returned: 0, damaged: 0 },
      ],
      discount: 300, discountSupplierKey: "S1",
      shopCollections: [{ shopName: "Karim General Store", amount: 2000, note: "Partial due collected on route" }],
      srHandovers: [{ srIndex: 0, amount: 1500, note: "Cash handed over mid-route" }],
      amountPaid: 25000,
    },
    {
      dsrIndex: 1, date: daysAgo(2),
      issueItems: [
        { sku: "FB-RICE-BAS5", pieces: 24 }, { sku: "FB-OIL-TER5", pieces: 16 },
        { sku: "FB-BEV-CC250", pieces: 48 }, { sku: "FB-SNK-CHN300", pieces: 48 },
        { sku: "FB-DAL-MSR1", pieces: 24 }, { sku: "FB-NOD-MAMCHK65", pieces: 80 },
      ],
      settlementItems: [
        { sku: "FB-RICE-BAS5", returned: 2, damaged: 0 }, { sku: "FB-OIL-TER5", returned: 1, damaged: 0 },
        { sku: "FB-BEV-CC250", returned: 2, damaged: 1 }, { sku: "FB-SNK-CHN300", returned: 0, damaged: 1 },
        { sku: "FB-DAL-MSR1", returned: 1, damaged: 0 }, { sku: "FB-NOD-MAMCHK65", returned: 3, damaged: 0 },
      ],
      discount: 0, discountSupplierKey: null,
      shopCollections: [{ shopName: "Lucky Grocery Mart", amount: 1500, note: "Partial due collected on route" }],
      srHandovers: [],
      amountPaid: 15000,
    },
    {
      dsrIndex: 2, date: daysAgo(1),
      issueItems: [
        { sku: "FB-SGR-MGN1", pieces: 48 }, { sku: "FB-SLT-ACI1", pieces: 48 },
        { sku: "FB-BEV-FRT250", pieces: 48 }, { sku: "FB-SNK-MR200", pieces: 48 },
        { sku: "FB-MLK-YOG400", pieces: 24 }, { sku: "FB-TEA-NESC50", pieces: 12 },
      ],
      settlementItems: [
        { sku: "FB-SGR-MGN1", returned: 2, damaged: 0 }, { sku: "FB-SLT-ACI1", returned: 1, damaged: 0 },
        { sku: "FB-BEV-FRT250", returned: 2, damaged: 1 }, { sku: "FB-SNK-MR200", returned: 0, damaged: 1 },
        { sku: "FB-MLK-YOG400", returned: 1, damaged: 0 }, { sku: "FB-TEA-NESC50", returned: 0, damaged: 0 },
      ],
      discount: 200, discountSupplierKey: "S2",
      shopCollections: [{ shopName: "Salam Traders", amount: 1200, note: "Partial due collected on route" }],
      srHandovers: [{ srIndex: 1, amount: 1000, note: "Cash handed over mid-route" }],
      amountPaid: 8000,
    },
    {
      dsrIndex: 3, date: daysAgo(0),
      issueItems: [
        { sku: "FB-SPC-TUR200", pieces: 48 }, { sku: "FB-BEV-SPR250", pieces: 48 },
        { sku: "FB-SNK-BAN150", pieces: 48 }, { sku: "FB-NOD-CUP70", pieces: 48 },
        { sku: "FB-MLK-MRKCND", pieces: 24 }, { sku: "FB-TEA-BAG100", pieces: 12 },
      ],
      settlementItems: [
        { sku: "FB-SPC-TUR200", returned: 2, damaged: 0 }, { sku: "FB-BEV-SPR250", returned: 2, damaged: 1 },
        { sku: "FB-SNK-BAN150", returned: 0, damaged: 1 }, { sku: "FB-NOD-CUP70", returned: 1, damaged: 0 },
        { sku: "FB-MLK-MRKCND", returned: 1, damaged: 0 }, { sku: "FB-TEA-BAG100", returned: 0, damaged: 0 },
      ],
      discount: 0, discountSupplierKey: null,
      shopCollections: [],
      srHandovers: [],
      amountPaid: 13241,
    },
  ];

  const dsrDueBalances = [];
  for (const cycle of dsrCycles) {
    const dsrId = dsrIds[cycle.dsrIndex];

    await field.issueService.saveIssue({
      date: cycle.date,
      dsrId,
      items: cycle.issueItems.map((i) => ({ productId: productIdBySku.get(i.sku), issuedPieces: i.pieces })),
    }, actor);

    const settlement = await field.settlementService.saveSettlement({
      date: cycle.date,
      dsrId,
      items: cycle.settlementItems.map((i) => ({
        productId: productIdBySku.get(i.sku), returnedPieces: i.returned, damagedPieces: i.damaged,
      })),
      discount: cycle.discount,
      discountSupplierId: cycle.discountSupplierKey ? supplierIdByKey.get(cycle.discountSupplierKey) : null,
      shopCollections: cycle.shopCollections.map((sc) => ({
        shopId: customerIdByShopName.get(sc.shopName), amount: sc.amount, note: sc.note,
      })),
      srHandovers: cycle.srHandovers.map((h) => ({ srId: srIds[h.srIndex], amount: h.amount, note: h.note })),
      amountPaid: cycle.amountPaid,
    }, actor);

    dsrDueBalances.push({ dsrId, dueAmount: settlement.dueAmount });
  }

  // ── 15. Manual DSR due settlement (the separate "Due Settlement" page —
  //       distinct from day-to-day evening settlement) ─────────────────────
  console.log("  [15/18] Manual DSR due settlement…");
  const firstDsrDue = dsrDueBalances[0];
  if (firstDsrDue && firstDsrDue.dueAmount > 0) {
    await field.dsrDueLedgerService.settleDue({
      dsrId: firstDsrDue.dsrId,
      amount: Math.min(6000, firstDsrDue.dueAmount),
      note: "Partial due settled at office",
    }, actor);
  }

  // ── 16. Expenses (+ one soft-deleted, to give the Trash page content) ───
  console.log("  [16/18] Expenses…");
  await operations.expenseService.saveExpense({ date: daysAgo(4), category: "Rent", amount: 15000, note: "Warehouse monthly rent" }, actor);
  await operations.expenseService.saveExpense({ date: daysAgo(3), category: "Vehicle", amount: 4500, note: "Delivery van fuel & maintenance" }, actor);
  await operations.expenseService.saveExpense({ date: daysAgo(2), category: "Load/Unload", amount: 3200, note: "Warehouse loading labour" }, actor);
  await operations.expenseService.saveExpense({ date: daysAgo(1), category: "Office", amount: 1800, note: "Stationery & printing" }, actor);
  await operations.expenseService.saveExpense({ date: daysAgo(0), category: "Other", amount: 2500, note: "Mobile recharge for DSR team" }, actor);

  const trashExpense = await operations.expenseService.saveExpense({ date: daysAgo(0), category: "Other", amount: 500, note: "Duplicate entry — to be removed" }, actor);
  await operations.expenseService.removeExpense(trashExpense.id, actor, "Entered twice by mistake");

  // ── 17. HR: departments, designations, employees, salary payments ───────
  console.log("  [17/18] Departments, designations, employees, salary…");
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
      joinDate: daysAgo(180),
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

  // ── 18. Extra users (Manager + Operator) ────────────────────────────────
  console.log("  [18/18] Extra users…");
  await platform.userService.createUser({
    name: "Mizanur Rahman", email: "manager@foodbev.com", password: "Manager@1234", role: USER_ROLES.MANAGER, status: "active",
  }, actor);
  await platform.userService.createUser({
    name: "Salma Akter", email: "operator@foodbev.com", password: "Operator@1234", role: USER_ROLES.OPERATOR, status: "active",
  }, actor);

  console.log("\n✓ FoodBev Distribution demo seed complete — every stock unit, ledger balance and");
  console.log("  due amount above was produced by real service calls, not fabricated by direct SQL.\n");
  console.log(`  Tenant:      ${TENANT_NAME} (${tenantId})`);
  console.log(`  Categories:  ${CATEGORY_NAMES.length}`);
  console.log(`  Products:    ${PRODUCTS.length}`);
  console.log(`  Suppliers:   ${Object.keys(SUPPLIERS).length}`);
  console.log(`  DSRs:        ${DSRS.length}   SRs: ${SRS.length}   Shops: ${CUSTOMERS.length}`);
  console.log(`  Employees:   ${EMPLOYEES.length}`);
  console.log("\nLogin (Super Admin):");
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log("\nAlso created: manager@foodbev.com / Manager@1234, operator@foodbev.com / Operator@1234");
  console.log("(these two roles have no permissions granted yet — assign them from the Permissions page).");
  console.log("\nNote: permission cache refreshes at most every 60s — if you log in immediately");
  console.log("and see missing menus, wait a minute or restart the dev server.\n");

  await db.getPool().end();
}

main().catch((err) => {
  console.error("\n✗ Seed failed.\n", err);
  process.exit(1);
});
