import { CalendarDays, CheckCircle2, LogOut, Menu, ShieldCheck, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '../utils/calculations';

export default function TopHeader({ title, today, user, tenant, tenantOptions, onSwitchTenant, onLogout, onOpenMenu, t }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur-2xl no-print">
      <div className="mx-auto flex min-h-20 max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button type="button" className="icon-btn lg:hidden" title={t('common.openMenu')} onClick={onOpenMenu}>
            <Menu size={20} />
          </button>
          <div>
            <p className="brand-chip">{tenant?.name || t('app.brand')}</p>
            <h1 className="mt-3 text-lg font-black tracking-tight text-slate-950 sm:text-xl">{title}</h1>
            {!tenant?.name && t('app.subtitle') ? <p className="mt-1 hidden text-sm font-medium text-slate-500 md:block">{t('app.subtitle')}</p> : null}
          </div>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          {user?.isPlatformUser ? (
            <select
              className="input w-48 text-sm font-bold"
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
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-2 text-sm font-bold text-emerald-700">
            <CheckCircle2 size={17} />
            {t('status.liveData')}
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
            <CalendarDays size={17} className="text-[var(--secondary)]" />
            {formatDate(today)}
          </div>
          <Link
            to="/profile"
            title={t('nav.profile')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 shadow-[0_1px_0_rgba(15,23,42,0.03)] transition hover:border-[var(--secondary)] hover:text-[var(--secondary-strong)]"
          >
            <UserCircle size={17} className="text-[var(--secondary-strong)]" />
            <span className="max-w-44 truncate">{user?.name}</span>
          </Link>
          <Link to="/security" title={t('nav.security')} className="icon-btn">
            <ShieldCheck size={17} />
          </Link>
          <button type="button" className="icon-btn" title={t('auth.logout')} onClick={onLogout}>
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}
