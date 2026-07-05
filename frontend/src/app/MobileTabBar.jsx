import { NavLink, useLocation } from 'react-router-dom';
import { Boxes, FileText, House, Menu, ShoppingBag, Truck } from 'lucide-react';
import { cx } from '../components/ui';
import { APP_ROUTES } from './routes';
import { useInventoryApp } from './useInventoryApp.jsx';

// Same access semantics as AppSidebar's non-developer sections.
function canAccessRoute(route, { user, can, hasFeature }) {
  if (!route) return false;
  if (user?.role === 'system_developer') return route.id !== 'org-settings';
  if (route.permission && !can(route.permission)) return false;
  if (route.role && user?.role !== route.role) return false;
  if (route.roles && !route.roles.includes(user?.role)) return false;
  return hasFeature(route.feature);
}

function TabIcon({ icon: Icon, active }) {
  return (
    <Icon
      size={22}
      strokeWidth={active ? 2.4 : 2}
      fill={active ? 'var(--brand-soft)' : 'none'}
    />
  );
}

export default function MobileTabBar({ onOpenMenu, menuOpen }) {
  const { user, tenant, t, can, hasFeature } = useInventoryApp();
  const location = useLocation();
  const access = { user, can, hasFeature };
  const routeById = (id) => APP_ROUTES.find((route) => route.id === id);

  const isRetailer = tenant?.sellerType === 'RETAILER';
  // Prefer the seller-type flow; fall back to the other one if it's not accessible.
  const sellCandidates = isRetailer
    ? ['retailer-quick-sale', 'morning-issue']
    : ['morning-issue', 'retailer-quick-sale'];
  const sellRoute = sellCandidates.map(routeById).find((route) => canAccessRoute(route, access));

  const tabs = [
    { key: 'home', labelKey: 'mobileNav.home', icon: House, route: routeById('dashboard') },
    { key: 'sell', labelKey: 'mobileNav.sell', icon: sellRoute?.id === 'morning-issue' ? Truck : ShoppingBag, route: sellRoute },
    { key: 'stock', labelKey: 'mobileNav.stock', icon: Boxes, route: routeById('products') },
    { key: 'reports', labelKey: 'mobileNav.reports', icon: FileText, route: routeById('reports') },
  ].filter((tab) => canAccessRoute(tab.route, access));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--sidebar-line)] bg-[color-mix(in_srgb,var(--sidebar-bg)_94%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl no-print lg:hidden"
      aria-label={t('mobileNav.menu')}
    >
      <div className="flex">
        {tabs.map((tab) => {
          const active = location.pathname === tab.route.path || location.pathname.startsWith(`${tab.route.path}/`);
          return (
            <NavLink
              key={tab.key}
              to={tab.route.path}
              className={cx(
                'flex h-14 flex-1 flex-col items-center justify-center gap-0.5 transition-colors active:bg-[var(--brand-soft)]',
                active ? 'text-[var(--brand-strong)]' : 'text-slate-500',
              )}
            >
              <TabIcon icon={tab.icon} active={active} />
              <span className={cx('text-[10px] leading-none', active ? 'font-bold' : 'font-semibold')}>{t(tab.labelKey)}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          className={cx(
            'flex h-14 flex-1 flex-col items-center justify-center gap-0.5 transition-colors active:bg-[var(--brand-soft)]',
            menuOpen ? 'text-[var(--brand-strong)]' : 'text-slate-500',
          )}
          onClick={onOpenMenu}
        >
          <TabIcon icon={Menu} active={menuOpen} />
          <span className={cx('text-[10px] leading-none', menuOpen ? 'font-bold' : 'font-semibold')}>{t('mobileNav.menu')}</span>
        </button>
      </div>
    </nav>
  );
}
