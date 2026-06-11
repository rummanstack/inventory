import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Alert, ConfirmationDialog, PageLoadingState, ToastViewport } from '../components/ui';
import { useInventoryApp } from './useInventoryApp.jsx';
import AppSidebar from './AppSidebar';
import MustChangePasswordModal from './MustChangePasswordModal.jsx';
import { getRouteLabel } from './routes';
import TopHeader from './TopHeader';

export default function AppLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { today, user, tenant, loading, loadError, toasts, dismissToast, logout, t, language, setLanguage, can, hasFeature, confirmation, closeConfirmation } = useInventoryApp();

  if (loading) {
    return <PageLoadingState title={t('app.brand')} description={t('status.loadingData')} />;
  }

  return (
    <div className="page-shell">
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      <AppSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} user={user} tenant={tenant} language={language} onLanguageChange={setLanguage} onLogout={logout} t={t} can={can} hasFeature={hasFeature} />
      <div className="flex h-screen min-h-0 flex-col lg:pl-72">
        <TopHeader title={getRouteLabel(location.pathname, t)} today={today} user={user} onLogout={logout} onOpenMenu={() => setMobileOpen(true)} t={t} />
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <main className="mx-auto max-w-[1680px] px-3 py-6 pb-10 sm:px-6 lg:px-8">
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
        onConfirm={(reason) => closeConfirmation(true, reason)}
        onCancel={() => closeConfirmation(false)}
      />
      {user?.mustChangePassword ? <MustChangePasswordModal /> : null}
    </div>
  );
}
