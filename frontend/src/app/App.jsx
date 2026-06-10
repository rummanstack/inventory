import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './AppLayout';
import LoginPage from './LoginPage';
import { APP_ROUTES } from './routes';
import { InventoryAppProvider, useInventoryApp } from './useInventoryApp.jsx';
import { LoadingState } from '../components/ui.jsx';

function SessionLoadingScreen() {
  const { t } = useInventoryApp();

  return (
    <div className="page-shell">
      <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6">
        <div className="w-full">
          <LoadingState title={t('status.checkingSession')} description={t('app.subtitle')} />
        </div>
      </div>
    </div>
  );
}

function AuthenticatedRoutes() {
  const { authLoading, user, can } = useInventoryApp();
  const defaultRoute = user?.role === 'platform_admin' ? '/platform' : '/dashboard';

  if (authLoading) {
    return <SessionLoadingScreen />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to={defaultRoute} replace />} />
        {APP_ROUTES.map((route) => {
          const RouteComponent = route.component;
          const blocked = user?.role !== 'system_developer' && (
            (route.permission && !can(route.permission)) ||
            (route.role && user?.role !== route.role) ||
            (route.roles && !route.roles.includes(user?.role))
          );
          return (
            <Route
              key={route.id}
              path={route.path}
              element={blocked ? <Navigate to={defaultRoute} replace /> : <RouteComponent />}
            />
          );
        })}
        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <InventoryAppProvider>
      <BrowserRouter>
        <AuthenticatedRoutes />
      </BrowserRouter>
    </InventoryAppProvider>
  );
}
