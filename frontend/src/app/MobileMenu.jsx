import { useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LogOut, Moon, Sun } from 'lucide-react';
import { Avatar, Select, cx } from '../components/ui';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { buildGroupedRoutes } from './routes';
import { useInventoryApp } from './useInventoryApp.jsx';

export default function MobileMenu({ open, onClose }) {
  const {
    user, tenant, tenantOptions, switchTenant, t, can, hasFeature,
    language, setLanguage, logout, theme, toggleTheme,
  } = useInventoryApp();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const groups = buildGroupedRoutes({ user, can, hasFeature });

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto overscroll-contain bg-[var(--sidebar-bg)] pb-[calc(4.5rem+env(safe-area-inset-bottom))] no-print lg:hidden">
      <div className="space-y-5 px-4 pt-4">
        {/* User card */}
        <Link
          to="/profile"
          onClick={onClose}
          className="flex items-center gap-3 rounded-card border border-[var(--sidebar-line-strong)] bg-white/70 p-4 shadow-card transition active:scale-[0.98]"
        >
          <Avatar name={user?.name} imageUrl={user?.avatarUrl} size={48} status="online" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-slate-950">{user?.name}</p>
            <p className="truncate text-xs font-semibold text-slate-500">{tenant?.name || user?.email}</p>
          </div>
        </Link>

        {/* App sections as icon grids */}
        {groups.map(({ section, routes }) => (
          <section key={section}>
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {t(`navGroups.${section}`)}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {routes.map((route) => {
                const Icon = route.icon;
                return (
                  <NavLink
                    key={route.id}
                    to={route.path}
                    end
                    onClick={onClose}
                    className={({ isActive }) => cx(
                      'flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl border p-2 text-center transition active:scale-[0.96]',
                      isActive
                        ? 'border-transparent bg-[linear-gradient(135deg,var(--secondary-strong),var(--brand-strong))] text-white shadow-[0_1px_2px_var(--secondary-shadow)]'
                        : 'border-[var(--sidebar-line-strong)] bg-white/70 text-slate-700',
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        <span className={cx(
                          'flex h-9 w-9 items-center justify-center rounded-xl',
                          isActive ? 'bg-white/20 text-white' : 'bg-[var(--brand-soft)] text-[var(--brand-strong)]',
                        )}>
                          <Icon size={18} />
                        </span>
                        <span className="line-clamp-2 text-[10px] font-bold leading-tight">{t(route.labelKey)}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </section>
        ))}

        {/* Bottom controls: tenant switcher, language, theme, logout */}
        <section className="space-y-3 border-t border-[var(--sidebar-line)] pt-4">
          {user?.isPlatformUser ? (
            <Select
              className="input h-11"
              value={tenant?.id || ''}
              onChange={(event) => switchTenant(event.target.value)}
              title={t('organizations.switchOrganization')}
            >
              <option value="">{t('organizations.noOrgSelected')}</option>
              {tenantOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </Select>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <LanguageSwitcher language={language} onChange={setLanguage} t={t} />
            <button
              type="button"
              className="icon-btn h-11 w-11 shrink-0"
              title={t('theme.toggle')}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
          <button
            type="button"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--sidebar-line-strong)] bg-white/70 text-sm font-bold text-slate-950 transition active:scale-[0.98]"
            onClick={logout}
          >
            <LogOut size={16} />
            {t('auth.logout')}
          </button>
        </section>
      </div>
    </div>
  );
}
