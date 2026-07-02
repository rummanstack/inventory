import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CornerDownLeft, Search, X } from 'lucide-react';
import { useInventoryApp } from './useInventoryApp.jsx';
import { APP_ROUTES } from './routes.js';

const RECENT_PAGES_KEY = 'stockledger.recentPages';

function Highlight({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-[var(--secondary)]">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function CommandPalette({ open, onClose }) {
  const {
    t, can, hasFeature, user,
    productDirectory, dsrDirectory, srDirectory,
    supplierDirectory, shopDirectory, retailCustomerDirectory,
  } = useInventoryApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentPaths, setRecentPaths] = useState([]);
  const inputRef = useRef(null);
  const activeRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      try {
        setRecentPaths(JSON.parse(localStorage.getItem(RECENT_PAGES_KEY) || '[]'));
      } catch {
        setRecentPaths([]);
      }
      const id = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const q = query.trim().toLowerCase();
  const match = (str) => (str || '').toLowerCase().includes(q);

  // Recent pages — only when query is empty
  const recentResults = useMemo(() => {
    if (q) return [];
    return recentPaths
      .map((path) => {
        const route = APP_ROUTES.find((r) => r.path === path);
        if (!route) return null;
        if (route.group === 'developer' || route.group === 'hidden') return null;
        if (route.permission && !can(route.permission)) return null;
        if (route.feature && !hasFeature(route.feature)) return null;
        if (route.roles && !route.roles.includes(user?.role)) return null;
        if (route.role && user?.role !== route.role && user?.role !== 'system_developer') return null;
        return {
          id: `recent:${route.id}`,
          label: t(route.labelKey),
          sublabel: t(`navGroups.${route.group}`),
          icon: route.icon,
          path: route.path,
          group: 'Recent',
        };
      })
      .filter(Boolean);
  }, [q, recentPaths, can, hasFeature, user, t]);

  // Pages — always visible, filtered by query when typed
  const pageResults = useMemo(() => {
    return APP_ROUTES.filter((route) => {
      if (route.group === 'developer' || route.group === 'hidden') return false;
      if (route.permission && !can(route.permission)) return false;
      if (route.feature && !hasFeature(route.feature)) return false;
      if (route.roles && !route.roles.includes(user?.role)) return false;
      if (route.role && user?.role !== route.role && user?.role !== 'system_developer') return false;
      if (q && !t(route.labelKey).toLowerCase().includes(q)) return false;
      return true;
    }).map((route) => ({
      id: `page:${route.id}`,
      label: t(route.labelKey),
      sublabel: t(`navGroups.${route.group}`),
      icon: route.icon,
      path: route.path,
      group: 'Pages',
    }));
  }, [q, can, hasFeature, user, t]);

  // Data items — only when query is non-empty
  const dataResults = useMemo(() => {
    if (!q) return [];
    const results = [];

    if (hasFeature('products') && can('view_products')) {
      productDirectory
        .filter((p) => match(p.name) || match(p.sku) || match(p.brand) || match(p.model) || match(p.category))
        .slice(0, 5)
        .forEach((p) => results.push({
          id: `product:${p.id}`,
          label: p.name,
          sublabel: [p.category, p.brand && p.model ? `${p.brand} ${p.model}` : (p.brand || p.model)].filter(Boolean).join(' · '),
          path: '/products',
          group: t('nav.products'),
        }));
    }

    if (hasFeature('dsrs') && can('view_dsrs')) {
      dsrDirectory
        .filter((d) => match(d.name) || match(d.phone) || match(d.area))
        .slice(0, 4)
        .forEach((d) => results.push({
          id: `dsr:${d.id}`,
          label: d.name,
          sublabel: [d.phone, d.area].filter(Boolean).join(' · '),
          path: '/dsrs',
          group: t('nav.dsrs'),
        }));
    }

    if (hasFeature('customers') && can('view_customers')) {
      shopDirectory
        .filter((s) => match(s.name) || match(s.phone) || match(s.area))
        .slice(0, 4)
        .forEach((s) => results.push({
          id: `shop:${s.id}`,
          label: s.name,
          sublabel: [s.phone, s.area].filter(Boolean).join(' · '),
          path: '/customers',
          group: t('nav.shops'),
        }));
    }

    if (hasFeature('retail-customers') && can('view_retail_customers')) {
      retailCustomerDirectory
        .filter((c) => match(c.name) || match(c.phone))
        .slice(0, 4)
        .forEach((c) => results.push({
          id: `rc:${c.id}`,
          label: c.name,
          sublabel: c.phone || '',
          path: '/retail-customers',
          group: t('nav.retailCustomers'),
        }));
    }

    if (hasFeature('suppliers') && can('view_suppliers')) {
      supplierDirectory
        .filter((s) => match(s.name) || match(s.phone))
        .slice(0, 4)
        .forEach((s) => results.push({
          id: `sup:${s.id}`,
          label: s.name,
          sublabel: s.phone || '',
          path: '/suppliers',
          group: t('nav.suppliers'),
        }));
    }

    if (hasFeature('srs') && can('view_srs')) {
      srDirectory
        .filter((s) => match(s.name) || match(s.phone))
        .slice(0, 4)
        .forEach((s) => results.push({
          id: `sr:${s.id}`,
          label: s.name,
          sublabel: s.phone || '',
          path: '/srs',
          group: t('nav.srs'),
        }));
    }

    return results;
  }, [q, productDirectory, dsrDirectory, srDirectory, supplierDirectory, shopDirectory, retailCustomerDirectory, can, hasFeature, t]);

  const allResults = useMemo(() => [...recentResults, ...pageResults, ...dataResults], [recentResults, pageResults, dataResults]);

  useEffect(() => { setActiveIndex(0); }, [allResults.length]);

  // Build grouped display list with stable indices for keyboard nav
  const displayList = useMemo(() => {
    const list = [];
    let currentGroup = null;
    let idx = 0;
    for (const result of allResults) {
      if (result.group !== currentGroup) {
        list.push({ type: 'header', label: result.group });
        currentGroup = result.group;
      }
      list.push({ type: 'item', result, idx: idx++ });
    }
    return list;
  }, [allResults]);

  function handleSelect(result) {
    navigate(result.path);
    onClose();
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const result = allResults[activeIndex];
      if (result) handleSelect(result);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[8vh]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10">

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search size={18} className="shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, products, customers, suppliers…"
            className="min-w-0 flex-1 bg-transparent text-base text-slate-900 placeholder-slate-400 outline-none"
          />
          {query ? (
            <button
              className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            >
              <X size={15} />
            </button>
          ) : (
            <div className="hidden shrink-0 items-center gap-1 sm:flex">
              <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">Ctrl</kbd>
              <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">K</kbd>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {allResults.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Search size={28} className="text-slate-200" />
              <p className="text-sm font-medium text-slate-400">
                {q ? 'No results found.' : 'Type to search pages, products, customers and more.'}
              </p>
            </div>
          ) : (
            displayList.map((entry, i) => {
              if (entry.type === 'header') {
                return (
                  <p key={`h${i}`} className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {entry.label}
                  </p>
                );
              }
              const { result, idx } = entry;
              const active = activeIndex === idx;
              const Icon = result.icon;
              return (
                <div
                  key={result.id}
                  ref={active ? activeRef : null}
                  className={`mx-2 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${active ? 'bg-[var(--secondary-soft)]' : 'hover:bg-slate-50'}`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => handleSelect(result)}
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-[var(--secondary-soft)]' : 'bg-slate-100'}`}>
                    {Icon
                      ? <Icon size={14} className={active ? 'text-[var(--secondary)]' : 'text-slate-500'} />
                      : <ArrowRight size={14} className={active ? 'text-[var(--secondary)]' : 'text-slate-500'} />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold ${active ? 'text-[var(--secondary-strong)]' : 'text-slate-800'}`}>
                      <Highlight text={result.label} query={query} />
                    </p>
                    {result.sublabel && (
                      <p className="truncate text-[11px] text-slate-400">{result.sublabel}</p>
                    )}
                  </div>
                  {active && <CornerDownLeft size={13} className="shrink-0 text-[var(--secondary)]" />}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {allResults.length > 0 && (
          <div className="flex items-center gap-4 border-t border-slate-100 px-4 py-2">
            <span className="text-[11px] text-slate-400"><kbd className="font-mono font-bold">↑↓</kbd> navigate</span>
            <span className="text-[11px] text-slate-400"><kbd className="font-mono font-bold">↵</kbd> open</span>
            <span className="text-[11px] text-slate-400"><kbd className="font-mono font-bold">esc</kbd> close</span>
          </div>
        )}
      </div>
    </div>
  );
}
