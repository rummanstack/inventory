/**
 * FoodBev Distribution demo seed — creates a single ready-to-demo food &
 * beverage FMCG dealer/distributor tenant (DSR model) with a full catalogue
 * (55+ products across 10 categories), opening stock, DSRs, shop customers,
 * suppliers and a cash account so DSR/Purchases/Finance screens aren't empty.
 *
 * Run (from backend/):
 *   node scripts/seedFoodBevDealer.js
 *
 * Always targets the DEV database (forces npm_lifecycle_event='dev' before
 * config/env.js is loaded) — never touches production, regardless of how
 * it's invoked. Safe to run multiple times (idempotent via fixed IDs +
 * ON CONFLICT DO NOTHING).
 *
 * Login: admin@foodbev.com / Foodbev@1234
 */

import dotenv from "dotenv";
import { backendRoot } from "../config/paths.js";
import { hashPassword } from "../lib/passwords.js";
import { USER_ROLES } from "../lib/roles.js";
import { TENANT_BUSINESS_PERMISSIONS } from "../lib/permissions.js";

dotenv.config({ path: `${backendRoot}/.env` });

// This script is for demo/dev use only — never let it run against production.
if (process.env.npm_lifecycle_event !== "dev" && process.env.npm_lifecycle_event !== "test") {
  process.env.npm_lifecycle_event = "dev";
}

const TENANT_ID = "demo-t-foodbev";
const ADMIN_USER_ID = "demo-u-foodbev-admin";
const ADMIN_EMAIL = "admin@foodbev.com";
const ADMIN_PASSWORD = "Foodbev@1234";
const ADMIN_NAME = "Jashim Uddin (FoodBev Admin)";

// ─── Categories ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "fb-cat-rice", name: "Rice & Grains" },
  { id: "fb-cat-oil", name: "Cooking Oil & Ghee" },
  { id: "fb-cat-spice", name: "Spices & Seasonings" },
  { id: "fb-cat-sugar", name: "Sugar & Salt" },
  { id: "fb-cat-dal", name: "Pulses & Dal" },
  { id: "fb-cat-bev", name: "Soft Drinks & Juices" },
  { id: "fb-cat-dairy", name: "Dairy & Milk Products" },
  { id: "fb-cat-snack", name: "Biscuits & Snacks" },
  { id: "fb-cat-noodle", name: "Noodles & Instant Food" },
  { id: "fb-cat-tea", name: "Tea & Coffee" },
];

// ─── Products ───────────────────────────────────────────────────────────────
// Fields: id, catId, name, brand, sku, ppc(pieces/case), pp(cost),
// wp(dealer wholesale price to shops), rp(suggested retail price),
// stock(pieces), warranty(months, 0 for FMCG), reorder(reorder level), desc.
// FMCG goods are never serial-tracked — no serial field needed.

