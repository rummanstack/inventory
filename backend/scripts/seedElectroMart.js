/**
 * ElectroMart demo seed — creates a single ready-to-demo electronics retail
 * tenant with a full catalogue (60+ products across 10 categories), opening
 * stock, per-unit serials/IMEIs for high-value items, a cash account, and a
 * handful of suppliers + retail customers so Purchases/POS screens aren't empty.
 *
 * Run (from backend/):
 *   node scripts/seedElectroMart.js
 *
 * Always targets the DEV database (forces npm_lifecycle_event='dev' before
 * config/env.js is loaded) — never touches production, regardless of how
 * it's invoked. Safe to run multiple times (idempotent via fixed IDs +
 * ON CONFLICT DO NOTHING).
 *
 * Login: admin@electromart.com / Electro@1234
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

const TENANT_ID = "demo-t-electromart";
const ADMIN_USER_ID = "demo-u-electromart-admin";
const ADMIN_EMAIL = "admin@electromart.com";
const ADMIN_PASSWORD = "Electro@1234";
const ADMIN_NAME = "Tanvir Ahmed (ElectroMart Admin)";

// ─── Categories ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "em-cat-mobile", name: "Mobile Phones" },
  { id: "em-cat-laptop", name: "Laptops & Computers" },
  { id: "em-cat-tv", name: "Televisions" },
  { id: "em-cat-fridge", name: "Refrigerators" },
  { id: "em-cat-ac", name: "Air Conditioners" },
  { id: "em-cat-wash", name: "Washing Machines" },
  { id: "em-cat-audio", name: "Audio & Speakers" },
  { id: "em-cat-camera", name: "Cameras" },
  { id: "em-cat-kitchen", name: "Kitchen Appliances" },
  { id: "em-cat-accessory", name: "Mobile & Computer Accessories" },
];

// ─── Products ───────────────────────────────────────────────────────────────
// Fields: id, catId, name, brand, model, sku, ppc(pieces/case), pp(cost),
// wp(wholesale), rp(retail), stock, serial(bool), warranty(months),
// reorder(reorder level), desc.

const PRODUCTS = [
  // ── Mobile Phones (serial/IMEI tracked) ──────────────────────────────────
  { id: "em-p-mob-001", catId: "em-cat-mobile", name: "Samsung Galaxy A16 5G (128GB)", brand: "Samsung", model: "SM-A166", sku: "EM-MOB-SGA16", ppc: 1, pp: 15500, wp: 16800, rp: 18500, stock: 25, serial: true, warranty: 12, reorder: 10, desc: "6.7-inch Super AMOLED, 5000mAh battery, 5G, 128GB storage." },
  { id: "em-p-mob-002", catId: "em-cat-mobile", name: "Samsung Galaxy A55 5G (256GB)", brand: "Samsung", model: "SM-A556", sku: "EM-MOB-SGA55", ppc: 1, pp: 34000, wp: 37000, rp: 41500, stock: 15, serial: true, warranty: 12, reorder: 10, desc: "Flagship mid-ranger with Gorilla Glass Victus+ and 50MP OIS camera." },
  { id: "em-p-mob-003", catId: "em-cat-mobile", name: "Samsung Galaxy S24 FE (256GB)", brand: "Samsung", model: "SM-S721", sku: "EM-MOB-SGS24FE", ppc: 1, pp: 58000, wp: 62000, rp: 69900, stock: 8, serial: true, warranty: 12, reorder: 10, desc: "Flagship-grade camera and performance in a compact body." },
  { id: "em-p-mob-004", catId: "em-cat-mobile", name: "Xiaomi Redmi 13C (128GB)", brand: "Xiaomi", model: "23106RN0DI", sku: "EM-MOB-RD13C", ppc: 1, pp: 11500, wp: 12500, rp: 13990, stock: 30, serial: true, warranty: 12, reorder: 10, desc: "Budget-friendly 90Hz display with 50MP AI triple camera." },
  { id: "em-p-mob-005", catId: "em-cat-mobile", name: "Xiaomi Redmi Note 13 Pro (256GB)", brand: "Xiaomi", model: "23090RA98I", sku: "EM-MOB-RN13PRO", ppc: 1, pp: 24500, wp: 26500, rp: 29900, stock: 18, serial: true, warranty: 12, reorder: 10, desc: "200MP OIS camera with curved AMOLED display." },
  { id: "em-p-mob-006", catId: "em-cat-mobile", name: "Poco X6 Pro (256GB)", brand: "Poco", model: "23122PCD1I", sku: "EM-MOB-POCOX6P", ppc: 1, pp: 28000, wp: 30500, rp: 33900, stock: 12, serial: true, warranty: 12, reorder: 10, desc: "Dimensity 8300-Ultra flagship chipset with 120W fast charging." },
  { id: "em-p-mob-007", catId: "em-cat-mobile", name: "realme C67 (256GB)", brand: "realme", model: "RMX3890", sku: "EM-MOB-RC67", ppc: 1, pp: 16500, wp: 17800, rp: 19990, stock: 22, serial: true, warranty: 12, reorder: 10, desc: "108MP camera with slim design and 33W SUPERVOOC charging." },
  { id: "em-p-mob-008", catId: "em-cat-mobile", name: "realme 12 Pro+ (256GB)", brand: "realme", model: "RMX3840", sku: "EM-MOB-R12PROPLUS", ppc: 1, pp: 33000, wp: 35800, rp: 39900, stock: 10, serial: true, warranty: 12, reorder: 10, desc: "Periscope telephoto camera with 3x optical zoom." },
  { id: "em-p-mob-009", catId: "em-cat-mobile", name: "vivo Y28 (128GB)", brand: "vivo", model: "V2318", sku: "EM-MOB-VY28", ppc: 1, pp: 15800, wp: 17000, rp: 18990, stock: 20, serial: true, warranty: 12, reorder: 10, desc: "IP64 rated with 44W FlashCharge and 6000mAh battery." },
  { id: "em-p-mob-010", catId: "em-cat-mobile", name: "Apple iPhone 15 (128GB)", brand: "Apple", model: "A3092", sku: "EM-MOB-IP15", ppc: 1, pp: 92000, wp: 96000, rp: 104900, stock: 6, serial: true, warranty: 12, reorder: 10, desc: "A16 Bionic chip, Dynamic Island, USB-C, 48MP main camera." },

  // ── Laptops & Computers (serial tracked) ─────────────────────────────────
  { id: "em-p-lap-001", catId: "em-cat-laptop", name: "HP 15 Laptop (i3 13th Gen, 8GB/512GB)", brand: "HP", model: "15-fd0xxx", sku: "EM-LAP-HP15I3", ppc: 1, pp: 48000, wp: 51000, rp: 56900, stock: 10, serial: true, warranty: 24, reorder: 6, desc: "Everyday laptop with 15.6-inch FHD display and fast SSD." },
  { id: "em-p-lap-002", catId: "em-cat-laptop", name: "HP Pavilion 14 (i5 13th Gen, 16GB/512GB)", brand: "HP", model: "14-ec0xxx", sku: "EM-LAP-HPPAV14", ppc: 1, pp: 68000, wp: 72000, rp: 79900, stock: 6, serial: true, warranty: 24, reorder: 6, desc: "Slim aluminum body with backlit keyboard and B&O audio." },
  { id: "em-p-lap-003", catId: "em-cat-laptop", name: "Dell Inspiron 15 3520 (i5, 8GB/512GB)", brand: "Dell", model: "3520", sku: "EM-LAP-DELL3520", ppc: 1, pp: 55000, wp: 58500, rp: 64900, stock: 8, serial: true, warranty: 24, reorder: 6, desc: "Reliable everyday performance with 12th Gen Intel Core i5." },
  { id: "em-p-lap-004", catId: "em-cat-laptop", name: "Lenovo IdeaPad Slim 3 (Ryzen 5, 8GB/512GB)", brand: "Lenovo", model: "15ABR8", sku: "EM-LAP-LNVIP3", ppc: 1, pp: 52000, wp: 55500, rp: 61900, stock: 9, serial: true, warranty: 24, reorder: 6, desc: "AMD Ryzen 5 performance with all-day battery life." },
  { id: "em-p-lap-005", catId: "em-cat-laptop", name: "Lenovo ThinkPad E14 (i5, 16GB/512GB)", brand: "Lenovo", model: "Gen 5", sku: "EM-LAP-TPE14", ppc: 1, pp: 78000, wp: 82500, rp: 91900, stock: 5, serial: true, warranty: 24, reorder: 6, desc: "Business-grade durability with military-spec testing." },
  { id: "em-p-lap-006", catId: "em-cat-laptop", name: "ASUS Vivobook 15 (i3, 8GB/512GB)", brand: "ASUS", model: "X1502ZA", sku: "EM-LAP-ASVB15", ppc: 1, pp: 46500, wp: 49500, rp: 54900, stock: 12, serial: true, warranty: 24, reorder: 6, desc: "Lightweight design with vivid NanoEdge FHD display." },
  { id: "em-p-lap-007", catId: "em-cat-laptop", name: "ASUS TUF Gaming F15 (i5, RTX 3050, 16GB/512GB)", brand: "ASUS", model: "FX507ZC4", sku: "EM-LAP-TUFF15", ppc: 1, pp: 98000, wp: 103000, rp: 114900, stock: 4, serial: true, warranty: 24, reorder: 6, desc: "144Hz display with military-grade durability for gaming." },
  { id: "em-p-lap-008", catId: "em-cat-laptop", name: "Walton Tamarind BX350 (i5, 8GB/512GB)", brand: "Walton", model: "BX350", sku: "EM-LAP-WALTBX350", ppc: 1, pp: 42000, wp: 45000, rp: 49900, stock: 10, serial: true, warranty: 24, reorder: 6, desc: "Locally assembled laptop with solid build and value pricing." },

  // ── Televisions ───────────────────────────────────────────────────────────
  { id: "em-p-tv-001", catId: "em-cat-tv", name: "Walton 32\" HD LED TV (W32E200S)", brand: "Walton", model: "W32E200S", sku: "EM-TV-WLT32", ppc: 1, pp: 13500, wp: 15200, rp: 16990, stock: 20, serial: false, warranty: 12, reorder: 8, desc: "32-inch HD LED TV with HDMI & USB input." },
  { id: "em-p-tv-002", catId: "em-cat-tv", name: "Walton 43\" 4K Smart TV (W43E400S)", brand: "Walton", model: "W43E400S", sku: "EM-TV-WLT43", ppc: 1, pp: 22000, wp: 24500, rp: 27990, stock: 14, serial: false, warranty: 12, reorder: 8, desc: "43-inch 4K UHD smart Android TV." },
  { id: "em-p-tv-003", catId: "em-cat-tv", name: "Walton 55\" 4K Smart TV (W55D500S)", brand: "Walton", model: "W55D500S", sku: "EM-TV-WLT55", ppc: 1, pp: 34500, wp: 38000, rp: 42990, stock: 8, serial: false, warranty: 12, reorder: 8, desc: "55-inch 4K UHD smart TV with Dolby Audio." },
  { id: "em-p-tv-004", catId: "em-cat-tv", name: "Samsung 43\" Crystal UHD 4K Smart TV", brand: "Samsung", model: "UA43CU7700", sku: "EM-TV-SAM43", ppc: 1, pp: 32000, wp: 35500, rp: 39900, stock: 10, serial: false, warranty: 12, reorder: 8, desc: "Crystal processor 4K with vibrant color and Tizen OS." },
  { id: "em-p-tv-005", catId: "em-cat-tv", name: "Samsung 50\" QLED 4K Smart TV", brand: "Samsung", model: "QA50Q60C", sku: "EM-TV-SAM50Q", ppc: 1, pp: 58000, wp: 63000, rp: 69900, stock: 5, serial: false, warranty: 12, reorder: 5, desc: "Quantum Dot technology with 100% color volume." },
  { id: "em-p-tv-006", catId: "em-cat-tv", name: "Sony Bravia 43\" X75L 4K Google TV", brand: "Sony", model: "KD-43X75L", sku: "EM-TV-SONY43", ppc: 1, pp: 42000, wp: 46000, rp: 51900, stock: 6, serial: false, warranty: 12, reorder: 8, desc: "4K HDR processor X1 with Google TV smart platform." },
  { id: "em-p-tv-007", catId: "em-cat-tv", name: "LG 43\" UQ7500 4K Smart TV", brand: "LG", model: "43UQ7500", sku: "EM-TV-LG43", ppc: 1, pp: 39500, wp: 43000, rp: 47900, stock: 7, serial: false, warranty: 12, reorder: 8, desc: "Alpha5 AI processor 4K with webOS smart platform." },

  // ── Refrigerators ─────────────────────────────────────────────────────────
  { id: "em-p-frd-001", catId: "em-cat-fridge", name: "Walton 200L Direct Cool Refrigerator", brand: "Walton", model: "WFA-2B0-GDXX-XX", sku: "EM-FRD-WLT200", ppc: 1, pp: 17500, wp: 20000, rp: 22990, stock: 10, serial: false, warranty: 36, reorder: 5, desc: "200-litre direct cool single-door refrigerator." },
  { id: "em-p-frd-002", catId: "em-cat-fridge", name: "Walton 300L Frost-Free Refrigerator", brand: "Walton", model: "WFC-3D8-GDEH-DD", sku: "EM-FRD-WLT300", ppc: 1, pp: 26000, wp: 29500, rp: 33990, stock: 7, serial: false, warranty: 36, reorder: 5, desc: "300-litre no-frost double-door refrigerator with inverter compressor." },
  { id: "em-p-frd-003", catId: "em-cat-fridge", name: "Samsung 253L Digital Inverter Refrigerator", brand: "Samsung", model: "RT25FARZDSA", sku: "EM-FRD-SAM253", ppc: 1, pp: 32000, wp: 36000, rp: 40900, stock: 6, serial: false, warranty: 36, reorder: 5, desc: "Digital inverter compressor with all-around cooling." },
  { id: "em-p-frd-004", catId: "em-cat-fridge", name: "LG 260L Smart Inverter Refrigerator", brand: "LG", model: "GN-B262SQCL", sku: "EM-FRD-LG260", ppc: 1, pp: 33500, wp: 37500, rp: 42900, stock: 5, serial: false, warranty: 36, reorder: 5, desc: "Smart inverter compressor with multi-air flow cooling." },
  { id: "em-p-frd-005", catId: "em-cat-fridge", name: "Jamuna 195L Direct Cool Refrigerator", brand: "Jamuna", model: "JE-1F5-GNW-CD", sku: "EM-FRD-JAM195", ppc: 1, pp: 15000, wp: 17200, rp: 19990, stock: 12, serial: false, warranty: 24, reorder: 5, desc: "Compact single-door refrigerator, ideal for small families." },

  // ── Air Conditioners (serial tracked) ────────────────────────────────────
  { id: "em-p-ac-001", catId: "em-cat-ac", name: "Walton 1 Ton Inverter Split AC", brand: "Walton", model: "WSI-INVERNA-12C", sku: "EM-AC-WLT1T", ppc: 1, pp: 33000, wp: 37000, rp: 41900, stock: 10, serial: true, warranty: 36, reorder: 5, desc: "1-ton split inverter AC, energy-saving grade A." },
  { id: "em-p-ac-002", catId: "em-cat-ac", name: "Walton 1.5 Ton Inverter Split AC", brand: "Walton", model: "WSI-INVERNA-18C", sku: "EM-AC-WLT15T", ppc: 1, pp: 41000, wp: 46000, rp: 51900, stock: 8, serial: true, warranty: 36, reorder: 5, desc: "1.5-ton split inverter AC with auto-clean function." },
  { id: "em-p-ac-003", catId: "em-cat-ac", name: "General 1.5 Ton Inverter Split AC", brand: "General", model: "ASGA18FMTA", sku: "EM-AC-GEN15T", ppc: 1, pp: 52000, wp: 57500, rp: 64900, stock: 6, serial: true, warranty: 36, reorder: 5, desc: "Premium Japanese inverter technology, whisper-quiet operation." },
  { id: "em-p-ac-004", catId: "em-cat-ac", name: "Gree 1 Ton Inverter Split AC", brand: "Gree", model: "GS-12FITH1S", sku: "EM-AC-GREE1T", ppc: 1, pp: 36000, wp: 40500, rp: 45900, stock: 7, serial: true, warranty: 36, reorder: 5, desc: "Fairy series inverter AC with 3D airflow." },
  { id: "em-p-ac-005", catId: "em-cat-ac", name: "Midea 2 Ton Inverter Split AC", brand: "Midea", model: "MSM-24CRN1", sku: "EM-AC-MID2T", ppc: 1, pp: 58000, wp: 64000, rp: 71900, stock: 4, serial: true, warranty: 36, reorder: 5, desc: "High-capacity inverter AC ideal for large rooms and offices." },
  { id: "em-p-ac-006", catId: "em-cat-ac", name: "Haier 1.5 Ton Inverter Split AC", brand: "Haier", model: "HSU-18TFF", sku: "EM-AC-HAI15T", ppc: 1, pp: 44000, wp: 49000, rp: 54900, stock: 5, serial: true, warranty: 36, reorder: 5, desc: "Self-clean inverter AC with dual-motor turbo cooling." },

  // ── Washing Machines ──────────────────────────────────────────────────────
  { id: "em-p-wash-001", catId: "em-cat-wash", name: "Walton 7kg Top Load Fully Automatic", brand: "Walton", model: "WWM-72S", sku: "EM-WASH-WLT7K", ppc: 1, pp: 19500, wp: 22000, rp: 24990, stock: 8, serial: false, warranty: 24, reorder: 5, desc: "7kg top-load fully automatic washing machine." },
  { id: "em-p-wash-002", catId: "em-cat-wash", name: "Walton 8kg Front Load Inverter Washing Machine", brand: "Walton", model: "WFM-Q80T", sku: "EM-WASH-WLT8K", ppc: 1, pp: 29500, wp: 33000, rp: 37900, stock: 5, serial: false, warranty: 24, reorder: 5, desc: "8kg front-load inverter washing machine with steam wash." },
  { id: "em-p-wash-003", catId: "em-cat-wash", name: "Whirlpool 7kg Top Load Washing Machine", brand: "Whirlpool", model: "WM STAINWASH", sku: "EM-WASH-WHR7K", ppc: 1, pp: 24000, wp: 27000, rp: 30900, stock: 6, serial: false, warranty: 24, reorder: 5, desc: "6th Sense technology with hard water wash cycle." },
  { id: "em-p-wash-004", catId: "em-cat-wash", name: "Samsung 8kg Front Load Inverter Washing Machine", brand: "Samsung", model: "WW80T4020CE", sku: "EM-WASH-SAM8K", ppc: 1, pp: 42000, wp: 46500, rp: 51900, stock: 4, serial: false, warranty: 24, reorder: 5, desc: "Digital inverter motor with Eco Bubble technology." },

  // ── Audio & Speakers ──────────────────────────────────────────────────────
  { id: "em-p-aud-001", catId: "em-cat-audio", name: "JBL Flip 6 Portable Bluetooth Speaker", brand: "JBL", model: "Flip 6", sku: "EM-AUD-JBLFLIP6", ppc: 1, pp: 9500, wp: 10800, rp: 12500, stock: 20, serial: false, warranty: 12, reorder: 8, desc: "IP67 waterproof portable speaker with punchy JBL Pro Sound." },
  { id: "em-p-aud-002", catId: "em-cat-audio", name: "JBL Charge 5 Portable Bluetooth Speaker", brand: "JBL", model: "Charge 5", sku: "EM-AUD-JBLCHRG5", ppc: 1, pp: 13500, wp: 15200, rp: 17500, stock: 15, serial: false, warranty: 12, reorder: 8, desc: "Powerful sound with 20-hour playtime and powerbank function." },
  { id: "em-p-aud-003", catId: "em-cat-audio", name: "Walton Soundbar WSB-200", brand: "Walton", model: "WSB-200", sku: "EM-AUD-WLTSB200", ppc: 1, pp: 6500, wp: 7500, rp: 8990, stock: 12, serial: false, warranty: 12, reorder: 5, desc: "Compact soundbar with deep bass for home entertainment." },
  { id: "em-p-aud-004", catId: "em-cat-audio", name: "Sony Home Theater Soundbar HT-S20R", brand: "Sony", model: "HT-S20R", sku: "EM-AUD-SONYS20R", ppc: 1, pp: 16500, wp: 18500, rp: 20900, stock: 8, serial: false, warranty: 12, reorder: 5, desc: "Real 5.1ch surround sound with wireless rear speakers." },
  { id: "em-p-aud-005", catId: "em-cat-audio", name: "JBL Tune 510BT Wireless Headphones", brand: "JBL", model: "Tune 510BT", sku: "EM-AUD-JBLT510", ppc: 1, pp: 3200, wp: 3800, rp: 4500, stock: 35, serial: false, warranty: 12, reorder: 10, desc: "On-ear wireless headphones with 40 hours of battery life." },
  { id: "em-p-aud-006", catId: "em-cat-audio", name: "boAt Rockerz 450 Wireless Headphones", brand: "boAt", model: "Rockerz 450", sku: "EM-AUD-BOATRK450", ppc: 1, pp: 2100, wp: 2500, rp: 2990, stock: 40, serial: false, warranty: 6, reorder: 10, desc: "40mm dynamic drivers with padded ear cushions for comfort." },

  // ── Cameras (serial tracked) ──────────────────────────────────────────────
  { id: "em-p-cam-001", catId: "em-cat-camera", name: "Canon EOS 1500D DSLR (18-55mm Kit)", brand: "Canon", model: "EOS 1500D", sku: "EM-CAM-CAN1500D", ppc: 1, pp: 42000, wp: 46500, rp: 51900, stock: 5, serial: true, warranty: 24, reorder: 4, desc: "24.1MP APS-C sensor with beginner-friendly guided controls." },
  { id: "em-p-cam-002", catId: "em-cat-camera", name: "Canon EOS M50 Mark II Mirrorless Camera", brand: "Canon", model: "EOS M50 Mark II", sku: "EM-CAM-CANM50M2", ppc: 1, pp: 68000, wp: 74000, rp: 82900, stock: 3, serial: true, warranty: 24, reorder: 4, desc: "Compact mirrorless with 4K video and vari-angle touchscreen." },
  { id: "em-p-cam-003", catId: "em-cat-camera", name: "GoPro Hero 12 Action Camera", brand: "GoPro", model: "Hero 12 Black", sku: "EM-CAM-GOPRO12", ppc: 1, pp: 38000, wp: 42000, rp: 46900, stock: 6, serial: true, warranty: 12, reorder: 4, desc: "5.3K60 video with HyperSmooth 6.0 stabilization." },
  { id: "em-p-cam-004", catId: "em-cat-camera", name: "Xiaomi 360° Home Security Camera", brand: "Xiaomi", model: "C500 Pro", sku: "EM-CAM-XIAOC500", ppc: 1, pp: 2800, wp: 3300, rp: 3990, stock: 25, serial: true, warranty: 12, reorder: 8, desc: "2K resolution with AI human detection and night vision." },

  // ── Kitchen Appliances ────────────────────────────────────────────────────
  { id: "em-p-kit-001", catId: "em-cat-kitchen", name: "Walton Microwave Oven 20L (Solo)", brand: "Walton", model: "WMWO-SL20", sku: "EM-KIT-WLTMW20", ppc: 1, pp: 7500, wp: 8500, rp: 9990, stock: 15, serial: false, warranty: 12, reorder: 6, desc: "20-litre solo microwave oven with 5 power levels." },
  { id: "em-p-kit-002", catId: "em-cat-kitchen", name: "Walton Microwave Oven 25L (Grill)", brand: "Walton", model: "WMWO-GR25", sku: "EM-KIT-WLTMW25", ppc: 1, pp: 10500, wp: 11800, rp: 13500, stock: 10, serial: false, warranty: 12, reorder: 6, desc: "25-litre grill microwave with auto-cook menus." },
  { id: "em-p-kit-003", catId: "em-cat-kitchen", name: "Miyako Blender & Juicer 1.5L", brand: "Miyako", model: "BL-102", sku: "EM-KIT-MIYBL102", ppc: 1, pp: 1800, wp: 2100, rp: 2500, stock: 30, serial: false, warranty: 12, reorder: 10, desc: "Multi-function blender with stainless steel blades." },
  { id: "em-p-kit-004", catId: "em-cat-kitchen", name: "Kiam Rice Cooker 1.8L", brand: "Kiam", model: "RC-18", sku: "EM-KIT-KIAMRC18", ppc: 1, pp: 1600, wp: 1900, rp: 2300, stock: 28, serial: false, warranty: 12, reorder: 10, desc: "Non-stick inner pot with keep-warm function." },
  { id: "em-p-kit-005", catId: "em-cat-kitchen", name: "Philips Electric Kettle 1.7L", brand: "Philips", model: "HD9350", sku: "EM-KIT-PHIKT17", ppc: 1, pp: 1900, wp: 2200, rp: 2650, stock: 25, serial: false, warranty: 12, desc: "Rapid boil with auto shut-off and concealed heating element.", reorder: 10 },
  { id: "em-p-kit-006", catId: "em-cat-kitchen", name: "Walton Induction Cooker 2000W", brand: "Walton", model: "WIC-N20", sku: "EM-KIT-WLTIC20", ppc: 1, pp: 3200, wp: 3700, rp: 4400, stock: 18, serial: false, warranty: 12, reorder: 8, desc: "2000W induction cooktop with 8 preset cooking functions." },

  // ── Mobile & Computer Accessories ─────────────────────────────────────────
  { id: "em-p-acc-001", catId: "em-cat-accessory", name: "Anker 20W USB-C Fast Charger", brand: "Anker", model: "A2633", sku: "EM-ACC-ANK20W", ppc: 1, pp: 850, wp: 1000, rp: 1250, stock: 60, serial: false, warranty: 12, reorder: 15, desc: "Compact PowerIQ fast charger, compatible with most phones." },
  { id: "em-p-acc-002", catId: "em-cat-accessory", name: "Anker PowerCore 10000mAh Power Bank", brand: "Anker", model: "A1263", sku: "EM-ACC-ANKPC10K", ppc: 1, pp: 1800, wp: 2100, rp: 2550, stock: 40, serial: false, warranty: 12, reorder: 12, desc: "Slim high-capacity power bank with fast-charging output." },
  { id: "em-p-acc-003", catId: "em-cat-accessory", name: "Remax Type-C Data Cable 1m", brand: "Remax", model: "RC-171a", sku: "EM-ACC-RMXTC1M", ppc: 1, pp: 180, wp: 220, rp: 290, stock: 100, serial: false, warranty: 6, reorder: 25, desc: "Durable braided USB-C charging and data cable." },
  { id: "em-p-acc-004", catId: "em-cat-accessory", name: "Logitech M185 Wireless Mouse", brand: "Logitech", model: "M185", sku: "EM-ACC-LOGM185", ppc: 1, pp: 950, wp: 1100, rp: 1350, stock: 35, serial: false, warranty: 12, reorder: 12, desc: "Reliable 2.4GHz wireless mouse with long battery life." },
  { id: "em-p-acc-005", catId: "em-cat-accessory", name: "A4Tech Wired Keyboard KR-83", brand: "A4Tech", model: "KR-83", sku: "EM-ACC-A4TKR83", ppc: 1, pp: 550, wp: 650, rp: 800, stock: 30, serial: false, warranty: 12, reorder: 10, desc: "Spill-resistant wired keyboard for everyday typing." },
  { id: "em-p-acc-006", catId: "em-cat-accessory", name: "Tempered Glass Screen Protector (Universal)", brand: "Generic", model: "9H-UNI", sku: "EM-ACC-TGUNI", ppc: 1, pp: 60, wp: 90, rp: 150, stock: 150, serial: false, warranty: 0, reorder: 30, desc: "9H hardness tempered glass, anti-scratch and anti-fingerprint." },
];

// ─── Suppliers ──────────────────────────────────────────────────────────────

const SUPPLIERS = [
  { id: "em-sup-001", name: "Samsung Electronics BD Ltd", phone: "01811-000202", address: "Banani, Dhaka-1213" },
  { id: "em-sup-002", name: "Walton Hi-Tech Industries Ltd", phone: "02-9861661", address: "Chandra, Kaliakoir, Gazipur" },
  { id: "em-sup-003", name: "Xiaomi Bangladesh (Authorized Distributor)", phone: "01711-000505", address: "Bashundhara City, Panthapath, Dhaka-1205" },
  { id: "em-sup-004", name: "Smart Technologies (BD) Ltd", phone: "02-8836801", address: "Kawran Bazar, Dhaka-1215" },
  { id: "em-sup-005", name: "Global Brand Pvt Ltd (Apple/Sony Distributor)", phone: "01911-000707", address: "Gulshan-2, Dhaka-1212" },
  { id: "em-sup-006", name: "Fair Electronics Ltd", phone: "01611-000808", address: "Elephant Road, Dhaka-1205" },
];

// ─── Retail customers ───────────────────────────────────────────────────────

const RETAIL_CUSTOMERS = [
  { id: "em-rc-001", name: "Mahmudul Hasan", phone: "01711-500001", address: "House 12, Road 5, Dhanmondi, Dhaka", note: "Prefers EMI on mobile purchases" },
  { id: "em-rc-002", name: "Farzana Akter", phone: "01811-500002", address: "Flat 4B, Bashundhara R/A, Dhaka", note: "" },
  { id: "em-rc-003", name: "Shariful Islam", phone: "01911-500003", address: "Uttara Sector-7, Dhaka", note: "Regular corporate bulk buyer" },
  { id: "em-rc-004", name: "Nusrat Jahan", phone: "01611-500004", address: "Mirpur-10, Dhaka", note: "" },
  { id: "em-rc-005", name: "Kamrul Hasan", phone: "01751-500005", address: "Khilgaon, Dhaka", note: "Loyalty program member" },
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

  console.log(`\nSeeding ElectroMart demo into ${env.DATABASE_LABEL} database…\n`);

  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  const features = defaultFeaturesForBusinessType("ELECTRONICS");

  await pool.query("BEGIN");
  try {
    // 1. Tenant
    console.log("  [1/9] Tenant…");
    await pool.query(
      `INSERT INTO tenants (id, name, slug, email, plan, status, address, business_type, seller_type, phone)
       VALUES ($1,$2,$3,$4,$5,'active',$6,'ELECTRONICS','RETAILER',$7)
       ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID, "ElectroMart", "electromart", ADMIN_EMAIL, "professional", "Shop 42, Level 3, Bashundhara City Shopping Complex, Panthapath, Dhaka-1205", "01700-000000"],
    );

    // 2. Tenant features
    console.log("  [2/9] Tenant features…");
    for (const feature of features) {
      await pool.query(
        `INSERT INTO tenant_features (tenant_id, feature) VALUES ($1,$2)
         ON CONFLICT (tenant_id, feature) DO NOTHING`,
        [TENANT_ID, feature],
      );
    }

    // 3. Admin user
    console.log("  [3/9] Admin user…");
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, tenant_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,'active')
       ON CONFLICT (id) DO NOTHING`,
      [ADMIN_USER_ID, ADMIN_NAME, ADMIN_EMAIL, passwordHash, USER_ROLES.SUPER_ADMIN, TENANT_ID],
    );

    // 4. Role permissions — a freshly created tenant's super_admin has ZERO
    //    permissions until explicitly granted (no hardcoded defaults).
    console.log("  [4/9] Role permissions…");
    for (const permission of TENANT_BUSINESS_PERMISSIONS) {
      await pool.query(
        `INSERT INTO role_permissions (role, tenant_id, permission) VALUES ($1,$2,$3)
         ON CONFLICT (role, tenant_id, permission) DO NOTHING`,
        [USER_ROLES.SUPER_ADMIN, TENANT_ID, permission],
      );
    }

    // 5. Categories
    console.log("  [5/9] Categories…");
    for (const cat of CATEGORIES) {
      await pool.query(
        `INSERT INTO categories (id, tenant_id, name) VALUES ($1,$2,$3)
         ON CONFLICT (id) DO NOTHING`,
        [cat.id, TENANT_ID, cat.name],
      );
    }

    // 6. Products + opening stock movements + serials
    console.log(`  [6/9] Products, stock & serials (${PRODUCTS.length} products)…`);
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
           $9,$10,$11,$12,$13,
           $14,$15,$16,'ACTIVE',9999
         )
         ON CONFLICT (id) DO NOTHING`,
        [
          p.id, TENANT_ID, p.name, p.catId,
          p.ppc, p.pp, p.wp, p.rp,
          p.stock, p.brand, p.model, p.sku, p.desc,
          p.serial, p.warranty, p.reorder,
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
        [`em-sm-${p.id}`, TENANT_ID, p.id, p.stock],
      );

      // Serial-tracked products need one product_serials row per unit in stock.
      if (p.serial) {
        for (let i = 1; i <= p.stock; i++) {
          const sn = `${p.sku}-${String(i).padStart(4, "0")}`;
          await pool.query(
            `INSERT INTO product_serials (id, tenant_id, product_id, serial_number, status)
             VALUES ($1,$2,$3,$4,'IN_STOCK')
             ON CONFLICT (id) DO NOTHING`,
            [`em-ser-${p.id}-${i}`, TENANT_ID, p.id, sn],
          );
        }
      }
    }

    // 7. Suppliers
    console.log("  [7/9] Suppliers…");
    for (const s of SUPPLIERS) {
      await pool.query(
        `INSERT INTO suppliers (id, tenant_id, name, phone, address, status)
         VALUES ($1,$2,$3,$4,$5,'ACTIVE')
         ON CONFLICT (id) DO NOTHING`,
        [s.id, TENANT_ID, s.name, s.phone, s.address],
      );
    }

    // 8. Retail customers
    console.log("  [8/9] Retail customers…");
    for (const rc of RETAIL_CUSTOMERS) {
      await pool.query(
        `INSERT INTO retail_customers (id, tenant_id, name, phone, address, note, status)
         VALUES ($1,$2,$3,$4,$5,$6,'ACTIVE')
         ON CONFLICT (id) DO NOTHING`,
        [rc.id, TENANT_ID, rc.name, rc.phone, rc.address, rc.note],
      );
    }

    // 9. Cash finance account (needed for POS/quick sale to record payments)
    console.log("  [9/9] Finance account…");
    await pool.query(
      `INSERT INTO finance_accounts (id, tenant_id, type, name, balance)
       VALUES ($1,$2,'CASH','ElectroMart - Cash',0)
       ON CONFLICT (tenant_id, type) DO NOTHING`,
      [`em-fa-cash-${TENANT_ID}`, TENANT_ID],
    );

    await pool.query("COMMIT");

    console.log("\n✓ ElectroMart demo seed complete.\n");
    console.log(`  Products:         ${PRODUCTS.length}`);
    console.log(`  Categories:       ${CATEGORIES.length}`);
    console.log(`  Serial-tracked:   ${PRODUCTS.filter((p) => p.serial).length} products`);
    console.log(`  Total units:      ${PRODUCTS.reduce((sum, p) => sum + p.stock, 0)}`);
    console.log("\nLogin:");
    console.log(`  URL:      (your app login page)`);
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
