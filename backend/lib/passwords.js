import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
const HASH_PREFIX = "scrypt";

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return `${HASH_PREFIX}$${salt}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password, storedHash) {
  const [prefix, salt, hashValue] = String(storedHash || "").split("$");
  if (prefix !== HASH_PREFIX || !salt || !hashValue) {
    return false;
  }

  const expected = Buffer.from(hashValue, "base64url");
  const actual = await scrypt(password, salt, expected.length);

  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function validatePasswordStrength(password) {
  const value = String(password || "");
  if (value.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[a-z]/.test(value)) {
    return "Password must include at least one lowercase letter.";
  }
  if (!/[A-Z]/.test(value)) {
    return "Password must include at least one uppercase letter.";
  }
  if (!/[0-9]/.test(value)) {
    return "Password must include at least one number.";
  }
  return null;
}

const TEMP_PASSWORD_UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const TEMP_PASSWORD_LOWER = "abcdefghijkmnopqrstuvwxyz";
const TEMP_PASSWORD_DIGITS = "23456789";

function pickChar(pool) {
  return pool[crypto.randomInt(pool.length)];
}

export function generateTempPassword() {
  const all = TEMP_PASSWORD_UPPER + TEMP_PASSWORD_LOWER + TEMP_PASSWORD_DIGITS;
  const chars = [pickChar(TEMP_PASSWORD_UPPER), pickChar(TEMP_PASSWORD_LOWER), pickChar(TEMP_PASSWORD_DIGITS)];
  for (let i = chars.length; i < 10; i += 1) {
    chars.push(pickChar(all));
  }

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}