const PRODUCTS = [
  // ── Rice & Grains ─────────────────────────────────────────────────────────
  { id: "fb-p-rice-001", catId: "fb-cat-rice", name: "Miniket Rice 50kg (Bag)", brand: "Local", sku: "FB-RICE-MK50", ppc: 1, pp: 2600, wp: 2800, rp: 2950, stock: 150, reorder: 40, desc: "Premium Miniket white rice, 50kg sack." },
  { id: "fb-p-rice-002", catId: "fb-cat-rice", name: "Nazirshail Rice 50kg (Bag)", brand: "Local", sku: "FB-RICE-NZ50", ppc: 1, pp: 3000, wp: 3200, rp: 3400, stock: 100, reorder: 30, desc: "Fragrant Nazirshail rice, 50kg sack." },
  { id: "fb-p-rice-003", catId: "fb-cat-rice", name: "BRRI-28 Rice 50kg (Bag)", brand: "Local", sku: "FB-RICE-BR2850", ppc: 1, pp: 2400, wp: 2600, rp: 2750, stock: 120, reorder: 35, desc: "Everyday BRRI-28 coarse rice, 50kg sack." },
  { id: "fb-p-rice-004", catId: "fb-cat-rice", name: "PRAN Basmati Rice 5kg", brand: "PRAN", sku: "FB-RICE-BAS5", ppc: 6, pp: 250, wp: 280, rp: 310, stock: 300, reorder: 80, desc: "PRAN long-grain basmati rice, 5kg pack." },
  { id: "fb-p-rice-005", catId: "fb-cat-rice", name: "Chinigura Rice 1kg", brand: "Local", sku: "FB-RICE-CHG1", ppc: 12, pp: 95, wp: 108, rp: 120, stock: 360, reorder: 90, desc: "Aromatic Chinigura rice, 1kg pack." },
  { id: "fb-p-rice-006", catId: "fb-cat-rice", name: "Teer Atta (Wheat Flour) 10kg", brand: "Teer", sku: "FB-ATTA-TR10", ppc: 2, pp: 450, wp: 490, rp: 520, stock: 200, reorder: 50, desc: "Teer whole-wheat flour, 10kg bag." },
  { id: "fb-p-rice-007", catId: "fb-cat-rice", name: "Fresh Maida (Refined Flour) 10kg", brand: "Fresh", sku: "FB-MAIDA-FR10", ppc: 2, pp: 460, wp: 500, rp: 530, stock: 150, reorder: 40, desc: "Fresh refined flour for bakery use, 10kg bag." },

  // ── Cooking Oil & Ghee ────────────────────────────────────────────────────
  { id: "fb-p-oil-001", catId: "fb-cat-oil", name: "Teer Soybean Oil 5L", brand: "Teer", sku: "FB-OIL-TER5", ppc: 4, pp: 680, wp: 740, rp: 780, stock: 450, reorder: 100, desc: "Teer refined soybean oil, 5-litre jar." },
  { id: "fb-p-oil-002", catId: "fb-cat-oil", name: "PRAN Soybean Oil 1L", brand: "PRAN", sku: "FB-OIL-PRN1", ppc: 12, pp: 150, wp: 165, rp: 178, stock: 700, reorder: 150, desc: "PRAN refined soybean oil, 1-litre bottle." },
  { id: "fb-p-oil-003", catId: "fb-cat-oil", name: "Rupchanda Soybean Oil 5L", brand: "Rupchanda", sku: "FB-OIL-RUP5", ppc: 4, pp: 690, wp: 750, rp: 790, stock: 400, reorder: 100, desc: "Rupchanda fortified soybean oil, 5-litre jar." },
  { id: "fb-p-oil-004", catId: "fb-cat-oil", name: "Meghna Soybean Oil 5L", brand: "Meghna", sku: "FB-OIL-MGN5", ppc: 4, pp: 670, wp: 730, rp: 770, stock: 350, reorder: 90, desc: "Meghna fresh soybean oil, 5-litre jar." },
  { id: "fb-p-oil-005", catId: "fb-cat-oil", name: "Pran Mustard Oil 1L", brand: "PRAN", sku: "FB-OIL-MST1", ppc: 12, pp: 185, wp: 205, rp: 225, stock: 420, reorder: 100, desc: "PRAN cold-pressed mustard oil, 1-litre." },
  { id: "fb-p-oil-006", catId: "fb-cat-oil", name: "Fresh Ghee (Pure) 1kg", brand: "Fresh", sku: "FB-GHEE-FR1", ppc: 6, pp: 850, wp: 920, rp: 980, stock: 120, reorder: 30, desc: "Pure cow ghee, 1kg tin." },

  // ── Spices & Seasonings ───────────────────────────────────────────────────
  { id: "fb-p-spc-001", catId: "fb-cat-spice", name: "Radhuni Turmeric Powder 200g", brand: "Radhuni", sku: "FB-SPC-TUR200", ppc: 24, pp: 45, wp: 55, rp: 63, stock: 800, reorder: 150, desc: "Radhuni pure turmeric powder, 200g pack." },
  { id: "fb-p-spc-002", catId: "fb-cat-spice", name: "Radhuni Cumin Powder 200g", brand: "Radhuni", sku: "FB-SPC-CUM200", ppc: 24, pp: 55, wp: 65, rp: 73, stock: 700, reorder: 150, desc: "Radhuni ground cumin powder, 200g pack." },
  { id: "fb-p-spc-003", catId: "fb-cat-spice", name: "ACI Pure Turmeric 200g", brand: "ACI", sku: "FB-SPC-ACITUR", ppc: 24, pp: 48, wp: 58, rp: 66, stock: 600, reorder: 120, desc: "ACI triple-tested pure turmeric, 200g." },
  { id: "fb-p-spc-004", catId: "fb-cat-spice", name: "Radhuni Coriander Powder 200g", brand: "Radhuni", sku: "FB-SPC-COR200", ppc: 24, pp: 42, wp: 52, rp: 59, stock: 560, reorder: 120, desc: "Radhuni coriander powder, 200g pack." },
  { id: "fb-p-spc-005", catId: "fb-cat-spice", name: "Radhuni Red Chilli Powder 200g", brand: "Radhuni", sku: "FB-SPC-CHL200", ppc: 24, pp: 50, wp: 60, rp: 68, stock: 650, reorder: 130, desc: "Radhuni red chilli powder, 200g pack." },
  { id: "fb-p-spc-006", catId: "fb-cat-spice", name: "Pran Garam Masala 100g", brand: "PRAN", sku: "FB-SPC-GRM100", ppc: 24, pp: 60, wp: 72, rp: 82, stock: 400, reorder: 90, desc: "PRAN blended garam masala, 100g pack." },

  // ── Sugar & Salt ──────────────────────────────────────────────────────────
  { id: "fb-p-sgr-001", catId: "fb-cat-sugar", name: "Meghna Sugar 1kg", brand: "Meghna", sku: "FB-SGR-MGN1", ppc: 24, pp: 112, wp: 125, rp: 135, stock: 1400, reorder: 250, desc: "Meghna refined white sugar, 1kg packet." },
  { id: "fb-p-sgr-002", catId: "fb-cat-sugar", name: "ACI Iodized Salt 1kg", brand: "ACI", sku: "FB-SLT-ACI1", ppc: 24, pp: 35, wp: 42, rp: 49, stock: 1600, reorder: 300, desc: "ACI iodized table salt, 1kg packet." },
  { id: "fb-p-sgr-003", catId: "fb-cat-sugar", name: "Molla Salt 1kg", brand: "Molla", sku: "FB-SLT-MOL1", ppc: 24, pp: 30, wp: 38, rp: 45, stock: 1000, reorder: 200, desc: "Molla refined iodized salt, 1kg pack." },
  { id: "fb-p-sgr-004", catId: "fb-cat-sugar", name: "Fresh Sugar 1kg", brand: "Fresh", sku: "FB-SGR-FR1", ppc: 24, pp: 110, wp: 122, rp: 132, stock: 900, reorder: 200, desc: "Fresh brand refined white sugar, 1kg packet." },

  // ── Pulses & Dal ──────────────────────────────────────────────────────────
  { id: "fb-p-dal-001", catId: "fb-cat-dal", name: "ACI Moosur Dal 1kg", brand: "ACI", sku: "FB-DAL-MSR1", ppc: 12, pp: 90, wp: 100, rp: 112, stock: 700, reorder: 150, desc: "ACI red lentils (moosur dal), 1kg pack." },
  { id: "fb-p-dal-002", catId: "fb-cat-dal", name: "PRAN Mung Dal 500g", brand: "PRAN", sku: "FB-DAL-MNG500", ppc: 24, pp: 75, wp: 85, rp: 96, stock: 560, reorder: 120, desc: "PRAN green mung dal, 500g packet." },
  { id: "fb-p-dal-003", catId: "fb-cat-dal", name: "Chola Dal (Chickpea) 1kg", brand: "Local", sku: "FB-DAL-CHL1", ppc: 12, pp: 95, wp: 110, rp: 122, stock: 400, reorder: 90, desc: "Split chickpea dal (chola dal), 1kg pack." },
  { id: "fb-p-dal-004", catId: "fb-cat-dal", name: "Motor Dal (Split Pea) 1kg", brand: "Local", sku: "FB-DAL-MTR1", ppc: 12, pp: 80, wp: 92, rp: 104, stock: 360, reorder: 80, desc: "Split yellow pea dal, 1kg pack." },
  { id: "fb-p-dal-005", catId: "fb-cat-dal", name: "Anchor Dal (Red Lentil) 1kg", brand: "Anchor", sku: "FB-DAL-ANC1", ppc: 12, pp: 92, wp: 102, rp: 114, stock: 420, reorder: 90, desc: "Anchor brand red lentils, 1kg pack." },

  // ── Soft Drinks & Juices ──────────────────────────────────────────────────
  { id: "fb-p-bev-001", catId: "fb-cat-bev", name: "RC Cola 250ml (24pcs Crate)", brand: "RC Cola", sku: "FB-BEV-RC250", ppc: 24, pp: 12, wp: 15, rp: 19, stock: 2800, reorder: 400, desc: "RC Cola carbonated drink, 250ml can." },
  { id: "fb-p-bev-002", catId: "fb-cat-bev", name: "Coca-Cola 250ml Can (24pcs)", brand: "Coca-Cola", sku: "FB-BEV-CC250", ppc: 24, pp: 35, wp: 42, rp: 50, stock: 1600, reorder: 300, desc: "Coca-Cola classic, 250ml can." },
  { id: "fb-p-bev-003", catId: "fb-cat-bev", name: "PRAN Frooto Mango 250ml", brand: "PRAN", sku: "FB-BEV-FRT250", ppc: 24, pp: 15, wp: 18, rp: 23, stock: 1800, reorder: 350, desc: "PRAN Frooto mango juice drink, 250ml." },
  { id: "fb-p-bev-004", catId: "fb-cat-bev", name: "Pran Mango Juice 1L (Tetra)", brand: "PRAN", sku: "FB-BEV-MNG1L", ppc: 12, pp: 65, wp: 75, rp: 88, stock: 900, reorder: 180, desc: "PRAN mango juice in 1-litre tetra pack." },
  { id: "fb-p-bev-005", catId: "fb-cat-bev", name: "Sprite 250ml Can (24pcs)", brand: "Sprite", sku: "FB-BEV-SPR250", ppc: 24, pp: 35, wp: 42, rp: 50, stock: 1200, reorder: 250, desc: "Sprite lemon-lime soda, 250ml can." },
  { id: "fb-p-bev-006", catId: "fb-cat-bev", name: "ACI Pure Drinking Water 1L (12pcs)", brand: "ACI", sku: "FB-BEV-ACIW1L", ppc: 12, pp: 10, wp: 13, rp: 16, stock: 2400, reorder: 400, desc: "ACI purified drinking water, 1-litre bottle." },
  { id: "fb-p-bev-007", catId: "fb-cat-bev", name: "Fanta 250ml Can (24pcs)", brand: "Fanta", sku: "FB-BEV-FAN250", ppc: 24, pp: 35, wp: 42, rp: 50, stock: 1100, reorder: 250, desc: "Fanta orange soda, 250ml can." },

  // ── Dairy & Milk Products ─────────────────────────────────────────────────
  { id: "fb-p-dry-001", catId: "fb-cat-dairy", name: "Aarong UHT Milk 1L", brand: "Aarong", sku: "FB-MLK-ARG1", ppc: 12, pp: 90, wp: 100, rp: 118, stock: 500, reorder: 100, desc: "Aarong full-fat UHT milk, 1-litre tetra." },
  { id: "fb-p-dry-002", catId: "fb-cat-dairy", name: "Farm Fresh Milk 500ml", brand: "Farm Fresh", sku: "FB-MLK-FF5", ppc: 12, pp: 48, wp: 55, rp: 66, stock: 400, reorder: 80, desc: "Farm Fresh pasteurised milk, 500ml." },
  { id: "fb-p-dry-003", catId: "fb-cat-dairy", name: "Marks Condensed Milk 400g (Tin)", brand: "Marks", sku: "FB-MLK-MRKCND", ppc: 24, pp: 95, wp: 108, rp: 122, stock: 500, reorder: 100, desc: "Marks sweetened condensed milk, 400g tin." },
  { id: "fb-p-dry-004", catId: "fb-cat-dairy", name: "Danish Full Cream Milk Powder 500g", brand: "Danish", sku: "FB-MLK-DAN500", ppc: 12, pp: 380, wp: 410, rp: 450, stock: 300, reorder: 320, desc: "Danish full cream instant milk powder, 500g." },
  { id: "fb-p-dry-005", catId: "fb-cat-dairy", name: "Pran Yogurt (Mishti Doi) 400g", brand: "PRAN", sku: "FB-MLK-YOG400", ppc: 12, pp: 70, wp: 80, rp: 92, stock: 280, reorder: 70, desc: "PRAN sweetened yogurt (mishti doi), 400g cup." },

  // ── Biscuits & Snacks ─────────────────────────────────────────────────────
  { id: "fb-p-snk-001", catId: "fb-cat-snack", name: "Olympic Banana Chips 150g", brand: "Olympic", sku: "FB-SNK-BAN150", ppc: 24, pp: 28, wp: 35, rp: 44, stock: 960, reorder: 180, desc: "Olympic crispy banana chips, 150g pack." },
  { id: "fb-p-snk-002", catId: "fb-cat-snack", name: "PRAN Chanachur Hot 300g", brand: "PRAN", sku: "FB-SNK-CHN300", ppc: 24, pp: 32, wp: 40, rp: 50, stock: 800, reorder: 160, desc: "PRAN spicy chanachur snack mix, 300g pack." },
  { id: "fb-p-snk-003", catId: "fb-cat-snack", name: "Hacks Biscuit Cream 100g", brand: "Hacks", sku: "FB-SNK-BCT100", ppc: 48, pp: 18, wp: 22, rp: 29, stock: 1500, reorder: 300, desc: "Hacks cream sandwich biscuit, 100g pack." },
  { id: "fb-p-snk-004", catId: "fb-cat-snack", name: "Olympic Marie Biscuit 200g", brand: "Olympic", sku: "FB-SNK-MR200", ppc: 24, pp: 28, wp: 33, rp: 41, stock: 700, reorder: 150, desc: "Olympic Marie biscuit, 200g pack." },
  { id: "fb-p-snk-005", catId: "fb-cat-snack", name: "Nabisco Nice Biscuit 250g", brand: "Nabisco", sku: "FB-SNK-NC250", ppc: 24, pp: 32, wp: 38, rp: 47, stock: 650, reorder: 140, desc: "Nabisco coconut-flavoured Nice biscuit, 250g." },
  { id: "fb-p-snk-006", catId: "fb-cat-snack", name: "Pran Potato Crackers 100g", brand: "PRAN", sku: "FB-SNK-POT100", ppc: 24, pp: 20, wp: 25, rp: 32, stock: 900, reorder: 180, desc: "PRAN crispy potato crackers, 100g pack." },
  { id: "fb-p-snk-007", catId: "fb-cat-snack", name: "Bombay Sweets Toast Biscuit 350g", brand: "Bombay Sweets", sku: "FB-SNK-TST350", ppc: 24, pp: 45, wp: 53, rp: 63, stock: 500, reorder: 110, desc: "Bombay Sweets crunchy toast biscuit, 350g pack." },

  // ── Noodles & Instant Food ────────────────────────────────────────────────
  { id: "fb-p-nod-001", catId: "fb-cat-noodle", name: "Mama Instant Noodles (Chicken) 65g", brand: "Mama", sku: "FB-NOD-MAMCHK65", ppc: 40, pp: 12, wp: 15, rp: 19, stock: 2200, reorder: 400, desc: "Mama chicken-flavour instant noodles, 65g pack." },
  { id: "fb-p-nod-002", catId: "fb-cat-noodle", name: "PRAN Chotpoti Mix 200g", brand: "PRAN", sku: "FB-NOD-CHOT200", ppc: 24, pp: 45, wp: 53, rp: 63, stock: 450, reorder: 100, desc: "PRAN ready chotpoti mix, 200g pack." },
  { id: "fb-p-nod-003", catId: "fb-cat-noodle", name: "Mr. Noodles Instant Cup 70g", brand: "Mr. Noodles", sku: "FB-NOD-CUP70", ppc: 24, pp: 30, wp: 36, rp: 44, stock: 800, reorder: 160, desc: "Mr. Noodles instant cup noodles, 70g." },
  { id: "fb-p-nod-004", catId: "fb-cat-noodle", name: "Pran Instant Khichuri Mix 350g", brand: "PRAN", sku: "FB-NOD-KHI350", ppc: 24, pp: 75, wp: 88, rp: 102, stock: 350, reorder: 80, desc: "PRAN ready-to-cook khichuri mix, 350g pack." },
  { id: "fb-p-nod-005", catId: "fb-cat-noodle", name: "Sajeeb Vermicelli (Shemai) 200g", brand: "Sajeeb", sku: "FB-NOD-SHEMAI200", ppc: 24, pp: 35, wp: 42, rp: 50, stock: 600, reorder: 130, desc: "Sajeeb roasted vermicelli (shemai), 200g pack." },

  // ── Tea & Coffee ──────────────────────────────────────────────────────────
  { id: "fb-p-tea-001", catId: "fb-cat-tea", name: "Ispahani Mirzapore Tea 400g", brand: "Ispahani", sku: "FB-TEA-MIRZA400", ppc: 24, pp: 180, wp: 205, rp: 230, stock: 700, reorder: 150, desc: "Ispahani Mirzapore blended black tea, 400g pack." },
  { id: "fb-p-tea-002", catId: "fb-cat-tea", name: "Kazi & Kazi Organic Tea 100g", brand: "Kazi & Kazi", sku: "FB-TEA-KZORG100", ppc: 24, pp: 95, wp: 110, rp: 128, stock: 450, reorder: 100, desc: "Certified organic black tea, 100g pack." },
  { id: "fb-p-tea-003", catId: "fb-cat-tea", name: "Nescafe Classic Coffee 50g (Jar)", brand: "Nescafe", sku: "FB-TEA-NESC50", ppc: 24, pp: 210, wp: 235, rp: 260, stock: 380, reorder: 400, desc: "Nescafe Classic instant coffee, 50g jar." },
  { id: "fb-p-tea-004", catId: "fb-cat-tea", name: "Ispahani Tea Bag (100pcs Box)", brand: "Ispahani", sku: "FB-TEA-BAG100", ppc: 12, pp: 220, wp: 250, rp: 280, stock: 300, reorder: 70, desc: "Ispahani tagged tea bags, box of 100." },
  { id: "fb-p-tea-005", catId: "fb-cat-tea", name: "Pran Green Tea 25 Bags", brand: "PRAN", sku: "FB-TEA-GRN25", ppc: 24, pp: 85, wp: 98, rp: 112, stock: 400, reorder: 90, desc: "PRAN green tea, box of 25 bags." },
];

