import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { Alert, ConfirmationDialog, PageLoadingState } from '../components/ui';
import { useInventoryApp } from './useInventoryApp.jsx';
import AppSidebar from './AppSidebar';
import CommandPalette from './CommandPalette.jsx';
import MobileMenu from './MobileMenu.jsx';
import MobileTabBar from './MobileTabBar.jsx';
import MustChangePasswordModal from '../features/auth/pages/MustChangePasswordModal.jsx';
import AiChatWidget from '../features/ai-insights/components/AiChatWidget.jsx';
import { getRouteLabel } from './routes';
import TopHeader from './TopHeader';
import { getSharedDataDependencies } from '../services/sharedDataInvalidation.js';

const SIDEBAR_COLLAPSED_KEY = 'stockledger.sidebarCollapsed';
const RECENT_PAGES_KEY = 'stockledger.recentPages';
const MAX_RECENT = 5;

export default function AppLayout() {
  const location = useLocation();
  const sharedDataDependencies = getSharedDataDependencies(location.pathname);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [readyNavigationKey, setReadyNavigationKey] = useState(location.key);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'; }
    catch { return false; }
  });
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    setMenuOpen(false);
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

  const { today, user, tenant, tenantOptions, switchTenant, loading, loadError, logout, loggingOut, t, language, setLanguage, can, hasFeature, confirmation, closeConfirmation, productDirectory, hasStaleSharedDirectories, refreshStaleSharedDirectories } = useInventoryApp();
  const hasStaleSharedDirectoriesRef = useRef(hasStaleSharedDirectories);
  const refreshStaleSharedDirectoriesRef = useRef(refreshStaleSharedDirectories);
  hasStaleSharedDirectoriesRef.current = hasStaleSharedDirectories;
  refreshStaleSharedDirectoriesRef.current = refreshStaleSharedDirectories;
  const destinationNeedsSharedData = Boolean(user && !user.isPlatformUser
    && hasStaleSharedDirectoriesRef.current(sharedDataDependencies));

  useEffect(() => {
    if (readyNavigationKey === location.key) return undefined;

    let cancelled = false;
    async function prepareDestination() {
      if (destinationNeedsSharedData) {
        await refreshStaleSharedDirectoriesRef.current(sharedDataDependencies);
      }
      if (!cancelled) {
        setReadyNavigationKey(location.key);
      }
    }

    prepareDestination();
    return () => {
      cancelled = true;
    };
  }, [location.key, readyNavigationKey, destinationNeedsSharedData]);

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
        loggingOut={loggingOut}
        t={t}
        can={can}
        hasFeature={hasFeature}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
      />
      <div className={`flex h-screen min-h-0 flex-col transition-[padding-left] duration-300 ${sidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-72'}`}>
        <TopHeader title={getRouteLabel(location.pathname, t)} today={today} user={user} tenant={tenant} tenantOptions={tenantOptions} onSwitchTenant={switchTenant} onLogout={logout} loggingOut={loggingOut} language={language} onLanguageChange={setLanguage} t={t} products={productDirectory} />
        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <main className="mx-auto max-w-[1680px] px-3 py-6 pb-10 max-lg:pt-4 max-lg:pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
            {loadError ? (
              <div className="mb-6">
                <Alert type="error">{loadError}</Alert>
              </div>
            ) : null}
            {readyNavigationKey === location.key || !destinationNeedsSharedData
              ? <Outlet />
              : <PageLoadingState title={t('app.brand')} description={t('status.loadingData')} />}
          </main>
        </div>
        <MobileTabBar onOpenMenu={() => setMenuOpen((open) => !open)} menuOpen={menuOpen} />
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
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {user?.mustChangePassword ? <MustChangePasswordModal /> : null}
      {!menuOpen ? <AiChatWidget /> : null}
    </div>
  );
}
