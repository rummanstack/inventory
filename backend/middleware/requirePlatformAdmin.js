import { USER_ROLES } from "../lib/roles.js";

export function requirePlatformAdmin(req, res, next) {
  if (!req.currentUser) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  if (req.currentUser.role !== USER_ROLES.SYSTEM_DEVELOPER) {
    res.status(403).json({ message: "Platform admin access required." });
    return;
  }

  next();
}