// ─── DSRs (Delivery Sales Reps) ─────────────────────────────────────────────

const DSRS = [
  { id: "fb-dsr-001", name: "Md. Alamgir Hossain", phone: "01712-010001", area: "Mirpur 1-14", status: "Active" },
  { id: "fb-dsr-002", name: "Jashim Uddin Ahmed", phone: "01812-010002", area: "Mohammadpur & Adabor", status: "Active" },
  { id: "fb-dsr-003", name: "Habibur Rahman", phone: "01912-010003", area: "Uttara & Turag", status: "Active" },
  { id: "fb-dsr-004", name: "Shafiqul Islam", phone: "01612-010004", area: "Badda & Rampura", status: "Active" },
];

// ─── Customer shops (assigned to DSRs) ──────────────────────────────────────

const CUSTOMERS = [
  { id: "fb-cust-001", shopName: "Karim General Store", ownerName: "Abdul Karim", phone: "01711-600001", address: "Shop 5, Mirpur-1 Bazar", market: "Mirpur-1 Market", dsrId: "fb-dsr-001" },
  { id: "fb-cust-002", shopName: "Lucky Grocery Mart", ownerName: "Nurul Islam", phone: "01811-600002", address: "16 Mohammadpur Town Hall Rd", market: "Mohammadpur Bazar", dsrId: "fb-dsr-002" },
  { id: "fb-cust-003", shopName: "Salam Traders", ownerName: "Abdus Salam", phone: "01911-600003", address: "Sector-4, Uttara", market: "Uttara Market", dsrId: "fb-dsr-003" },
  { id: "fb-cust-004", shopName: "Al-Amin Super Shop", ownerName: "Al-Amin Khan", phone: "01611-600004", address: "Merul Badda, Badda", market: "Badda Bazar", dsrId: "fb-dsr-004" },
  { id: "fb-cust-005", shopName: "Hasan Provision Store", ownerName: "Md. Hasan", phone: "01751-600005", address: "Pirerbag, Mirpur-2", market: "Mirpur-2 Market", dsrId: "fb-dsr-001" },
  { id: "fb-cust-006", shopName: "Bismillah Grocery", ownerName: "Kadir Mia", phone: "01851-600006", address: "Shyamoli Road, Mohammadpur", market: "Shyamoli Market", dsrId: "fb-dsr-002" },
  { id: "fb-cust-007", shopName: "Rupali Store", ownerName: "Habibur Rahman Jr.", phone: "01951-600007", address: "Sector-7, Uttara", market: "Uttara Market", dsrId: "fb-dsr-003" },
  { id: "fb-cust-008", shopName: "Star Family Mart", ownerName: "Rafiq Ahmed", phone: "01651-600008", address: "Badda Link Road, Dhaka", market: "Badda Bazar", dsrId: "fb-dsr-004" },
];

