import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CalendarDays, CheckCircle2, Clock3, LogOut, MessageCircle, Moon, PackageX, ShieldCheck, Sun, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useInventoryApp } from './useInventoryApp.jsx';
import { formatDate, getLowStockProducts, getLowStockThreshold } from '../utils/calculations';
import { Badge, Select } from '../components/ui';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { inventoryApi } from '../services/inventoryApi.js';
import { usePolling } from '../hooks/usePolling.js';

export default function TopHeader({ title, today, user, tenant, tenantOptions, onSwitchTenant, onLogout, language, onLanguageChange, t, products = [] }) {
  const { theme, toggleTheme } = useInventoryApp();
  const [notifOpen, setNotifOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [visitorChatUnread, setVisitorChatUnread] = useState(0);
  const notifWrapperRef = useRef(null);
  const lowStockProducts = useMemo(() => getLowStockProducts(products), [products]);
  const isSystemDeveloper = user?.role === 'system_developer';
  const clockTime = new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);

  useEffect(() => {
    function onPointerDown(event) {
      if (notifWrapperRef.current && !notifWrapperRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    function onEscape(event) {
      if (event.key === 'Escape') {
        setNotifOpen(false);
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  usePolling(async () => {
    try {
      const result = await inventoryApi.countUnreadVisitorChats();
      setVisitorChatUnread(result?.count || 0);
    } catch {
      // Badge just won't update this tick — retried on the next poll.
    }
  }, 30000, { enabled: isSystemDeveloper });

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--sidebar-line)] bg-[color-mix(in_srgb,var(--sidebar-bg)_95%,transparent)] shadow-card backdrop-blur-xl no-print">
      <div className="mx-auto flex min-h-20 max-w-[1600px] items-center justify-between gap-4 px-4 py-3 max-lg:min-h-14 max-lg:py-2 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-base font-bold text-slate-950 lg:hidden">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {user?.isPlatformUser ? (
            <Select
              className="input w-48 max-lg:hidden"
              value={tenant?.id || ''}
              onChange={(event) => onSwitchTenant(event.target.value)}
              title={t('organizations.switchOrganization')}
            >
              <option value="">{t('organizations.noOrgSelected')}</option>
              {tenantOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </Select>
          ) : null}
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--sidebar-line-strong)] bg-white/70 px-3.5 py-2 text-sm font-bold text-slate-700 max-lg:hidden">
            <CalendarDays size={17} className="text-slate-400" />
            {formatDate(today)}
            <span className="mx-0.5 text-slate-300">•</span>
            <Clock3 size={17} className="text-slate-400" />
            <span className="min-w-[86px] tabular-nums">{clockTime}</span>
          </div>
          <Link
            to="/profile"
            title={t('nav.profile')}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--sidebar-line-strong)] bg-white/70 px-3.5 py-2 text-sm font-bold text-slate-700 transition hover:border-[var(--sidebar-line-hover)] hover:bg-white max-lg:hidden"
          >
            <UserCircle size={17} className="text-slate-400" />
            <span className="max-w-44 truncate">{user?.name}</span>
          </Link>
          {isSystemDeveloper ? (
            <Link
              to="/platform/visitor-chats"
              title={t('visitorChats.title')}
              className="icon-btn relative max-lg:hidden"
            >
              <MessageCircle size={17} />
              {visitorChatUnread > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[var(--danger)]" />
              ) : null}
            </Link>
          ) : null}
          <button type="button" className="icon-btn max-lg:hidden" title={t('theme.toggle')} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <div className="relative" ref={notifWrapperRef}>
            <button
              type="button"
              className="icon-btn relative max-lg:h-11 max-lg:w-11"
              title={t('notifications.title')}
              aria-expanded={notifOpen}
              onClick={() => setNotifOpen((open) => !open)}
            >
              <Bell size={17} />
              {lowStockProducts.length > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[var(--danger)]" />
              ) : null}
            </button>
            {notifOpen ? (
              <div className="panel popover-enter shadow-modal absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden sm:w-96">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-950">{t('notifications.title')}</p>
                  {lowStockProducts.length > 0 ? <Badge tone="rose">{lowStockProducts.length}</Badge> : null}
                </div>
                <div className="premium-scrollbar max-h-80 overflow-y-auto">
                  {lowStockProducts.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                      <CheckCircle2 size={28} className="text-[var(--success)]" />
                      <p className="text-sm font-semibold text-slate-500">{t('notifications.noAlerts')}</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {lowStockProducts.map((product) => (
                        <li key={product.id} className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-[var(--danger)]">
                              <PackageX size={16} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-slate-900">
                                {t('notifications.lowStockAlert', { name: product.name, count: product.stockPieces })}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                {t('notifications.currentStock')}: {product.stockPieces} · {t('notifications.alertLevel')}: {getLowStockThreshold(product)}
                              </p>
                              <Link
                                to="/products"
                                onClick={() => setNotifOpen(false)}
                                className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-[var(--secondary-strong)] hover:underline"
                              >
                                {t('notifications.viewProduct')}
                              </Link>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <Link
            to="/security"
            title={t('nav.security')}
            className="icon-btn max-lg:hidden"
          >
            <ShieldCheck size={17} />
          </Link>
          <div className="max-lg:hidden">
            <LanguageSwitcher language={language} onChange={onLanguageChange} t={t} tone="light" />
          </div>
          <button
            type="button"
            className="icon-btn max-lg:hidden"
            title={t('auth.logout')}
            onClick={onLogout}
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}


