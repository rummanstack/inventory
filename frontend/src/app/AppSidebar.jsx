import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, LogOut, X } from 'lucide-react';
import { Avatar, cx } from '../components/ui';
import { APP_ROUTES } from './routes';
import LanguageSwitcher from '../components/LanguageSwitcher';
import logoMark from '../assets/stockledger-logo-mark.svg';

const COLLAPSED_GROUPS_STORAGE_KEY = 'stockledger.sidebarCollapsedGroups';

function loadCollapsedGroups() {
  try {
    const stored = JSON.parse(localStorage.getItem(COLLAPSED_GROUPS_STORAGE_KEY) || '{}');
    return typeof stored === 'object' && stored ? stored : {};
  } catch {
    return {};
  }
}

export default function AppSidebar({ mobileOpen, setMobileOpen, user, tenant, language, onLanguageChange, onLogout, t, can, hasFeature }) {
  const location = useLocation();
  const sections = ['overview', 'sales', 'inventory', 'dealer', 'purchases', 'finance', 'reports', 'system', 'settings', 'support', 'developer'];
  const [collapsedGroups, setCollapsedGroups] = useState(loadCollapsedGroups);

  const groupedRoutes = sections
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

  useEffect(() => {
    const activeSection = groupedRoutes.find((group) =>
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

  function renderRouteLink(route) {
    const Icon = route.icon;

    return (
      <NavLink
        key={route.id}
        to={route.path}
        onClick={() => setMobileOpen(false)}
        className={({ isActive }) =>
            cx(
              'group relative flex w-full items-center gap-3 rounded-xl py-2.5 pr-3 text-left text-sm font-semibold transition',
              isActive
              ? 'bg-[rgba(255,255,255,0.14)] pl-4 text-white ring-1 ring-white/12 before:absolute before:left-0 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-white'
              : 'pl-3 text-slate-200 hover:bg-[rgba(255,255,255,0.08)] hover:text-white',
          )
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={cx(
                'flex h-8 w-8 items-center justify-center rounded-md transition',
                isActive
                  ? 'bg-[rgba(255,255,255,0.18)] text-white'
                  : 'bg-[rgba(255,255,255,0.06)] text-slate-200 group-hover:bg-[rgba(255,255,255,0.12)] group-hover:text-white',
              )}
            >
              <Icon size={17} />
            </span>
            <span className="flex-1">{t(route.labelKey)}</span>
          </>
        )}
      </NavLink>
    );
  }

  return (
    <>
      <div
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-[min(18rem,85vw)] flex-col overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,var(--bg-dark)_0%,var(--secondary-strong)_42%,#1f1b4a_100%)] px-4 py-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.35)] backdrop-blur-2xl transition-transform duration-300 lg:w-72 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-16 top-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-20 bottom-24 h-56 w-56 rounded-full bg-[rgba(94,91,142,0.18)] blur-3xl" />
        </div>
        <div className="relative flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.12)] text-white shadow-[0_16px_32px_rgba(0,0,0,0.25)] backdrop-blur">
              <img src={tenant?.logoUrl || logoMark} alt="" className="h-full w-full object-contain p-1.5" />
            </div>
            <div>
              <h2 className="mt-1 text-xl font-black tracking-normal text-white">{tenant?.name || t('app.brand')}</h2>
              {tenant?.plan ? (
                <p className="text-xs font-semibold capitalize text-slate-300">{tenant.plan}</p>
              ) : t('app.subtitle') ? (
                <p className="text-xs font-semibold text-slate-300">{t('app.subtitle')}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[rgba(255,255,255,0.10)] text-white transition hover:border-white/20 hover:bg-[rgba(255,255,255,0.16)] lg:hidden"
            title={t('common.closeMenu')}
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="premium-scrollbar relative mt-8 min-h-0 flex-1 overflow-y-auto pb-6 pr-1">
          <div className="space-y-5">
            {groupedRoutes.map(({ section, label, routes }) => {
              if (section === 'overview') {
                return (
                  <div key={section} className="space-y-1.5">
                    {routes.map((route) => renderRouteLink(route))}
                  </div>
                );
              }

              const isCollapsed = Boolean(collapsedGroups[section]);

              return (
                <div key={section} className="space-y-2">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition hover:bg-[rgba(255,255,255,0.08)]"
                    onClick={() => toggleGroup(section)}
                    aria-expanded={!isCollapsed}
                  >
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">{label}</p>
                    <ChevronDown size={16} className={cx('shrink-0 text-slate-300 transition-transform', isCollapsed && '-rotate-90')} />
                  </button>
                  {isCollapsed ? null : (
                    <div className="space-y-1.5">
                      {routes.map((route) => renderRouteLink(route))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        <Link
          to="/profile"
          onClick={() => setMobileOpen(false)}
          title={t('profile.online')}
          className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.10)] px-3 py-2.5 text-white transition hover:border-white/20 hover:bg-[rgba(255,255,255,0.14)]"
        >
          <Avatar name={user?.name} imageUrl={user?.avatarUrl} size={40} status="online" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{user?.name}</p>
            <p className="truncate text-xs font-medium text-slate-300">{user?.email}</p>
          </div>
        </Link>

        <button
          type="button"
          className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.10)] px-3 text-sm font-bold text-white transition hover:border-white/20 hover:bg-[rgba(255,255,255,0.14)]"
          onClick={onLogout}
        >
          <LogOut size={16} />
          {t('auth.logout')}
        </button>
      </div>

      {mobileOpen ? <button type="button" aria-label="Close sidebar overlay" className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setMobileOpen(false)} /> : null}
    </>
  );
}
