---
name: frontend-patterns
description: Use when adding or modifying anything in the frontend — new pages, new components, UI changes, viewmodels, API clients, i18n, or the design system. Covers the full structure, how data flows, the component library, design tokens, color rules, date/time gotchas, and how to add a page end-to-end.
---

# Frontend Patterns — How to Build Things in StockLedger's UI

The frontend is **React 18 + Vite + Tailwind**, organized around features. Once you understand the data flow and where things live, adding new UI is very predictable.

---

## How the App Is Organized

```
src/
  app/
    routes.js            APP_ROUTES — the single source of truth for every page
    useInventoryApp.jsx  The big context provider (user, tenant, i18n, toasts, confirm dialogs)
    App.jsx              Root: InventoryAppProvider + BrowserRouter + Toaster
    AppLayout.jsx        Authenticated shell: sidebar + top header + <Outlet />
    AppSidebar.jsx       Sidebar nav, grouped by SIDEBAR_SECTIONS
    CommandPalette.jsx   Ctrl+K search palette
  features/<name>/
    pages/<Name>Page.jsx          Route-level component (what gets rendered for a URL)
    viewmodels/use<Name>ViewModel.js  Data fetching + local state (a hook, not a class)
    components/                   Presentational pieces specific to this feature
  components/
    ui.jsx               Re-exports everything from ui/ — import from here
    ui/
      DataDisplay.jsx    StatCard, SectionHeader, Badge, Sparkline, ActivityHeatmap
      Feedback.jsx       Alert, EmptyState, PageLoadingState, Skeleton variants
      Forms.jsx          Input, Select, Checkbox, etc. (Tailwind class-based)
      Modal.jsx          Modal, ConfirmationDialog
      Table.jsx          TableSkeleton, Pagination
      Layout.jsx         cx() utility
  services/
    api/client.js        Base fetch: adds tenant header, base URL, normalizes errors
    api/<x>Api.js        Thin wrappers per resource (one file per backend resource group)
    inventoryApi.js      Aggregates all api/* modules into one object the app uses
  utils/
    calculations.js      formatCurrency, formatDate, formatDateTime, formatNumber, etc.
  i18n/
    locales/en.js        English strings (source of truth)
    locales/bn.js        Bengali strings
  hooks/
    usePagedList.js      Paginated list with visibility-based refresh + manual reload
    usePagination.js     Page/pageSize state
```

---

## Data Flow for a Page

```
APP_ROUTES entry
  → GuardedAppRoute (checks permission + feature flag)
    → <NamePage />
      → useNameViewModel()  (fetches data, manages local state)
        → inventoryApi.someCall()
          → api/someApi.js
            → client.js (fetch + tenant header)
              → backend API
```

The viewmodel is the **only place** that talks to the API. The page component is purely presentational — it reads from the viewmodel and calls viewmodel functions on user interaction.

---

## Adding a New Page End-to-End

### 1. Create the API client method (`src/services/api/<x>Api.js`)

```js
export const yourThingApi = {
  list: ({ page, pageSize, dateFrom, dateTo }) =>
    client.get('/your-things', { page, pageSize, dateFrom, dateTo }),

  create: (data) => client.post('/your-things', data),

  delete: (id) => client.delete(`/your-things/${id}`),
};
```

Then register it in `src/services/inventoryApi.js`:
```js
import { yourThingApi } from './api/yourThingApi.js';
export const inventoryApi = {
  // ... existing ...
  listYourThings: yourThingApi.list,
  createYourThing: yourThingApi.create,
  deleteYourThing: yourThingApi.delete,
};
```

### 2. Create the viewmodel (`src/features/<name>/viewmodels/use<Name>ViewModel.js`)

