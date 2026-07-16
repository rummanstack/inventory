import { readCookie } from "../lib/cookies.js";
import { findTenantById } from "../repositories/tenantRepository.js";
import { getSessionActiveTenantId, setSessionActiveTenantId } from "../repositories/userRepository.js";
import { hashSessionToken } from "../lib/sessionTokens.js";
import { setCachedPermissions } from "../lib/permissionCache.js";
import { setCachedFeatures } from "../lib/tenantFeatureCache.js";

function readBearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : "";
}

async function resolveActiveTenantForPlatformUser(req, token, authService, auditService) {
  const requestedTenantId = req.headers["x-active-tenant-id"] || null;
  const tokenHash = hashSessionToken(token);

  return authService.databaseManager.withClient(async (client) => {
    const previousTenantId = await getSessionActiveTenantId(client, tokenHash);

    let tenant = null;
    if (requestedTenantId) {
      tenant = await findTenantById(client, requestedTenantId);
    }
    const resolvedTenantId = tenant ? tenant.id : null;

    if (resolvedTenantId !== previousTenantId) {
      await setSessionActiveTenantId(client, tokenHash, resolvedTenantId);

      if (auditService) {
        await auditService.record(client, {
          tenantId: resolvedTenantId,
          userId: req.currentUser.id,
          actionType: "tenant.switch",
          entityType: "tenant",
          entityId: resolvedTenantId,
          description: resolvedTenantId ? `${req.currentUser.name} switched active organization` : `${req.currentUser.name} cleared active organization`,
          metadata: {
            fromTenantId: previousTenantId,
            toTenantId: resolvedTenantId,
            ip: req.ip,
            userAgent: req.headers["user-agent"] || "",
          },
        });
      }
    }

    return tenant;
  });
}

export function requireAuth(authService, env, auditService) {
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
      req.currentPermissions = result.permissions || [];
      req.currentFeatures = result.features || [];

      // Refresh the handling instance from the authoritative database snapshot
      // loaded with this session. Revocations therefore take effect on the very
      // next request, including inside services that use the synchronous cache.
      if (result.user.tenantId) {
        setCachedPermissions(result.user.role, result.user.tenantId, req.currentPermissions);
        setCachedFeatures(result.user.tenantId, req.currentFeatures);
      }

      const isPlatformUser = !result.user.tenantId;
      req.currentUser.isPlatformUser = isPlatformUser;

      if (isPlatformUser) {
        const tenant = await resolveActiveTenantForPlatformUser(req, token, authService, auditService);
        if (tenant) {
          req.currentUser = { ...req.currentUser, tenantId: tenant.id };
          req.currentTenant = tenant;
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
