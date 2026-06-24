import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Package } from 'lucide-react';
import AppLayout from './AppLayout';
import LoginPage from '../features/auth/pages/LoginPage';
import LandingPage from '../features/landing/pages/LandingPage';
import { APP_ROUTES } from './routes';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { InventoryAppProvider, useInventoryApp } from './useInventoryApp.jsx';

function SessionLoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-[#f4f3f8]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-2/3 rounded-full bg-[#373373]/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo mark */}
        <div className="relative">
          <div className="absolute inset-0 -m-2 animate-ping rounded-2xl bg-[#5e5b8e]/15" style={{ animationDuration: '2.2s' }} />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5e5b8e] to-[#373373] shadow-[0_8px_40px_rgba(55,51,115,0.35)]">
            <Package size={26} className="text-white" strokeWidth={1.8} />
          </div>
        </div>

        {/* Brand */}
        <h1 className="mt-7 text-[22px] font-black tracking-tight text-[#0e0c25]">Stock Ledger</h1>
        <p className="mt-1.5 text-[13px] font-medium tracking-widest text-slate-400 uppercase">Checking session</p>

        {/* Indeterminate progress bar */}
        <div className="relative mt-10 h-px w-48 overflow-hidden rounded-full bg-[#373373]/10">
          <div className="session-loader-bar absolute inset-y-0 w-1/2 rounded-full bg-gradient-to-r from-transparent via-[#5e5b8e] to-transparent" />
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