```js
import { useState } from 'react';
import { usePagedList } from '../../../hooks/usePagedList';
import { inventoryApi } from '../../../services/inventoryApi';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';

export function useYourThingViewModel() {
  const { pushToast, confirm } = useInventoryApp();
  const [modalOpen, setModalOpen] = useState(false);

  const list = usePagedList(
    ({ page, pageSize }) => inventoryApi.listYourThings({ page, pageSize }),
    [], // extra deps that re-trigger a fetch when changed
  );

  async function handleCreate(data) {
    try {
      await inventoryApi.createYourThing(data);
      pushToast('success', 'Created successfully');
      setModalOpen(false);
      list.reload();
    } catch (err) {
      pushToast('error', err.message);
    }
  }

  async function handleDelete(id) {
    const ok = await confirm({ title: 'Delete?', description: 'This cannot be undone.' });
    if (!ok) return;
    try {
      await inventoryApi.deleteYourThing(id);
      pushToast('success', 'Deleted');
      list.reload();
    } catch (err) {
      pushToast('error', err.message);
    }
  }

  return { ...list, modalOpen, setModalOpen, handleCreate, handleDelete };
}
```

### 3. Create the page component (`src/features/<name>/pages/<Name>Page.jsx`)

```jsx
import { Plus } from 'lucide-react';
import { SectionHeader, EmptyState, Badge, Pagination, TableSkeleton } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { useYourThingViewModel } from '../viewmodels/useYourThingViewModel';

export default function YourThingPage() {
  const { t, can } = useInventoryApp();
  const vm = useYourThingViewModel();
  const canManage = can('manage_your_thing');

  return (
    <div>
      <SectionHeader
        eyebrow={t('navGroups.yourGroup')}
        title={t('nav.yourThing')}
        description={t('yourThing.description')}
        action={canManage ? (
          <button className="btn-primary" onClick={() => vm.setModalOpen(true)}>
            <Plus size={18} /> {t('yourThing.add')}
          </button>
        ) : null}
      />

      <div className="surface overflow-hidden">
        {vm.loading ? (
          <TableSkeleton columns={4} />
        ) : vm.items.length === 0 ? (
          <EmptyState title={t('yourThing.empty')} />
        ) : (
          <table className="w-full">
            {/* ... */}
          </table>
        )}
        <Pagination page={vm.page} totalPages={vm.totalPages} onPageChange={vm.setPage} />
      </div>
    </div>
  );
}
```

### 4. Register the route (`src/app/routes.js`)

```js
import { Package } from 'lucide-react'; // pick an icon
import YourThingPage from '../features/your-thing/pages/YourThingPage';

// Add to APP_ROUTES array:
{
  id: 'your-thing',
  path: '/your-thing',
  labelKey: 'nav.yourThing',        // must exist in en.js + bn.js
  icon: Package,
  component: YourThingPage,
  group: 'inventory',               // must be one of SIDEBAR_SECTIONS
  permission: 'manage_your_thing',  // must match PERMISSIONS value in backend
  feature: 'your-feature-key',      // must match TENANT_FEATURES key in backend
},
```

### 5. Add i18n strings (`src/i18n/locales/en.js` + `bn.js`)

```js
// en.js
nav: {
  // ...existing...
  yourThing: 'Your Things',
},
yourThing: {
  description: 'Manage your things.',
  add: 'Add Thing',
  empty: 'No things yet.',
},
```

---

## The `useInventoryApp()` Context

This is the main context hook. Everything global lives here. The most-used things:

```js
const {
  user,           // current user object (id, name, email, role, etc.)
  tenant,         // current tenant object
  t,              // i18n translation function: t('key') → localized string
  language,       // 'en' or 'bn'
  can,            // can('permission_key') → boolean
  hasFeature,     // hasFeature('feature-key') → boolean
  confirm,        // async confirm({ title, description, tone, consequences }) → boolean
  pushToast,      // pushToast('success'|'error'|'warning'|'info', title, message?)
  productDirectory, // cached list of all products (lightweight, for dropdowns)
  dsrDirectory,   // cached list of all DSRs
  today,          // today's date as YYYY-MM-DD string
} = useInventoryApp();
```

---

## The Component Library

