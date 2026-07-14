import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { Toaster } from 'sonner';
import { APP_ROUTES } from './routes';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { InventoryAppProvider, useInventoryApp } from './useInventoryApp.jsx';
import { LoadingState } from '../components/ui/Feedback.jsx';
import { stockLedgerLogoHorizontal, stockLedgerLogoIcon } from '../assets/brandAssets.js';
import SeoManager from '../seo/SeoManager.jsx';

const AppLayout = lazy(() => import('./AppLayout'));
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('../features/auth/pages/RegisterPage'));
const LandingPage = lazy(() => import('../features/landing/pages/LandingPage'));
const PrivacyPolicyPage = lazy(() => import('../features/landing/pages/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('../features/landing/pages/TermsPage'));
const FounderPage = lazy(() => import('../features/landing/pages/FounderPage'));
const PricingPage = lazy(() => import('../features/landing/pages/PricingPage'));
const ContactPage = lazy(() => import('../features/landing/pages/ContactPage'));
const GetStartedPage = lazy(() => import('../features/landing/pages/GetStartedPage'));
const FeatureHubPage = lazy(() => import('../features/landing/pages/SeoContentPage.jsx').then((module) => ({ default: module.FeatureHubPage })));
const FeatureDetailPage = lazy(() => import('../features/landing/pages/SeoContentPage.jsx').then((module) => ({ default: module.FeatureDetailPage })));
const SolutionHubPage = lazy(() => import('../features/landing/pages/SeoContentPage.jsx').then((module) => ({ default: module.SolutionHubPage })));
const SolutionDetailPage = lazy(() => import('../features/landing/pages/SeoContentPage.jsx').then((module) => ({ default: module.SolutionDetailPage })));

function SessionLoadingScreen() {
  const { t } = useInventoryApp();
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-[var(--sidebar-bg)]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-2/3 rounded-full bg-[color-mix(in_srgb,var(--brand)_10%,transparent)] blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo mark */}
        <div className="relative">
          <div className="absolute inset-0 -m-2 animate-ping rounded-2xl bg-[color-mix(in_srgb,var(--secondary)_15%,transparent)]" style={{ animationDuration: '2.2s' }} />
          <div className="logo-chip relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl shadow-[0_8px_40px_rgba(55,51,115,0.2)]">
            <img src={stockLedgerLogoIcon} alt="" className="h-full w-full object-contain p-1.5" />
          </div>
        </div>

        {/* Brand */}
        <div className="logo-chip mt-7 rounded-control px-3 py-1.5">
          <img src={stockLedgerLogoHorizontal} alt="StockLedger" className="h-10 w-auto object-contain" />
        </div>
        <p className="mt-1.5 text-[13px] font-medium tracking-widest text-slate-400 uppercase">{t('common.checkingSession')}</p>

        {/* Indeterminate progress bar */}
        <div className="relative mt-10 h-px w-48 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--brand)_10%,transparent)]">
          <div className="session-loader-bar absolute inset-y-0 w-1/2 rounded-full bg-gradient-to-r from-transparent via-[var(--secondary)] to-transparent" />
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
  const [searchParams] = useSearchParams();

  if (authLoading) {
    return <SessionLoadingScreen />;
  }

  // A password-reset link must work even if this browser still holds a
  // session for someone (the admin testing their own copied link, or a
  // stale login on the affected user's device) — never drop the token.
  if (user && !searchParams.has('token')) {
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

  if (blocked) {
    return <Navigate to={defaultRoute} replace />;
  }

  // Per-page Suspense keeps the sidebar/header mounted while a lazy page
  // chunk downloads; only the content area shows the skeleton.
  return (
    <Suspense fallback={<div className="pt-2"><LoadingState /></div>}>
      <RouteComponent />
    </Suspense>
  );
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
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/founder" element={<FounderPage />} />
      <Route path="/features" element={<FeatureHubPage />} />
      <Route path="/features/:slug" element={<FeatureDetailPage />} />
      <Route path="/solutions" element={<SolutionHubPage />} />
      <Route path="/solutions/:slug" element={<SolutionDetailPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/contact" element={<ContactPage />} />`r`n      <Route path="/get-started" element={<GetStartedPage />} />
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
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


function ScrollRestoration() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      window.setTimeout(() => {
        const target = document.getElementById(location.hash.slice(1));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 80);
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.hash]);

  return null;
}
function AppShell() {
  const { t, theme } = useInventoryApp();

  return (
    <ErrorBoundary t={t}>
      <Toaster position="top-right" theme={theme} richColors expand closeButton duration={4000} />
      <BrowserRouter>
        <SeoManager />
        <ScrollRestoration />
        <Suspense fallback={<SessionLoadingScreen />}>
          <AppRoutes />
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
