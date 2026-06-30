# World-Class SaaS UI Improvements

A prioritized list of UI upgrades — no functionality changes, pure polish.

---

## Priority Order (start here)

| # | Change | Effort |
|---|---|---|
| 1 | Sonner toasts | 30 min |
| 2 | Command palette (⌘K) | 2–3 hrs |
| 3 | Typography + surface depth | 2 hrs |
| 4 | Table row hover + action reveal | 2 hrs |
| 5 | Micro-animations | 3 hrs |
| 6 | Stat cards with sparklines + trend | 4 hrs |
| 7 | Empty state illustrations | 4 hrs |
| 8 | Sidebar collapse + polish | 3 hrs |

---

## 1. Typography Hierarchy

Most UIs look cheap because all text has the same weight. Fix with 4 strict levels — never deviate.

- **Display** — page titles, large numbers (bold, tight tracking)
- **Heading** — section headers, card titles
- **Body** — regular content, descriptions
- **Caption** — labels, helper text, timestamps (muted, smaller)

**Font recommendation:** Switch to `Plus Jakarta Sans` or `Geist` (by Vercel).
Both are free, modern, and used by top SaaS products.

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

body {
  font-family: 'Plus Jakarta Sans', sans-serif;
}
```

Heading tweaks:
```css
h1 { letter-spacing: -0.03em; font-weight: 800; }
h2 { letter-spacing: -0.02em; font-weight: 700; }
.label { letter-spacing: 0.04em; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
```

---

## 2. Command Palette (⌘K / Ctrl+K)

**The single feature that makes an app feel professional.**
Every world-class SaaS has it: Linear, Vercel, Notion, Raycast.

User presses `Ctrl+K`, types "morning issue", and lands there instantly.

**Library:** [cmdk](https://cmdk.paco.me/) — tiny, headless, perfect.

```bash
npm install cmdk
```

What to include in the palette:
- All pages from `APP_ROUTES` (navigate to any page)
- Quick actions: "New Sale", "Add Product", "Create DSR"
- Recent pages (store last 5 in localStorage)
- Search DSRs and products by name

---

## 3. Surface Depth System

Replace flat white with a proper layered surface hierarchy.

```css
/* In your CSS variables */
--bg:          #f8f9fc;   /* page background */
--surface-1:   #ffffff;   /* cards, panels */
--surface-2:   #f1f5f9;   /* table headers, nested panels */
--border:      rgba(0, 0, 0, 0.06);

/* Card shadow — not heavy, just enough to lift */
--shadow-card: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04);
--shadow-modal: 0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08);
```

Apply `box-shadow: var(--shadow-card)` to every `.surface` card.
Remove heavy 1px borders — use shadow + subtle background difference instead.

---

## 4. Micro-animations & Transitions

Small movements that make the UI feel alive.

### Page transitions
```css
/* Wrap page content */
.page-enter {
  animation: pageEnter 0.15s ease-out;
}
@keyframes pageEnter {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### Button press
```css
button:active {
  transform: scale(0.97);
  transition: transform 0.08s ease;
}
```

### Skeleton shimmer (replace pulse with sweep)
```css
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
```

### Number counters on stat cards
Animate the number from 0 → value when the page loads.
Library: `react-countup` or write a simple hook with `requestAnimationFrame`.

---

## 5. Table Redesign

### Row hover with action reveal
```jsx
<tr className="group hover:bg-slate-50 transition-colors">
  <td>...</td>
  {/* Action buttons — hidden until hover */}
  <td className="text-right">
    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
      <button>Edit</button>
      <button>Delete</button>
    </div>
  </td>
</tr>
```

### Other table improvements
- Remove vertical borders — use only `divide-y` horizontal dividers
- Sticky `<thead>` on scroll: `position: sticky; top: 0; z-index: 10;`
- Numeric columns: right-align + `font-variant-numeric: tabular-nums` (monospace numbers)
- Left accent on active/selected row: `border-l-2 border-indigo-500`
- Sortable headers: show `↑` / `↓` icon, cursor pointer

---

## 6. Stat Cards with Sparklines + Trend

Current cards show a number. World-class adds context.

**Add to each stat card:**
- Mini 7-day sparkline (tiny line chart, no axes)
- Trend pill: `+12% vs last week` in green/red
- Trend arrow icon (↑ or ↓)

```jsx
// Recharts sparkline (already using recharts)
import { LineChart, Line, ResponsiveContainer } from 'recharts';

<ResponsiveContainer width="100%" height={40}>
  <LineChart data={last7Days}>
    <Line type="monotone" dataKey="value" stroke="#6366f1" dot={false} strokeWidth={2} />
  </LineChart>
</ResponsiveContainer>

// Trend pill
<span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
  trend > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
}`}>
  {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
</span>
```

---

## 7. Empty States with Illustrations

Replace icon + text with something warmer and more human.

**Free illustration source:** [undraw.co](https://undraw.co) — pick illustrations that match your brand color.

Structure:
```jsx
<div className="flex flex-col items-center py-16 text-center">
  <img src="/illustrations/empty-products.svg" className="w-40 mb-6 opacity-80" />
  <h3 className="text-lg font-bold text-slate-800">No products yet</h3>
  <p className="mt-1 text-sm text-slate-500 max-w-xs">
    Add your first product to start tracking stock and sales.
  </p>
  <button className="btn-primary mt-6">
    <Plus size={16} /> Add Product
  </button>
</div>
```

Optional: subtle float animation on the illustration.
```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-8px); }
}
.illustration { animation: float 3s ease-in-out infinite; }
```

---

## 8. Toast Notifications — Switch to Sonner

Current toasts are basic. **Sonner** is the industry standard now (used by shadcn/ui, Vercel, etc.).

```bash
npm install sonner
```

```jsx
// In your root layout
import { Toaster } from 'sonner';
<Toaster position="bottom-right" richColors expand />