Everything is in `src/components/ui.jsx`. Import from there:

```js
import { SectionHeader, StatCard, Badge, Alert, EmptyState, Modal, Pagination } from '../../../components/ui.jsx';
```

### SectionHeader
The standard page header. Use it at the top of every page.
```jsx
<SectionHeader
  eyebrow="Inventory"       // small uppercase chip above the title (use t('navGroups.x'))
  title="Products"          // main H1
  description="Manage..."   // subtitle
  action={<button>Add</button>}  // optional right-side action
/>
```

### StatCard
For KPI cards at the top of dashboard/summary pages.
```jsx
<StatCard
  title="Monthly Revenue"
  value={formatCurrency(revenue)}      // formatted string
  rawValue={revenue}                   // number — enables animated counter
  formatter={(n) => formatCurrency(n, language)}  // for animated counter
  icon={TrendingUp}
  tone="emerald"                       // blue | emerald | amber | rose | indigo | slate
  trend={[1200, 1400, 1300, 1600]}    // daily array for sparkline
  trendPct={12.5}                      // % change vs previous period
  trendLabel="vs last month"
/>
```

### Badge
```jsx
<Badge tone="emerald">Active</Badge>
// tones: blue | emerald | amber | rose | slate
```

### Alert
```jsx
<Alert type="success">Saved!</Alert>
<Alert type="error">{errorMessage}</Alert>
// types: success | error | warning | info
```

### Modal
```jsx
<Modal title="Edit Product" onClose={vm.closeModal} size="lg">
  {/* children */}
</Modal>
// ESC key, backdrop click, and scroll lock all work automatically
```

### ConfirmationDialog
Used for destructive actions. Supports `consequences` list for showing impact.
```jsx
<ConfirmationDialog
  open={!!deleteTarget}
  title="Delete Product"
  description="This will also delete all stock movements."
  tone="rose"              // rose | amber | blue | emerald | slate
  consequences={[
    { text: 'All stock movements will be deleted', variant: 'danger' },
    { text: 'Sales history is preserved', variant: 'safe' },
  ]}
  onConfirm={() => handleDelete(deleteTarget.id)}
  onCancel={() => setDeleteTarget(null)}
/>
```

### EmptyState
```jsx
<EmptyState
  icon={Package}
  title="No products yet"
  description="Add your first product to get started."
  action={{ label: 'Add Product', onClick: vm.openCreate }}
/>
```

---

## Design System & Color Rules

### CSS Variables (in `src/i1.css`)
Never hardcode brand colors — use CSS variables so theming works:

| Token | Use |
|---|---|
| `--brand` | Soft brand color (periwinkle) |
| `--brand-strong` | Strong brand color (deep indigo-violet) |
| `--brand-soft` | Very light brand tint (backgrounds) |
| `--secondary` | Alias of `--brand` |
| `--success` | Emerald green |
| `--warning` | Amber |
| `--danger` | Rose/red |

### Semantic Color Rules
```
Primary buttons, active nav, focus rings → brand (bg-brand, text-brand, etc.)
Success, positive trend, stock in        → emerald
Warning, low stock, pending              → amber
Danger, delete, negative trend           → rose
Info, neutral display                    → slate or blue
```

**Never** use `bg-indigo-600` hardcoded for semantic states. Use `bg-brand` or `bg-brand-strong` instead — those re-theme when the brand color changes.

### Tailwind Utility Classes (custom)
```
.surface          rounded card with border and shadow (main content panels)
.panel-strong     elevated surface (modals)
.btn-primary      filled brand-colored button
.btn-secondary    outlined secondary button
.icon-btn         small icon-only button
.input            standard text input
.label            small uppercase field label
.table-cell       standard table cell padding/alignment
.table-head       thead row with consistent styling
.brand-chip       small eyebrow chip (used by SectionHeader)
.page-title       large H1 style (used by SectionHeader)
.muted-chip       quiet info chip
```

---

## `usePagedList` — Pagination with Auto-Refresh

