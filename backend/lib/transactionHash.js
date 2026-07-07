import { createHash } from "node:crypto";

// Deterministic serialization: sorted keys, undefined -> null, Date -> ISO string.
// The hash is a tamper-evidence fingerprint of a transaction's business fields,
// computed once at creation time from the exact values being inserted.
function canonicalize(value) {
  if (value === undefined || value === null) {
    return "null";
  }
  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// table name is mixed in so identical field sets in different tables never collide
export function computeTransactionHash(table, fields) {
  return createHash("sha256").update(canonicalize({ __table: table, ...fields })).digest("hex");
}
