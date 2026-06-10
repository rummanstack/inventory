import { NavLink } from 'react-router-dom';
import { LogOut, UserCircle, Warehouse, X } from 'lucide-react';
import { cx } from '../components/ui';
import { APP_ROUTES } from './routes';
import LanguageSwitcher from './LanguageSwitcher';

export default function AppSidebar({ mobileOpen, setMobileOpen, user, tenant, language, onLanguageChange, onLogout, t, can }) {
  const sections = ['overview', 'operations', 'finance', 'governance', 'developer'];
  const groupedRoutes = sections
    .map((section) => ({
      section,
      label: t(`navGroups.${section}`),
      routes: APP_ROUTES.filter((route) => {
        if (route.group !== section) return false;
        if (user?.role === 'system_developer') return route.id !== 'org-settings';
        if (route.permission && !can(route.permission)) return false;
        if (route.role && user?.role !== route.role) return false;
        if (route.roles && !route.roles.includes(user?.role)) return false;
        return true;
      }),
    }))
    .filter((item) => item.routes.length > 0);

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
              {tenant?.logoUrl ? (
                <img src={tenant.logoUrl} alt="" className="h-full w-full object-contain p-1.5" />
              ) : (
                <Warehouse size={22} />
              )}
            </div>
            <div>
              <h2 className="mt-1 text-xl font-black tracking-normal text-slate-950">{tenant?.name || t('app.brand')}</h2>
              {t('app.subtitle') ? <p className="text-xs font-semibold text-slate-500">{t('app.subtitle')}</p> : null}
            </div>
          </div>
          <button type="button" className="icon-btn lg:hidden" title={t('common.closeMenu')} onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="premium-scrollbar relative mt-8 min-h-0 flex-1 overflow-y-auto pb-6 pr-1">
          <div className="space-y-5">
            {groupedRoutes.map(({ section, label, routes }) => (
              <div key={section} className="space-y-2">
                <div className="px-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{label}</p>
                </div>
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
              </div>
            ))}
          </div>
        </nav>

        <div className="relative mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <UserCircle size={18} className="shrink-0 text-[var(--secondary)]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-950">{user?.name}</p>
                <p className="truncate text-xs font-semibold text-slate-500">{user?.role}</p>
              </div>
            </div>
            <span className="muted-chip" title={t('orgSettings.currency') || 'Currency'}>BDT</span>
          </div>
          <div className="mt-4">
            <LanguageSwitcher language={language} onChange={onLanguageChange} t={t} compact />
          </div>
          <button
            type="button"
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
            onClick={onLogout}
          >
            <LogOut size={16} />
            {t('auth.logout')}
          </button>
        </div>
      </div>

      {mobileOpen ? <button type="button" aria-label="Close sidebar overlay" className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setMobileOpen(false)} /> : null}
    </>
  );
}
