export function requireActiveTenant(req, res, next) {
  if (!req.currentUser) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  if (!req.currentUser.tenantId) {
    res.status(403).json({ message: "Select an active organization to continue." });
    return;
  }

  if (!req.currentTenant || req.currentTenant.status !== "active") {
    res.status(403).json({ message: "Subscription inactive. Please contact support." });
    return;
  }

  next();
}
