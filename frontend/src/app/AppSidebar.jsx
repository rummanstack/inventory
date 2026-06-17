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
  const sections = ['overview', 'inventory', 'operations', 'finance', 'suppliers', 'retailer', 'reports', 'governance', 'settings', 'developer'];
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

  return (
    <>
      <div
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-[min(18rem,85vw)] flex-col overflow-hidden border-r border-slate-200/70 bg-white/80 px-4 py-5 text-slate-900 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur-2xl transition-transform duration-300 lg:w-72 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="relative flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,var(--secondary-strong),var(--bg-dark))] text-white shadow-[0_16px_32px_var(--secondary-shadow)]">
              <img src={tenant?.logoUrl || logoMark} alt="" className="h-full w-full object-contain p-1.5" />
            </div>
            <div>
              <h2 className="mt-1 text-xl font-black tracking-normal text-slate-950">{tenant?.name || t('app.brand')}</h2>
              {tenant?.plan ? (
                <p className="text-xs font-semibold capitalize text-slate-500">{tenant.plan}</p>
              ) : t('app.subtitle') ? (
                <p className="text-xs font-semibold text-slate-500">{t('app.subtitle')}</p>
              ) : null}
            </div>
          </div>
          <button type="button" className="icon-btn lg:hidden" title={t('common.closeMenu')} onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="premium-scrollbar relative mt-8 min-h-0 flex-1 overflow-y-auto pb-6 pr-1">
          <div className="space-y-5">
            {groupedRoutes.map(({ section, label, routes }) => {
              const isCollapsed = Boolean(collapsedGroups[section]);

              return (
                <div key={section} className="space-y-2">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-100"
                    onClick={() => toggleGroup(section)}
                    aria-expanded={!isCollapsed}
                  >
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
                    <ChevronDown size={16} className={cx('shrink-0 text-slate-400 transition-transform', isCollapsed && '-rotate-90')} />
                  </button>
                  {isCollapsed ? null : (
                    <div className="space-y-1.5">
                      {routes.map((route) => {
                        const Icon = route.icon;

                        return (
                          <NavLink
                            key={route.id}
                            to={route.path}
                            onClick={() => setMobileOpen(false)}
                            className={({ isActive }) =>
                              cx(
                                'group relative flex w-full items-center gap-3 rounded-lg py-2.5 pr-3 text-left text-sm font-semibold transition',
                                isActive
                                  ? 'bg-[var(--secondary-soft)] pl-4 text-[var(--secondary-strong)] before:absolute before:left-0 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-[var(--secondary)]'
                                  : 'pl-3 text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                              )
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <span
                                  className={cx(
                                    'flex h-8 w-8 items-center justify-center rounded-md transition',
                                    isActive ? 'bg-[var(--secondary)] text-white' : 'text-slate-500 group-hover:text-[var(--secondary-strong)]',
                                  )}
                                >
                                  <Icon size={17} />
                                </span>
                                <span className="flex-1">{t(route.labelKey)}</span>
                              </>
                            )}
                          </NavLink>
                        );
                      })}
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
          className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <Avatar name={user?.name} imageUrl={user?.avatarUrl} size={40} status="online" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">{user?.name}</p>
            <p className="truncate text-xs font-medium text-slate-500">{user?.email}</p>
          </div>
        </Link>

        <button
          type="button"
          className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
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
