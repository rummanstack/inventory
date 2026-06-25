import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, Ellipsis, LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { Avatar, cx } from '../components/ui';
import { APP_ROUTES, SIDEBAR_SECTIONS } from './routes';
import logoMark from '../assets/stockledger-logo-mark.svg';

const COLLAPSED_GROUPS_STORAGE_KEY = 'stockledger.sidebarCollapsedGroups';

// Entire sections that live only in the "More" flyout
const MORE_SECTIONS = new Set(['warranty', 'reports', 'system', 'developer']);
// Individual route IDs moved to "More" (from mixed sections)
const MORE_ROUTE_IDS = new Set([
  'quotations', 'retailer-promotions',
  'retail-customer-retention',
  'product-serials', 'damaged-stock',
  'supplier-statement',
  'customers', 'dsr-finance',
  'profit',
]);

function isMoreRoute(route) {
  return MORE_SECTIONS.has(route.group) || MORE_ROUTE_IDS.has(route.id);
}

function loadCollapsedGroups() {
  try {
    const stored = JSON.parse(localStorage.getItem(COLLAPSED_GROUPS_STORAGE_KEY) || '{}');
    return typeof stored === 'object' && stored ? stored : {};
  } catch {
    return {};
  }
}

function SidebarTooltip({ label, show, children }) {
  const [pos, setPos] = useState(null);
  if (!show) return children;
  return (
    <div
      onMouseEnter={(e) => {
        if (window.innerWidth < 1024) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setPos({ top: rect.top + rect.height / 2 });
      }}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos ? createPortal(
        <div
          style={{ top: pos.top, left: 76 }}
          className="pointer-events-none fixed z-[9999] -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg"
        >
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-900" />
          {label}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

export default function AppSidebar({ mobileOpen, setMobileOpen, user, tenant, language, onLanguageChange, onLogout, t, can, hasFeature, collapsed, onToggleCollapsed }) {
  const location = useLocation();
  const [collapsedGroups, setCollapsedGroups] = useState(loadCollapsedGroups);
  const [moreOpen, setMoreOpen] = useState(false);
  const closeTimer = useRef(null);

  // Build all route groups (same permission/feature logic as before)
  const allGroupedRoutes = SIDEBAR_SECTIONS
    .map((section) => ({
      section,
      label: t(`navGroups.${section}`),
      routes: APP_ROUTES.filter((route) => {
        if (route.group !== section) return false;
        if (section === 'developer') {
          if (user?.role === 'system_developer') return true;
          if (route.role) return user?.role === route.role;
          if (route.roles) return route.roles.includes(user?.role);
          if (route.permission) return can(route.permission);
          return false;
        }
        if (user?.role === 'system_developer') return route.id !== 'org-settings';
        if (route.permission && !can(route.permission)) return false;
        if (route.role && user?.role !== route.role) return false;
        if (route.roles && !route.roles.includes(user?.role)) return false;
        if (!hasFeature(route.feature)) return false;
        return true;
      }),
    }))
    .filter((item) => item.routes.length > 0);

  // Primary groups — shown directly in sidebar
  const primaryGroupedRoutes = allGroupedRoutes
    .map((g) => ({ ...g, routes: g.routes.filter((r) => !isMoreRoute(r)) }))
    .filter((g) => g.routes.length > 0);

  // "More" groups — shown in the flyout (and on mobile inline)
  const moreGroupedRoutes = allGroupedRoutes
    .map((g) => ({ ...g, routes: g.routes.filter((r) => isMoreRoute(r)) }))
    .filter((g) => g.routes.length > 0);

  const moreIsActive = moreGroupedRoutes.some((g) =>
    g.routes.some((r) => location.pathname === r.path || location.pathname.startsWith(`${r.path}/`)),
  );

  // Auto-expand group when its route is active
  useEffect(() => {
    const activeSection = allGroupedRoutes.find((group) =>
      group.routes.some((route) => location.pathname === route.path || location.pathname.startsWith(`${route.path}/`)),
    )?.section;
    if (activeSection && collapsedGroups[activeSection]) {
      setCollapsedGroups((current) => {
        const next = { ...current };
        delete next[activeSection];
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_GROUPS_STORAGE_KEY, JSON.stringify(collapsedGroups));
  }, [collapsedGroups]);

  function toggleGroup(section) {
    setCollapsedGroups((current) => ({ ...current, [section]: !current[section] }));
  }

  function openMore() {
    if (window.innerWidth < 1024) return;
    clearTimeout(closeTimer.current);
    setMoreOpen(true);
  }

  function scheduleCloseMore() {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMoreOpen(false), 150);
  }

  // Close flyout when navigating
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  function renderRouteLink(route) {
    const Icon = route.icon;
    const label = t(route.labelKey);
    return (
      <SidebarTooltip key={route.id} label={label} show={collapsed}>
        <NavLink
          to={route.path}
          end
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            cx(
              'group/link relative flex w-full items-center gap-3 rounded-xl py-2.5 pr-3 text-sm font-semibold transition',
              collapsed && 'lg:justify-center lg:gap-0 lg:px-0 lg:pr-0',
              isActive
                ? collapsed
                  ? 'pl-4 lg:pl-0'
                  : 'bg-[linear-gradient(135deg,var(--secondary-strong),var(--brand-strong))] pl-4 text-white shadow-[0_10px_20px_var(--secondary-shadow)] before:absolute before:left-0 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-white'
                : 'pl-3 text-slate-700 hover:bg-white/80 hover:text-slate-950',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span className={cx(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition',
                isActive
                  ? collapsed
                    ? 'bg-[linear-gradient(135deg,var(--secondary-strong),var(--brand-strong))] text-white shadow-[0_6px_16px_var(--secondary-shadow)]'
                    : 'bg-white/20 text-white'
                  : 'bg-white/70 text-slate-500 group-hover/link:bg-white group-hover/link:text-slate-900',
              )}>
                <Icon size={17} />
              </span>
              <span className={cx('flex-1 truncate', collapsed && 'lg:hidden')}>{label}</span>
            </>
          )}
        </NavLink>
      </SidebarTooltip>
    );
  }

  function renderFlyoutLink(route) {
    const Icon = route.icon;
    const label = t(route.labelKey);
    return (
      <NavLink
        key={route.id}
        to={route.path}
        end
        onClick={() => { setMobileOpen(false); setMoreOpen(false); }}
        className={({ isActive }) =>
          cx(
            'group/link relative flex w-full items-center gap-3 rounded-xl py-2.5 pl-3 pr-3 text-sm font-semibold transition',
            isActive
              ? 'bg-[linear-gradient(135deg,var(--secondary-strong),var(--brand-strong))] text-white shadow-[0_10px_20px_var(--secondary-shadow)] before:absolute before:left-0 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-white'
              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950',
          )
        }
      >
        {({ isActive }) => (
          <>
            <span className={cx(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition',
              isActive
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-500 group-hover/link:bg-slate-200 group-hover/link:text-slate-900',
            )}>
              <Icon size={17} />
            </span>
            <span className="flex-1 truncate">{label}</span>
          </>
        )}
      </NavLink>
    );
  }

  function renderSectionGroup({ section, label, routes }, renderLink) {
    if (section === 'overview') {
      return (
        <div key={section} className="space-y-1.5">
          {routes.map((route) => renderLink(route))}
        </div>
      );
    }
    const isGroupCollapsed = Boolean(collapsedGroups[section]);
    return (
      <div key={section} className="space-y-2">
        <div className={collapsed ? 'lg:hidden' : ''}>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition hover:bg-white/70"
            onClick={() => toggleGroup(section)}
            aria-expanded={!isGroupCollapsed}
          >
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <ChevronDown size={16} className={cx('shrink-0 text-slate-400 transition-transform', isGroupCollapsed && '-rotate-90')} />
          </button>
        </div>
        <div className={cx('hidden', collapsed && 'lg:block lg:px-1')}>
          <hr className="border-slate-100" />
        </div>
        <div className={cx('space-y-1.5', isGroupCollapsed && (collapsed ? 'hidden lg:block' : 'hidden'))}>
          {routes.map((route) => renderLink(route))}
        </div>
      </div>
    );
  }

  // Flyout left offset: sidebar width (68 or 288) + 8px gap
  const flyoutLeft = collapsed ? 76 : 296;

  return (
    <>
      <div
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-[#e4e2f2] bg-[#f5f4fb] py-5 text-slate-950 shadow-[0_24px_60px_rgba(var(--slate-900),0.08)] transition-[width,transform] duration-300 lg:translate-x-0',
          'w-[min(18rem,85vw)] px-4',
          collapsed ? 'lg:w-[68px] lg:px-2' : 'lg:w-72',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header */}
        <div className="relative flex items-center justify-between px-2">
          <div className={cx('flex min-w-0 flex-1 items-center gap-3', collapsed && 'lg:hidden')}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-[0_8px_18px_rgba(var(--slate-900),0.06)]">
              <img src={tenant?.logoUrl || logoMark} alt="" className="h-full w-full object-contain p-1.5" />
            </div>
            <div className="min-w-0">
              <h2 className="mt-1 truncate text-xl font-black tracking-normal text-slate-950">{tenant?.name || t('app.brand')}</h2>
              {tenant?.plan ? (
                <p className="text-xs font-semibold capitalize text-slate-500">{tenant.plan}</p>
              ) : t('app.subtitle') ? (
                <p className="text-xs font-semibold text-slate-500">{t('app.subtitle')}</p>
              ) : null}
            </div>
          </div>
          <div className={cx('hidden', collapsed && 'lg:flex lg:flex-1 lg:justify-center')}>
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <img src={tenant?.logoUrl || logoMark} alt="" className="h-full w-full object-contain p-1" />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#dddaf0] bg-white/70 text-slate-600 transition hover:border-[#c8c4e6] hover:bg-white hover:text-slate-950 lg:hidden"
              title={t('common.closeMenu')}
              onClick={() => setMobileOpen(false)}
            >
              <X size={18} />
            </button>
            <button
              type="button"
              className="hidden h-9 w-9 items-center justify-center rounded-xl border border-[#dddaf0] bg-white/70 text-slate-600 transition hover:border-[#c8c4e6] hover:bg-white hover:text-slate-950 lg:inline-flex"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={onToggleCollapsed}
            >
              {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="premium-scrollbar relative mt-8 min-h-0 flex-1 overflow-y-auto pb-6 pr-1">
          <div className="space-y-5">
            {/* Primary sections */}
            {primaryGroupedRoutes.map((group) => renderSectionGroup(group, renderRouteLink))}

            {/* Mobile: show "more" sections inline */}
            {moreGroupedRoutes.length > 0 ? (
              <div className="lg:hidden space-y-5">
                {moreGroupedRoutes.map((group) => renderSectionGroup(group, renderRouteLink))}
              </div>
            ) : null}

            {/* Desktop: "More" button that triggers the flyout */}
            {moreGroupedRoutes.length > 0 ? (
              <div
                className="hidden lg:block"
                onMouseEnter={openMore}
                onMouseLeave={scheduleCloseMore}
              >
                <SidebarTooltip label="More" show={collapsed}>
                  <button
                    type="button"
                    className={cx(
                      'group/link relative flex w-full items-center gap-3 rounded-xl py-2.5 pr-3 text-sm font-semibold transition',
                      collapsed ? 'lg:justify-center lg:gap-0 lg:px-0 lg:pr-0' : 'pl-3',
                      moreIsActive || moreOpen
                        ? collapsed
                          ? 'text-slate-950'
                          : 'bg-white/80 text-slate-950'
                        : 'text-slate-500 hover:bg-white/80 hover:text-slate-700',
                    )}
                  >
                    <span className={cx(
                      'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition',
                      moreIsActive || moreOpen
                        ? 'bg-white text-slate-700 shadow-sm'
                        : 'bg-white/70 text-slate-400 group-hover/link:bg-white group-hover/link:text-slate-700',
                    )}>
                      <Ellipsis size={17} />
                      {moreIsActive ? (
                        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#373373]" />
                      ) : null}
                    </span>
                    <span className={cx('flex-1 truncate text-left', collapsed && 'lg:hidden')}>More</span>
                    {!collapsed ? (
                      <ChevronDown
                        size={14}
                        className={cx('shrink-0 text-slate-400 transition-transform', moreOpen && 'rotate-180')}
                      />
                    ) : null}
                  </button>
                </SidebarTooltip>
              </div>
            ) : null}
          </div>
        </nav>

        {/* Bottom: user profile */}
        <SidebarTooltip label={user?.name} show={collapsed}>
          <Link
            to="/profile"
            onClick={() => setMobileOpen(false)}
            title={t('profile.online')}
            className={cx(
              'mt-4 flex items-center rounded-2xl border border-[#dddaf0] bg-white/70 px-3 py-2.5 text-slate-950 transition hover:border-[#c8c4e6] hover:bg-white',
              collapsed ? 'lg:justify-center' : 'gap-3',
            )}
          >
            <Avatar name={user?.name} imageUrl={user?.avatarUrl} size={40} status="online" />
            <div className={cx('min-w-0 flex-1', collapsed && 'lg:hidden')}>
              <p className="truncate text-sm font-bold text-slate-950">{user?.name}</p>
              <p className="truncate text-xs font-medium text-slate-500">{user?.email}</p>
            </div>
          </Link>
        </SidebarTooltip>

        {/* Logout */}
        <SidebarTooltip label={t('auth.logout')} show={collapsed}>
          <button
            type="button"
            className={cx(
              'mt-2 inline-flex h-10 w-full items-center gap-2 rounded-2xl border border-[#dddaf0] bg-white/70 px-3 text-sm font-bold text-slate-950 transition hover:border-[#c8c4e6] hover:bg-white',
              collapsed ? 'lg:justify-center' : 'justify-center',
            )}
            onClick={onLogout}
          >
            <LogOut size={16} />
            <span className={cx(collapsed && 'lg:hidden')}>{t('auth.logout')}</span>
          </button>
        </SidebarTooltip>
      </div>

      {/* "More" flyout panel — desktop only, portalled to body */}
      {moreOpen ? createPortal(
        <div
          style={{ left: flyoutLeft }}
          className="fixed bottom-3 top-3 z-[9998] flex w-72 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.13)]"
          onMouseEnter={openMore}
          onMouseLeave={scheduleCloseMore}
        >
          {/* Flyout header */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <Ellipsis size={15} className="text-slate-400" />
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">More</span>
          </div>

          {/* Flyout sections */}
          <div className="premium-scrollbar flex-1 overflow-y-auto p-3">
            <div className="space-y-5">
              {moreGroupedRoutes.map(({ section, label, routes }) => (
                <div key={section} className="space-y-1">
                  <p className="px-2.5 pb-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
                  <div className="space-y-0.5">
                    {routes.map((route) => renderFlyoutLink(route))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      {mobileOpen ? <button type="button" aria-label="Close sidebar overlay" className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setMobileOpen(false)} /> : null}
    </>
  );
}
