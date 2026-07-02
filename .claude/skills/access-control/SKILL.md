---
name: access-control
description: Use when changing who can see or do something in StockLedger — adding a permission, gating a route or page, debugging an unexpected 403, changing role defaults, toggling a module per tenant, or understanding how the three access layers work together.
---

# Access Control in StockLedger

There are **three completely independent layers** of access control. A request must pass every layer that applies to it. Mixing these up is the most common cause of confusing 403 bugs.

```
Layer 1 — Role        Who the user IS (their rank)
Layer 2 — Permission  What the user CAN DO (their capabilities)
Layer 3 — Feature     What the TENANT has PURCHASED (module on/off switch)
```

---

## Layer 1 — Role (`backend/lib/roles.js`)

Fixed hierarchy, highest to lowest:

```
system_developer  → Platform staff. No tenant. Unconditional, hardcoded, full access everywhere.
super_admin       → Tenant owner. Access is entirely DB-configured per tenant — no hardcoded default (see Layer 2).
admin             → Senior manager. Access is entirely DB-configured per tenant — no hardcoded default.
manager           → Mid-level. Access is entirely DB-configured per tenant — no hardcoded default.
operator          → Front-line. Access is entirely DB-configured per tenant — no hardcoded default.
```

A user has exactly **one** role. Only `system_developer`'s permission set is fixed in code — every other role's actual capabilities live in the `role_permissions` table, not in a hardcoded bundle (see Layer 2 below; this changed from the old "hardcoded defaults, DB overrides them" model). A handful of routes/pages are **hard role-gated** regardless of permissions (e.g. `/platform` and `/system-health` are `system_developer`-only; `/settings/permissions` itself is `system_developer`/`super_admin`-only by role, not permission — this is deliberate, so a role can never lock itself out of the page that fixes its own permissions).

**Backend:** `requireRoles([ROLES.SUPER_ADMIN, ROLES.ADMIN])` in a route  
**Frontend:** `role: 'super_admin'` or `roles: ['super_admin', 'admin']` on an `APP_ROUTES` entry

---

## Layer 2 — Permission (`backend/lib/permissions.js`)

Fine-grained capability flags. These are what actually gate most API calls.

