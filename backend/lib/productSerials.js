import { randomInt } from "crypto";

export const PRODUCT_SERIAL_STATUSES = {
  IN_STOCK: "IN_STOCK",
  SOLD: "SOLD",
  RETURNED: "RETURNED",
  DAMAGED: "DAMAGED",
  WARRANTY: "WARRANTY",
  DELETED: "DELETED",
};

export const PRODUCT_SERIAL_STATUS_VALUES = Object.values(PRODUCT_SERIAL_STATUSES);

// A scannable stand-in barcode for a unit that was received without one of its own.
// Not a real GS1/EAN allocation — just a unique 12-digit numeric string in the same
// shape a barcode scanner expects, prefixed "2" (the GS1 "restricted circulation
// number" range) so it can never collide with a real EAN-13 assigned to the product.
export function generateSerialBarcode() {
  let digits = "";
  for (let i = 0; i < 11; i += 1) {
    digits += randomInt(0, 10);
  }
  return `2${digits}`;
}

const MAX_BARCODE_GENERATION_ATTEMPTS = 5;

// Shared by every call site that creates a serial without a caller-supplied barcode
// (single add, purchase receive, CSV import) so they all retry the same way on the
// rare collision. `findDuplicate(candidate)` is caller-provided so this stays free
// of any DB client/tenant coupling — returns null if every attempt collided.
export async function generateUniqueSerialBarcode(findDuplicate) {
  for (let attempt = 0; attempt < MAX_BARCODE_GENERATION_ATTEMPTS; attempt += 1) {
    const candidate = generateSerialBarcode();
    const duplicate = await findDuplicate(candidate);
    if (!duplicate) return candidate;
  }
  return null;
}
