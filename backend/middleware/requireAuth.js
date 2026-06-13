import { readCookie } from "../lib/cookies.js";
import { findTenantById } from "../repositories/tenantRepository.js";

function readBearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : "";
}

export function requireAuth(authService, env) {
  return async (req, res, next) => {
    try {
      const token = readCookie(req, env.SESSION_COOKIE_NAME) || readBearerToken(req);
      const result = await authService.getUserFromSessionToken(token, {
        ip: req.ip,
        userAgent: req.headers["user-agent"] || "",
      });

      if (!result) {
        res.status(401).json({ message: "Authentication required." });
        return;
      }

      req.currentUser = result.user;
      req.currentTenant = result.tenant;

      const isPlatformUser = !result.user.tenantId;
      req.currentUser.isPlatformUser = isPlatformUser;

      if (isPlatformUser) {
        const activeTenantId = req.headers["x-active-tenant-id"];
        if (activeTenantId) {
          const tenant = await authService.databaseManager.withClient((client) => findTenantById(client, activeTenantId));
          if (tenant) {
            req.currentUser = { ...req.currentUser, tenantId: tenant.id };
            req.currentTenant = tenant;
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
