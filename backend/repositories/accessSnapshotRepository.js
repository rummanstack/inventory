import { EMPTY_PERMISSION_SENTINEL, GLOBAL_SCOPE } from "../lib/permissionCache.js";
import { NO_FEATURES_SENTINEL } from "./tenantFeatureRepository.js";

// Loads the complete access-control snapshot in one database round trip. A
// scoped sentinel counts as a configured permission set and therefore blocks
// global fallback while remaining absent from the returned grant list.
export async function getAccessSnapshot(client, role, tenantId) {
  const result = await client.query(
    `WITH scoped_permissions AS (
       SELECT permission
       FROM role_permissions
       WHERE role = $1 AND tenant_id = $2
     ),
     effective_permissions AS (
       SELECT permission FROM scoped_permissions
       UNION ALL
       SELECT permission
       FROM role_permissions
       WHERE role = $1
         AND tenant_id = $3
         AND NOT EXISTS (SELECT 1 FROM scoped_permissions)
     )
     SELECT
       COALESCE(
         (SELECT jsonb_agg(permission ORDER BY permission)
          FROM effective_permissions
          WHERE permission <> $4),
         '[]'::jsonb
       ) AS permissions,
       EXISTS (
         SELECT 1 FROM tenant_features WHERE tenant_id = $2
       ) AS features_configured,
       COALESCE(
         (SELECT jsonb_agg(feature ORDER BY feature)
          FROM tenant_features
          WHERE tenant_id = $2 AND feature <> $5),
         '[]'::jsonb
       ) AS features`,
    [role, tenantId, GLOBAL_SCOPE, EMPTY_PERMISSION_SENTINEL, NO_FEATURES_SENTINEL],
  );

  const row = result.rows[0];
  return {
    permissions: row.permissions || [],
    features: row.features_configured ? row.features || [] : null,
  };
}
