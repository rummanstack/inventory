import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { Alert, ConfirmationDialog, PageLoadingState } from '../components/ui';
import { useInventoryApp } from './useInventoryApp.jsx';
import AppSidebar from './AppSidebar';
import CommandPalette from './CommandPalette.jsx';
import MobileTabBar from './MobileTabBar.jsx';
import MustChangePasswordModal from '../features/auth/pages/MustChangePasswordModal.jsx';
import { getRouteLabel } from './routes';
import TopHeader from './TopHeader';

const SIDEBAR_COLLAPSED_KEY = 'stockledger.sidebarCollapsed';
const RECENT_PAGES_KEY = 'stockledger.recentPages';
const MAX_RECENT = 5;

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'; }
    catch { return false; }
  });
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { today, user, tenant, tenantOptions, switchTenant, loading, loadError, logout, t, language, setLanguage, can, hasFeature, confirmation, closeConfirmation, productDirectory } = useInventoryApp();

  useEffect(() => {
    if (!user || !location.pathname || location.pathname === '/') return;
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_PAGES_KEY) || '[]');
      const updated = [location.pathname, ...stored.filter((p) => p !== location.pathname)].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(updated));
    } catch {}
  }, [location.pathname, user]);

  if (loading) {
    return <PageLoadingState title={t('app.brand')} description={t('status.loadingData')} />;
  }

  return (
    <div className="page-shell">
      <AppSidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        user={user}
        tenant={tenant}
        language={language}
        onLanguageChange={setLanguage}
        onLogout={logout}
        t={t}
        can={can}
        hasFeature={hasFeature}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
      />
      <div className={`flex h-screen min-h-0 flex-col transition-[padding-left] duration-300 ${sidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-72'}`}>
        <TopHeader title={getRouteLabel(location.pathname, t)} today={today} user={user} tenant={tenant} tenantOptions={tenantOptions} onSwitchTenant={switchTenant} onLogout={logout} onOpenMenu={() => setMobileOpen(true)} language={language} onLanguageChange={setLanguage} t={t} products={productDirectory} />
        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <main key={location.pathname} className="mx-auto max-w-[1680px] px-3 py-6 pb-10 max-lg:pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 page-enter">
            {loadError ? (
              <div className="mb-6">
                <Alert type="error">{loadError}</Alert>
              </div>
            ) : null}
            <Outlet />
          </main>
        </div>
        <MobileTabBar onOpenMenu={() => setMobileOpen(true)} menuOpen={mobileOpen} />
      </div>
      <ConfirmationDialog
        open={Boolean(confirmation)}
        title={confirmation?.title || t('common.delete')}
        description={confirmation?.description || ''}
        confirmLabel={confirmation?.confirmLabel || t('common.delete')}
        cancelLabel={confirmation?.cancelLabel || t('common.cancel')}
        tone={confirmation?.tone || 'rose'}
        requireReason={confirmation?.requireReason || false}
        reasonLabel={confirmation?.reasonLabel}
        reasonPlaceholder={confirmation?.reasonPlaceholder}
        consequences={confirmation?.consequences || []}
        onConfirm={(reason) => closeConfirmation(true, reason)}
        onCancel={() => closeConfirmation(false)}
      />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {user?.mustChangePassword ? <MustChangePasswordModal /> : null}
      {location.pathname !== '/help-desk' && (
        <button
          onClick={() => navigate('/help-desk')}
          className="fixed bottom-6 right-6 z-50 flex h-13 w-13 items-center justify-center rounded-full bg-[var(--secondary)] text-white shadow-lg hover:bg-[var(--secondary-strong)] active:scale-95 transition-all max-lg:bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
          title={t('nav.helpDesk')}
        >
          <HelpCircle className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
