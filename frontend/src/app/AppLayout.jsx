import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { Alert, ConfirmationDialog, PageLoadingState, ToastViewport } from '../components/ui';
import { useInventoryApp } from './useInventoryApp.jsx';
import AppSidebar from './AppSidebar';
import MustChangePasswordModal from '../features/auth/pages/MustChangePasswordModal.jsx';
import { getRouteLabel } from './routes';
import TopHeader from './TopHeader';

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);
  const { today, user, tenant, tenantOptions, switchTenant, loading, loadError, toasts, dismissToast, logout, t, language, setLanguage, can, hasFeature, confirmation, closeConfirmation, productDirectory } = useInventoryApp();

  if (loading) {
    return <PageLoadingState title={t('app.brand')} description={t('status.loadingData')} />;
  }

  return (
    <div className="page-shell">
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      <AppSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} user={user} tenant={tenant} language={language} onLanguageChange={setLanguage} onLogout={logout} t={t} can={can} hasFeature={hasFeature} />
      <div className="flex h-screen min-h-0 flex-col lg:pl-72">
        <TopHeader title={getRouteLabel(location.pathname, t)} today={today} user={user} tenant={tenant} tenantOptions={tenantOptions} onSwitchTenant={switchTenant} onLogout={logout} onOpenMenu={() => setMobileOpen(true)} language={language} onLanguageChange={setLanguage} t={t} products={productDirectory} />
        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <main key={location.pathname} className="page-enter mx-auto max-w-[1680px] px-3 py-6 pb-10 sm:px-6 lg:px-8">
            {loadError ? (
              <div className="mb-6">
                <Alert type="error">{loadError}</Alert>
              </div>
            ) : null}
            <Outlet />
          </main>
        </div>
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
      {user?.mustChangePassword ? <MustChangePasswordModal /> : null}
      {location.pathname !== '/help-desk' && (
        <button
          onClick={() => navigate('/help-desk')}
          className="fixed bottom-6 right-6 z-50 flex h-13 w-13 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
          title={t('nav.helpDesk')}
        >
          <HelpCircle className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