// ─── Suppliers ──────────────────────────────────────────────────────────────

const SUPPLIERS = [
  { id: "fb-sup-001", name: "PRAN-RFL Group", phone: "02-7793007", address: "PRAN Centre, 105 Bir Uttam Rafiqul Islam Ave, Dhaka-1206" },
  { id: "fb-sup-002", name: "ACI Limited", phone: "02-9887091", address: "245 Tejgaon I/A, Dhaka-1208" },
  { id: "fb-sup-003", name: "Meghna Group of Industries", phone: "02-9566026", address: "Meghna Industrial Zone, Rupganj, Narayanganj" },
  { id: "fb-sup-004", name: "Teer Brand (City Group)", phone: "01711-200001", address: "City House, 20 Rajuk Avenue, Dhaka-1000" },
  { id: "fb-sup-005", name: "Olympic Industries Ltd", phone: "02-7812101", address: "Goaltek Depot, Rupganj, Narayanganj" },
  { id: "fb-sup-006", name: "Coca-Cola Bottling Bangladesh", phone: "01811-200002", address: "Bhaluka Industrial Area, Mymensingh" },
];

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const { env } = await import("../config/env.js");
  const { DatabaseManager } = await import("../db/pool.js");
  const { defaultFeaturesForBusinessType } = await import("../services/tenantService.js");

  if (env.DATABASE_LABEL !== "dev") {
    throw new Error(`Refusing to seed: resolved database label is "${env.DATABASE_LABEL}", expected "dev". Check DEV_DATABASE_URL in .env.`);
  }

  const db = new DatabaseManager(env.DATABASE_URL);
  const pool = db.getPool();

  console.log(`\nSeeding FoodBev Distribution demo into ${env.DATABASE_LABEL} database…\n`);

  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  const features = defaultFeaturesForBusinessType("GROCERY");

  await pool.query("BEGIN");
  try {
    // 1. Tenant
    console.log("  [1/10] Tenant…");
    await pool.query(
      `INSERT INTO tenants (id, name, slug, email, plan, status, address, business_type, seller_type, phone)
       VALUES ($1,$2,$3,$4,$5,'active',$6,'GROCERY','DEALER',$7)
       ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID, "FoodBev Distribution", "foodbev-distribution", ADMIN_EMAIL, "professional", "Warehouse 7, Postogola Industrial Area, Jatrabari, Dhaka-1204", "01700-000001"],
    );

    // 2. Tenant features
    console.log("  [2/10] Tenant features…");
    for (const feature of features) {
      await pool.query(
        `INSERT INTO tenant_features (tenant_id, feature) VALUES ($1,$2)
         ON CONFLICT (tenant_id, feature) DO NOTHING`,
        [TENANT_ID, feature],
      );
    }

    // 3. Admin user
    console.log("  [3/10] Admin user…");
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, tenant_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,'active')
       ON CONFLICT (id) DO NOTHING`,
      [ADMIN_USER_ID, ADMIN_NAME, ADMIN_EMAIL, passwordHash, USER_ROLES.SUPER_ADMIN, TENANT_ID],
    );

    // 4. Role permissions — a freshly created tenant's super_admin has ZERO
    //    permissions until explicitly granted (no hardcoded defaults).
    console.log("  [4/10] Role permissions…");
    for (const permission of TENANT_BUSINESS_PERMISSIONS) {
      await pool.query(
        `INSERT INTO role_permissions (role, tenant_id, permission) VALUES ($1,$2,$3)
         ON CONFLICT (role, tenant_id, permission) DO NOTHING`,
        [USER_ROLES.SUPER_ADMIN, TENANT_ID, permission],
      );
    }

    // 5. Categories
    console.log("  [5/10] Categories…");
    for (const cat of CATEGORIES) {
      await pool.query(
        `INSERT INTO categories (id, tenant_id, name) VALUES ($1,$2,$3)
         ON CONFLICT (id) DO NOTHING`,
        [cat.id, TENANT_ID, cat.name],
      );
    }

    // 6. Products + opening stock movements (FMCG — no serial tracking)
    console.log(`  [6/10] Products & stock (${PRODUCTS.length} products)…`);
    for (const p of PRODUCTS) {
      await pool.query(
        `INSERT INTO products (
           id, tenant_id, name, category_id,
           pieces_per_case, purchase_price, wholesale_price, retail_price,
           stock_pieces, brand, model, sku, description,
           serial_required, warranty_months, reorder_level, status, order_index
         ) VALUES (
           $1,$2,$3,$4,
           $5,$6,$7,$8,
           $9,$10,'',$11,$12,
           false,0,$13,'ACTIVE',9999
         )
         ON CONFLICT (id) DO NOTHING`,
        [
          p.id, TENANT_ID, p.name, p.catId,
          p.ppc, p.pp, p.wp, p.rp,
          p.stock, p.brand, p.sku, p.desc,
          p.reorder,
        ],
      );

      // Opening stock movement — keeps the stock-reconciliation invariant exact:
      // stock_pieces must equal SUM(quantity_in) - SUM(quantity_out).
      await pool.query(
        `INSERT INTO stock_movements (
           id, tenant_id, product_id, type,
           quantity_in, quantity_out, balance_after,
           reference_type, reference_id, note
         ) VALUES ($1,$2,$3,'OPENING',$4,0,$4,'opening',NULL,'Opening stock')
         ON CONFLICT (id) DO NOTHING`,
        [`fb-sm-${p.id}`, TENANT_ID, p.id, p.stock],
      );
    }

    // 7. DSRs
    console.log("  [7/10] DSRs…");
    for (const d of DSRS) {
      await pool.query(
        `INSERT INTO dsrs (id, tenant_id, name, phone, area, status)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO NOTHING`,
        [d.id, TENANT_ID, d.name, d.phone, d.area, d.status],
      );
    }

    // 8. Customer shops
    console.log("  [8/10] Customer shops…");
    for (const c of CUSTOMERS) {
      await pool.query(
        `INSERT INTO customers (
           id, tenant_id, shop_name, owner_name, phone, address, market,
           assigned_dsr_id, status
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ACTIVE')
         ON CONFLICT (id) DO NOTHING`,
        [c.id, TENANT_ID, c.shopName, c.ownerName, c.phone, c.address, c.market, c.dsrId],
      );
    }

    // 9. Suppliers
    console.log("  [9/10] Suppliers…");
    for (const s of SUPPLIERS) {
      await pool.query(
        `INSERT INTO suppliers (id, tenant_id, name, phone, address, status)
         VALUES ($1,$2,$3,$4,$5,'ACTIVE')
         ON CONFLICT (id) DO NOTHING`,
        [s.id, TENANT_ID, s.name, s.phone, s.address],
      );
    }

    // 10. Cash finance account
    console.log("  [10/10] Finance account…");
    await pool.query(
      `INSERT INTO finance_accounts (id, tenant_id, type, name, balance)
       VALUES ($1,$2,'CASH','FoodBev - Cash',0)
       ON CONFLICT (tenant_id, type) DO NOTHING`,
      [`fb-fa-cash-${TENANT_ID}`, TENANT_ID],
    );

    await pool.query("COMMIT");

    console.log("\n✓ FoodBev Distribution demo seed complete.\n");
    console.log(`  Products:    ${PRODUCTS.length}`);
    console.log(`  Categories:  ${CATEGORIES.length}`);
    console.log(`  Total units: ${PRODUCTS.reduce((sum, p) => sum + p.stock, 0)}`);
    console.log(`  DSRs:        ${DSRS.length}`);
    console.log(`  Shops:       ${CUSTOMERS.length}`);
    console.log(`  Suppliers:   ${SUPPLIERS.length}`);
    console.log("\nLogin:");
    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log("\nNote: permission cache refreshes at most every 60s — if you log in immediately");
    console.log("and see missing menus, wait a minute or restart the dev server.\n");
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