// Replace current toast calls with:
import { toast } from 'sonner';
toast.success('Product saved');
toast.error('Failed to save');
toast.promise(saveProduct(), {
  loading: 'Saving...',
  success: 'Product saved!',
  error: 'Failed to save.',
});
```

Features you get for free:
- Progress bar that drains over auto-dismiss duration
- Stack from bottom-right, newest on top
- `richColors` mode for green/red/amber
- Promise-based toast (loading → success/error automatically)

---

## 9. Modal Improvements

### Backdrop blur
```jsx
// Replace solid overlay with blur
<div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
```

### Enter animation
```css
@keyframes modalEnter {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
.modal {
  animation: modalEnter 0.15s ease-out;
}
```

### Danger confirmation pattern
Delete actions should open a separate red-themed mini-dialog, not an inline button.
```jsx
<div className="rounded-xl border border-red-200 bg-red-50 p-4">
  <p className="text-sm font-semibold text-red-800">Delete this product?</p>
  <p className="text-xs text-red-600 mt-1">This cannot be undone.</p>
  <div className="flex gap-2 mt-3">
    <button className="btn-secondary text-xs">Cancel</button>
    <button className="bg-red-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold">Delete</button>
  </div>
</div>
```

---

## 10. Sidebar Polish

### Icon-only collapse mode
Add a collapse button at the bottom. When collapsed:
- Sidebar shrinks to 64px showing only icons
- Smooth `width` transition: `transition: width 0.2s ease`
- Tooltip on hover showing the label
- Store collapsed state in `localStorage`

### Active item pill
```jsx
// Active nav item
<div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
  isActive
    ? 'bg-indigo-600 text-white shadow-sm'
    : 'text-slate-600 hover:bg-slate-100'
}`}>
```

### Tenant switcher at top
Replace plain tenant name with:
```jsx
<button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-slate-100">
  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-black">
    {tenant.name[0]}
  </div>
  <span className="flex-1 text-left text-sm font-semibold text-slate-800 truncate">{tenant.name}</span>
  <ChevronsUpDown size={14} className="text-slate-400" />
</button>
```

---

## 11. Page Header Consistency

Every page should follow the same anatomy — currently some pages differ.

```
┌─────────────────────────────────────────────────────────┐
│  [Eyebrow: nav group name]          [Primary Action Btn] │
│  [Page Title — large, bold]         [Secondary Actions]  │
│  [Short description — muted]                             │
├─────────────────────────────────────────────────────────┤
│  [Filter bar / date picker / search / tabs]              │
└─────────────────────────────────────────────────────────┘
```

Actions always right-aligned. Eyebrow always shows which section you're in.

---

## 12. Color & Brand Consistency Rules

Pick **one** brand color (you're using indigo — keep it). Rules:

| Use | Color |
|---|---|
| Primary buttons, active nav, focus rings, chart primary | Brand (indigo-600) |
| Success, positive trend, stock in | Emerald |
| Warning, low stock, pending | Amber |
| Danger, negative trend, delete | Red |
| Info, neutral badges | Slate/Blue |

**Never** use the brand color for semantic states (don't use indigo for success or warning).
**Never** use more than 2 colors in any single component.

---

## Bonus: Dark Mode (future)

Your CSS variable system already supports it — just add:
```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f1117;
    --surface-1: #1a1d27;
    --surface-2: #222535;
    /* ... */
  }
}
```

Or add a manual toggle and store preference in localStorage.

---

*Written: 2026-06-30*