**How this actually works (no hardcoded defaults except system_developer):**
- `ROLE_PERMISSIONS` in `permissions.js` contains **only** `system_developer` — `[...Object.values(PERMISSIONS)]`, unconditional. Every other role has no code-level grant at all.
- What `super_admin`/`admin`/`manager`/`operator` can do lives **entirely** in the `role_permissions` DB table, scoped by `(role, tenant_id)`.
- `system_developer` configures **any** role for **any** tenant (including `super_admin` — a tenant owner's access is itself a per-tenant, system_developer-controlled ceiling, not a fixed guarantee).
- `super_admin` configures `admin`/`manager`/`operator` for their **own** tenant only — cannot touch their own row (no self-escalation).
- At request time: `getRolePermissions(role, tenantId)` in `lib/permissions.js` → `getCachedPermissions(role, tenantId)` in `lib/permissionCache.js` → DB via `role_permissions` table. **If nothing has been configured for a (role, tenant) pair, that role has zero permissions** — there is no fallback to a hardcoded list. This is a deliberate design decision (see git log around "Remove hardcoded role permission defaults" for the full rationale and migration consequences) — a freshly-created tenant's `admin`/`manager`/`operator`/`super_admin` all start with **no permissions** until explicitly configured via the Permissions page.
- `system_developer` reaches the Permissions page and picks a target tenant via a dropdown (it has no tenant of its own); `super_admin` is implicitly scoped to their own tenant, no picker shown.

**Backend enforcement:**
```js
// In a route file:
router.get('/', requirePermission(PERMISSIONS.MANAGE_PRODUCTS), controller.list);
router.delete('/:id', requirePermission(PERMISSIONS.MANAGE_PRODUCTS), controller.delete);
```

**Frontend enforcement (UX only — never trust this alone):**
```js
// In APP_ROUTES:
{ ..., permission: 'manage_products' }

// In a page component:
const { can } = useInventoryApp();
const canManage = can('manage_products'); // hide/show buttons
```

**`system_developer` bypasses all permission checks** — `hasPermission` short-circuits to `true` for this role.

### Adding a new permission

1. Add to `PERMISSIONS` object in `backend/lib/permissions.js`:
   ```js
   MANAGE_YOUR_THING: 'manage_your_thing',
   ```

2. Add to `TENANT_BUSINESS_PERMISSIONS` (the master list):
   ```js
   export const TENANT_BUSINESS_PERMISSIONS = [
     // ...existing...
     PERMISSIONS.MANAGE_YOUR_THING,
   ];
   ```

3. **Do not** add it to a hardcoded per-role list — that mechanism no longer
   exists for `super_admin`/`admin`/`manager`/`operator`. Nobody gets the new
   permission automatically. It becomes assignable via the Permissions page
   (`system_developer` for any role/tenant, `super_admin` for their own
   `admin`/`manager`/`operator`) and each tenant opts in explicitly.

4. If the permission gates a single feature-specific route (not shared
   across multiple features), add it to `PERMISSION_REQUIRED_FEATURES` in
   `backend/services/permissionService.js` — this is the **only** copy of
   that map (do not duplicate it in the frontend; `PermissionsPage.jsx`
   reads it from the `GET /permissions` API response). See
   `permission-feature-map.md` in this skill folder for the full current
   table and the reasoning for which permissions are deliberately left
   unmapped.

---

## Layer 3 — Feature Flag (`backend/lib/features.js`)

A whole-module on/off toggle per tenant. Used to sell different feature sets to different tenants (e.g. a tenant with no retail ops doesn't see the POS module at all). Feature flags are independent of roles and permissions.

**`TENANT_FEATURES`** is the full catalog:
```js
export const TENANT_FEATURES = {
  'products':             'Products & Inventory',
  'retail-pos':           'Retail POS',
  'batch-tracking':       'Batch / Expiry Tracking',
  // ...etc.
};
```

**`tenant_features` DB table** stores which features are enabled per tenant. The cache (`lib/tenantFeatureCache.js`) is checked first, with a 5-minute TTL.

**Important behavior: fail-open for new tenants.**  
If a tenant has no entry in `tenant_features` at all (newly created tenant, not yet configured), `requireFeature` treats **every** feature as enabled. This means new tenants see everything until a platform admin explicitly configures their feature set.

**Backend enforcement:**
```js
// At the TOP of a route file — gates the entire router:
router.use(requireFeature('your-feature-key'));
```

**Frontend enforcement (UX only):**
```js
// In APP_ROUTES:
{ ..., feature: 'your-feature-key' }

// In a component:
const { hasFeature } = useInventoryApp();
if (!hasFeature('batch-tracking')) return null;
```

### The three-way string match (easy to get wrong)

The feature key string must be **identical** in all three places:

```js
// backend/lib/features.js:
'your-feature-key': 'Display Name'

// backend/routes/yourThing.routes.js:
router.use(requireFeature('your-feature-key'))   // ← must match

// frontend/src/app/routes.js APP_ROUTES entry:
{ feature: 'your-feature-key' }                  // ← must match
```

If any of these three don't match: the API 403s while the page shows (or vice versa). Always grep for the key across all three locations when debugging.

---

## Auth Flow

Sessions are a hashed token in an HTTP-only cookie (`SESSION_COOKIE_NAME`) or `Authorization: Bearer` header.

`requireAuth` middleware resolves every request to `req.currentUser` + `req.currentTenant`.

**Platform users** (`system_developer`) have `tenantId = null`. They pick an "active tenant" per-session via the `X-Active-Tenant-Id` header — this is how a platform admin can act on behalf of any tenant.

**Tenant users** (`super_admin`, `admin`, `manager`, `operator`) belong to exactly one tenant (`users.tenant_id`).

`requireActiveTenant` is applied to all business routes — it rejects requests where the tenant has no active subscription. Exceptions: `/auth`, `/contact`, `/visitor-chat`, `/platform/*`, `/system/*`.

---

## How to Debug a 403

Walk through this checklist in order:

**Step 1 — Is the user authenticated?**
Does `req.currentUser` exist? Is the session cookie/token valid? Is the tenant `status: active`?
→ Check `middleware/requireAuth.js`

**Step 2 — Does the tenant have the feature enabled?**
Check `tenant_features` table for this tenantId + feature key. Is the cache stale?
→ Check `lib/tenantFeatureCache.js` — cache has a 5-minute TTL. In dev, restart the server to clear.

**Step 3 — Does the user's role have the permission?**
Remember: `admin`/`manager`/`operator`/`super_admin` have **no** hardcoded permissions — if nobody has configured `role_permissions` for this exact `(role, tenantId)`, the role has zero permissions, full stop. This is the single most common cause of a 403 after this architecture change (Jul 2026) — a freshly-created tenant, or one that hasn't been reconfigured since, will 403 on everything until someone visits the Permissions page. Check the `role_permissions` table for `(role, tenantId)` rows.
→ `getRolePermissions(role, tenantId)` in `lib/permissions.js`

**Step 4 — Is this a hard role-gated route?**
Does the route use `requireRoles(...)` instead of `requirePermission(...)`? No permission can unlock a role-gated route.

**Step 5 — Frontend vs backend mismatch?**
Is the page visible but the API rejects? Verify the exact string values match:
- `PERMISSIONS.YOUR_KEY` value === string passed to `requirePermission(...)`
- `APP_ROUTES[].feature` === string passed to `requireFeature(...)`

---

## Quick Reference: Which layer for what?

| Scenario | Which layer |
|---|---|
| Only `system_developer` can access `/platform` | Role (`requireRoles`) |
| Only users with `manage_finance_accounts` can add transactions | Permission (`requirePermission`) |
| Tenant A doesn't have the retail POS module at all | Feature flag (`requireFeature`) |
| A manager needs any permission at all for one tenant (there's no default) | Configure via `role_permissions` table (UI: Permissions page → `super_admin`, own tenant only) |
| A tenant owner's (`super_admin`) own access needs adjusting | Only `system_developer` can do this — Permissions page, pick the tenant from the dropdown, edit the `super_admin` card |
| Hiding a button for users who can't do an action | `can('permission_key')` in the component |
| Hiding a nav item for tenants without the feature | `feature:` field in `APP_ROUTES` + `hasFeature()` in components |
