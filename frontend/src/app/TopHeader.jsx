import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CalendarDays, CheckCircle2, Clock3, LogOut, Menu, MessageCircle, PackageX, ShieldCheck, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate, getLowStockProducts, getLowStockThreshold } from '../utils/calculations';
import { Badge } from '../components/ui';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { inventoryApi } from '../services/inventoryApi.js';
import { usePolling } from '../hooks/usePolling.js';

export default function TopHeader({ title, today, user, tenant, tenantOptions, onSwitchTenant, onLogout, onOpenMenu, language, onLanguageChange, t, products = [] }) {
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
    <header className="sticky top-0 z-20 border-b border-[#e4e2f2] bg-[#f5f4fb]/95 shadow-[0_8px_24px_rgba(var(--slate-900),0.05)] backdrop-blur-xl no-print">
      <div className="mx-auto flex min-h-20 max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="icon-btn lg:hidden"
            title={t('common.openMenu')}
            onClick={onOpenMenu}
          >
            <Menu size={20} />
          </button>
          <div>
            <h1 className="mt-3 text-lg font-black tracking-tight text-slate-950 sm:text-xl">{title}</h1>
            {!tenant?.name && t('app.subtitle') ? <p className="mt-1 hidden text-sm font-medium text-slate-500 md:block">{t('app.subtitle')}</p> : null}
          </div>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          {user?.isPlatformUser ? (
            <select
              className="input w-48"
              value={tenant?.id || ''}
              onChange={(event) => onSwitchTenant(event.target.value)}
              title={t('organizations.switchOrganization')}
            >
              <option value="">{t('organizations.noOrgSelected')}</option>
              {tenantOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
          ) : null}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#dddaf0] bg-white/70 px-3.5 py-2 text-sm font-bold text-slate-700">
            <CalendarDays size={17} className="text-slate-400" />
            {formatDate(today)}
            <span className="mx-0.5 text-slate-300">•</span>
            <Clock3 size={17} className="text-slate-400" />
            <span className="min-w-[86px] tabular-nums">{clockTime}</span>
          </div>
          <Link
            to="/profile"
            title={t('nav.profile')}
            className="inline-flex items-center gap-2 rounded-full border border-[#dddaf0] bg-white/70 px-3.5 py-2 text-sm font-bold text-slate-700 transition hover:border-[#c8c4e6] hover:bg-white"
          >
            <UserCircle size={17} className="text-slate-400" />
            <span className="max-w-44 truncate">{user?.name}</span>
          </Link>
          {isSystemDeveloper ? (
            <Link
              to="/platform/visitor-chats"
              title={t('visitorChats.title')}
              className="icon-btn relative"
            >
              <MessageCircle size={17} />
              {visitorChatUnread > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[var(--danger)]" />
              ) : null}
            </Link>
          ) : null}
          <div className="relative" ref={notifWrapperRef}>
            <button
              type="button"
              className="icon-btn relative"
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
              <div className="panel absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden sm:w-96">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-black text-slate-950">{t('notifications.title')}</p>
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
            className="icon-btn"
          >
            <ShieldCheck size={17} />
          </Link>
          <LanguageSwitcher language={language} onChange={onLanguageChange} t={t} tone="light" />
          <button
            type="button"
            className="icon-btn"
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
