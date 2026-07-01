import { assert } from "../lib/errors.js";
import { USER_ROLES } from "../lib/roles.js";
import { getCachedFeatures } from "../lib/tenantFeatureCache.js";

export function requireFeature(featureKey) {
  const featureKeys = Array.isArray(featureKey) ? featureKey : [featureKey];

  return (req, _res, next) => {
    if (req.currentUser?.role === USER_ROLES.SYSTEM_DEVELOPER) {
      return next();
    }

    const cached = getCachedFeatures(req.currentUser?.tenantId);
    const enabled = cached === null || featureKeys.some((key) => cached.includes(key));
    assert(enabled, "This feature is not enabled for your organization.", 403);
    next();
  };
}
