import validator from "validator";

// Returns an error string (mirrors validatePasswordStrength's style) or null
// if the address is well-formed. Presence/uniqueness checks stay separate.
export function validateEmail(email) {
  const value = String(email || "").trim();
  if (!validator.isEmail(value)) {
    return "Enter a valid email address.";
  }
  return null;
}
