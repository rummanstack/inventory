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
system_developer  → Platform staff. No tenant. Can do everything everywhere.
super_admin       → Tenant owner. Full access within their tenant.
admin             → Senior manager. Almost everything.
manager           → Mid-level. Common operations.
operator          → Front-line. Limited operations.
```

A user has exactly **one** role. Roles are mostly used as the default permission bundle — they don't gate individual API calls directly. Exception: a handful of routes/pages are **hard role-gated** (e.g. `/platform` and `/system-health` are `system_developer`-only regardless of permissions).

**Backend:** `requireRoles([ROLES.SUPER_ADMIN, ROLES.ADMIN])` in a route  
**Frontend:** `role: 'super_admin'` or `roles: ['super_admin', 'admin']` on an `APP_ROUTES` entry

---

## Layer 2 — Permission (`backend/lib/permissions.js`)

Fine-grained capability flags. These are what actually gate most API calls.

**How the defaults work:**
- `ROLE_PERMISSIONS` in `permissions.js` is the hardcoded default set per role
- A tenant's `super_admin` can customize their tenant's role→permission mapping via `role_permissions` DB table
- At request time: `getCachedPermissions(role, tenantId)` in `lib/permissionCache.js` checks the DB first, falls back to the hardcoded defaults

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

3. Decide which default roles get it in `ROLE_PERMISSIONS`:
   ```js
   export const ROLE_PERMISSIONS = {
     super_admin: [...existing, PERMISSIONS.MANAGE_YOUR_THING],
     admin:       [...existing, PERMISSIONS.MANAGE_YOUR_THING],
     manager:     [...existing], // leave out if managers shouldn't have it
     operator:    [...existing],
   };
   ```

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
Has the tenant customized this role's permissions? Check `role_permissions` table for (role, tenantId).
→ `getRolePermissions(role, tenantId)` in `lib/permissionCache.js`

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
| Only `super_admin` can access `/platform` | Role (`requireRoles`) |
| Only users with `manage_finance_accounts` can add transactions | Permission (`requirePermission`) |
| Tenant A doesn't have the retail POS module at all | Feature flag (`requireFeature`) |
| A manager needs to be given an extra permission for one tenant | Customize via `role_permissions` table (UI: Permissions page) |
| Hiding a button for users who can't do an action | `can('permission_key')` in the component |
| Hiding a nav item for tenants without the feature | `feature:` field in `APP_ROUTES` + `hasFeature()` in components |
