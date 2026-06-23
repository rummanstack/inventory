---
name: tenant-access-control
description: Use when changing who can see or do something in StockLedger — adding a permission, gating a route/page, debugging an unexpected 403, changing role defaults, or making a module togglable per tenant. Explains the three independent access-control layers (role, permission, feature flag) and how they're enforced on both backend and frontend.
---

# Roles, permissions, and feature flags in StockLedger

There are **three independent layers**. A request must pass all that apply to its route.
Confusing one for another is the most common cause of "why is this 403ing" bugs.

## 1. Role (`backend/lib/roles.js`)

Fixed hierarchy: `system_developer` (platform staff, no tenant) → `super_admin` → `admin`
→ `manager` → `operator` (all tenant-scoped). A user has exactly one role. Roles are
mostly used as the *default* permission bundle (see layer 2) and for a handful of
hard role-gated routes/pages (`requireRoles(...)` on backend, `role`/`roles` on a frontend
`APP_ROUTES` entry) — e.g. `/platform`, `/system-health` are `system_developer`-only
regardless of permissions.

## 2. Permission (`backend/lib/permissions.js`)

Fine-grained capability flags, e.g. `MANAGE_PRODUCTS`, `VIEW_FINANCE_DASHBOARD`. Two
parts:
- `ROLE_PERMISSIONS` — the **hardcoded default** set of permissions per role.
- `role_permissions` DB table — lets a tenant's super_admin *customize* what each role
  can do within their tenant (e.g. give `operator` an extra permission). Read through
  `getCachedPermissions(role, tenantId)` (`lib/permissionCache.js`); falls back to
  `ROLE_PERMISSIONS[role]` if nothing's been customized for that tenant.

Enforcement:
- Backend: `requirePermission(PERMISSIONS.X)` / `requireAnyPermission(...)` in
  `middleware/requireRole.js`, applied per-route in `routes/<x>.routes.js`.
- Frontend: each `APP_ROUTES` entry's `permission` field is checked against the
  permissions array returned by `GET /api/auth/me` (loaded into
  `useInventoryApp.jsx`'s `permissions` state) to decide sidebar visibility — this is
  UX-only, **always** also enforce with `requirePermission` server-side.

`system_developer` always passes every permission check (`hasPermission` short-circuits
to `true`), independent of `ROLE_PERMISSIONS`.

To add a new permission: add the key to `PERMISSIONS`, add it to
`TENANT_BUSINESS_PERMISSIONS` (the full list a tenant can ever grant), and decide which
default roles get it in `ROLE_PERMISSIONS`.

## 3. Feature flag (`backend/lib/features.js`)

Whole-module on/off switch per tenant, independent of role/permission — used so a
platform admin can sell different tenants different feature sets (e.g. a tenant with no
retail operations doesn't get the retail POS module at all).

- `TENANT_FEATURES` is the full catalog of feature keys.
- `tenant_features` DB table stores which are enabled per tenant; read through
  `getCachedFeatures(tenantId)` (`lib/tenantFeatureCache.js`) — `null` cache means "not
  yet configured", which `requireFeature` treats as **enabled** (fail-open default for
  new tenants until a platform admin explicitly configures the list — check
  `tenantFeatureCache.js`/`tenantFeatureRepository.js` if this matters for the bug you're
  chasing, since it's the one layer that's fail-open instead of fail-closed).
- Enforcement: `requireFeature("key")` (backend, top of each `routes/<x>.routes.js`) and
  each `APP_ROUTES` entry's `feature` field (frontend sidebar visibility).

Feature keys are **1:1 with `APP_ROUTES[].id`/`.feature`** — when adding a feature, the
string must match exactly across `lib/features.js`, the route file's `requireFeature(...)`
call, and the frontend `routes.js` entry, or the page will be reachable but its API calls
will 403 (or vice versa).

## Debugging a 403

Check in this order:
1. Is the user authenticated and does their tenant have `status: active`
   (`requireAuth`/`requireActiveTenant`)?
2. Does their role have the permission by default, or has it been customized away in
   `role_permissions` for this tenant? (`getRolePermissions(role, tenantId)`)
3. Is the feature enabled for this tenant in `tenant_features`, or is the cache stale?
   (`lib/tenantFeatureCache.js`)
4. Is this a hard role-gated route (`requireRoles`/`role:` on the frontend route) that no
   permission can unlock?

## Debugging a frontend page that's visible but the API still rejects

The two checks (`APP_ROUTES.permission`/`.feature` on frontend, `requirePermission`/
`requireFeature` on backend) are maintained independently — verify both sides use the
exact same string keys (`PERMISSIONS.X` value vs. the literal string in
`requirePermission(...)`, and the feature key in `requireFeature(...)` vs.
`APP_ROUTES[].feature`).