All list pages use this hook. It handles pagination, loading state, error state, and auto-refreshes on tab focus.

```js
const list = usePagedList(
  ({ page, pageSize }) => inventoryApi.listThings({ page, pageSize, ...filters }),
  [filter1, filter2], // extra deps — refetch when these change
);

// list exposes:
list.items        // current page items
list.total        // total count
list.page         // current page number
list.totalPages   // total pages
list.loading      // boolean
list.error        // error message string or ''
list.setPage      // fn(n) — go to page n
list.resetPage    // fn() — go back to page 1 (call when filters change)
list.reload       // fn() — force a refetch (call after create/delete)
```

**Auto-polling pattern** (for pages with live data):
```js
const hasOpenSession = list.items.some((s) => s.isOpen);
const reloadRef = useRef(list.reload);
reloadRef.current = list.reload;

useEffect(() => {
  if (!hasOpenSession) return;
  const id = setInterval(() => reloadRef.current(), 30_000);
  return () => clearInterval(id);
}, [hasOpenSession]);
```

---

## Toasts

Use `pushToast` from `useInventoryApp()`. Powered by **Sonner** under the hood.

```js
pushToast('success', 'Saved!');
pushToast('error', 'Something went wrong', err.message); // title + description
pushToast('warning', 'Stock is low');
pushToast('info', 'Processing...');
```

The `Toaster` component is mounted once in `App.jsx` — don't add it anywhere else.

---

## i18n

All UI text goes through `t()` from `useInventoryApp()`.

```js
const { t, language } = useInventoryApp();
t('nav.products')           // → "Products" or "পণ্য"
t('common.save')            // → "Save" or "সংরক্ষণ"
```

String files:
- `frontend/src/i18n/locales/en.js` — English (source of truth, add new keys here first)
- `frontend/src/i18n/locales/bn.js` — Bengali (add matching translation)

The `language` value is `'en'` or `'bn'`. Pass it to `formatCurrency(amount, language)` and `formatDate(date, language)` for locale-aware formatting.

---

## Date & Time Rules

Always use the utility functions from `src/utils/calculations.js`:

```js
import { formatDate, formatDateTime, formatCurrency, formatNumber } from '../../../utils/calculations.js';

formatDate(row.invoiceDate, language)         // "15 Jan 2024"
formatDateTime(row.createdAt, language)       // "15 Jan 2024, 10:30 AM" for timestamps
                                              // "15 Jan 2024" for DATE-only fields (auto-detected)
formatCurrency(amount, language)              // "৳1,234.50" or "$1,234.50"
formatNumber(count, language)                 // "1,234" with locale digits
```

**The UTC+6 gotcha:** `formatDateTime` automatically handles both cases:
- Full timestamp strings (e.g. `'2024-01-15T10:30:00.000Z'`) → shows date + time ✅
- Date-only strings (e.g. `'2024-01-15'`) → shows date only, no "6:00 AM" ✅

**Never** do `new Date('2024-01-15')` directly — JavaScript treats it as UTC midnight which shows as 6:00 AM in Bangladesh. Always use the utility functions.

---

## Common Mistakes

| Mistake | What goes wrong |
|---|---|
| Importing directly from `ui/DataDisplay.jsx` instead of `ui.jsx` | Works but breaks tree-shaking and consistency |
| Calling the API in the page component instead of the viewmodel | Logic leaks into the view, hard to test/reuse |
| Using hardcoded English strings instead of `t('key')` | Shows wrong language for Bengali users |
| `new Date('2024-01-15')` without `T00:00:00` | Shows "6:00 AM" in UTC+6 |
| Adding a page component but forgetting `APP_ROUTES` entry | Page renders in dev (no gating locally) but is unreachable for real tenants |
| Using `bg-indigo-600` hardcoded | Bypasses the brand CSS variable; won't re-theme |
| Nesting `useInventoryApp()` outside a Provider | Runtime error — always inside `InventoryAppProvider` |
