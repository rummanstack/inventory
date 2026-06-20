import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './AppLayout';
import LoginPage from '../features/auth/pages/LoginPage';
import LandingPage from '../features/landing/pages/LandingPage';
import { APP_ROUTES } from './routes';
import { ErrorBoundary } from './ErrorBoundary.jsx';
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

function getDefaultRoute(user) {
  return user?.role === 'system_developer' ? '/platform' : '/dashboard';
}

function PublicOnlyRoute({ children }) {
  const { authLoading, user } = useInventoryApp();

  if (authLoading) {
    return <SessionLoadingScreen />;
  }

  if (user) {
    return <Navigate to={getDefaultRoute(user)} replace />;
  }

  return children;
}

function ProtectedLayout() {
  const { authLoading, user } = useInventoryApp();

  if (authLoading) {
    return <SessionLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
}

function RootRedirect() {
  const { authLoading, user } = useInventoryApp();

  if (authLoading) {
    return <SessionLoadingScreen />;
  }

  return <Navigate to={user ? getDefaultRoute(user) : '/landing'} replace />;
}

function GuardedAppRoute({ route }) {
  const { authLoading, user, can, hasFeature } = useInventoryApp();
  const defaultRoute = getDefaultRoute(user);

  if (authLoading) {
    return <SessionLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const RouteComponent = route.component;
  const blocked = user?.role !== 'system_developer' && (
    (route.permission && !can(route.permission)) ||
    (route.role && user?.role !== route.role) ||
    (route.roles && !route.roles.includes(user?.role)) ||
    !hasFeature(route.feature)
  );

  return blocked ? <Navigate to={defaultRoute} replace /> : <RouteComponent />;
}

function AppFallbackRedirect() {
  const { authLoading, user } = useInventoryApp();

  if (authLoading) {
    return <SessionLoadingScreen />;
  }

  return <Navigate to={user ? getDefaultRoute(user) : '/landing'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/landing" element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>} />
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route element={<ProtectedLayout />}>
        {APP_ROUTES.map((route) => (
          <Route
            key={route.id}
            path={route.path.replace(/^\//, '')}
            element={<GuardedAppRoute route={route} />}
          />
        ))}
      </Route>
      <Route path="*" element={<AppFallbackRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <InventoryAppProvider>
      <AppShell />
    </InventoryAppProvider>
  );
}

function AppShell() {
  const { t } = useInventoryApp();

  return (
    <ErrorBoundary t={t}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
    </ErrorBoundary>
  );
}
