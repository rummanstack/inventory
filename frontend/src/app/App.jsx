import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ShieldAlert } from 'lucide-react';
import { APP_ROUTES, canAccessRoute, getFirstAccessibleRoute } from './routes';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { InventoryAppProvider, useInventoryApp } from './useInventoryApp.jsx';
import { EmptyState, LoadingState } from '../components/ui/Feedback.jsx';
import { stockLedgerLogoHorizontal, stockLedgerLogoIcon } from '../assets/brandAssets.js';
import SeoManager from '../seo/SeoManager.jsx';
import { PUBLIC_MARKETING_PATHS } from '../seo/publicRoutePaths.js';

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
const SoftwareHubPage = lazy(() => import('../features/landing/pages/IntentSeoPage.jsx').then((module) => ({ default: module.SoftwareHubPage })));
const SoftwareDetailPage = lazy(() => import('../features/landing/pages/IntentSeoPage.jsx').then((module) => ({ default: module.SoftwareDetailPage })));

function SessionLoadingScreen() {
  const { t } = useInventoryApp();
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-[var(--sidebar-bg)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color-mix(in_srgb,var(--brand)_8%,transparent)] blur-[140px]" />
        <div className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color-mix(in_srgb,var(--secondary)_10%,transparent)] blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="session-glow absolute inset-0 -m-3 rounded-[26px] bg-[color-mix(in_srgb,var(--brand)_22%,transparent)] blur-xl" />
          <div className="logo-chip relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl shadow-[0_10px_36px_rgba(55,51,115,0.22)] ring-1 ring-[color-mix(in_srgb,var(--brand)_14%,transparent)]">
            <img src={stockLedgerLogoIcon} alt="" className="h-full w-full object-contain p-1.5" />
          </div>
        </div>

        <div className="logo-chip mt-6 rounded-control px-3 py-1.5 shadow-[0_4px_20px_rgba(55,51,115,0.08)]">
          <img src={stockLedgerLogoHorizontal} alt="StockLedger" className="h-9 w-auto object-contain" />
        </div>
        <p className="mt-4 text-[12px] font-medium tracking-[0.2em] text-slate-400 uppercase">{t('common.checkingSession')}</p>

        <div className="relative mt-8 h-[3px] w-40 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--brand)_8%,transparent)]">
          <div className="session-loader-bar absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-[var(--brand)] to-transparent" />
        </div>
      </div>
    </div>
  );
}

function getDefaultRoute(access) {
  const route = getFirstAccessibleRoute(access);
  return route ? route.path : '';
}

function NoAccessibleRoute() {
  const { t } = useInventoryApp();
  return (
    <div className={'mx-auto flex min-h-[60vh] max-w-xl items-center justify-center p-6'}>
      <EmptyState
        title={t('permissions.noAccessibleTitle')}
        description={t('permissions.noAccessibleDescription')}
        icon={ShieldAlert}
      />
    </div>
  );
}

function PublicOnlyRoute({ children }) {
  const access = useInventoryApp();
  const { authLoading, user } = access;
  const [searchParams] = useSearchParams();

  if (authLoading) {
    return <SessionLoadingScreen />;
  }

  if (user && !searchParams.has('token')) {
    const defaultRoute = getDefaultRoute(access);
    return defaultRoute ? <Navigate to={defaultRoute} replace /> : <NoAccessibleRoute />;
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
  const access = useInventoryApp();
  const { authLoading, user } = access;

  if (authLoading) {
    return <SessionLoadingScreen />;
  }

  if (!user) return <Navigate to="/landing" replace />;

  const defaultRoute = getDefaultRoute(access);
  return defaultRoute ? <Navigate to={defaultRoute} replace /> : <NoAccessibleRoute />;
}

function GuardedAppRoute({ route }) {
  const access = useInventoryApp();
  const { authLoading, user } = access;
  const defaultRoute = getDefaultRoute(access);

  if (authLoading) {
    return <SessionLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const RouteComponent = route.component;
  const blocked = !canAccessRoute(route, access);

  if (blocked) {
    return defaultRoute && defaultRoute !== route.path
      ? <Navigate to={defaultRoute} replace />
      : <NoAccessibleRoute />;
  }

  return (
    <Suspense fallback={<div className="pt-2"><LoadingState /></div>}>
      <RouteComponent />
    </Suspense>
  );
}

function AppFallbackRedirect() {
  const access = useInventoryApp();
  const { authLoading, user } = access;
  const location = useLocation();

  if (authLoading) {
    return <SessionLoadingScreen />;
  }

  if (user) {
    const defaultRoute = getDefaultRoute(access);
    return defaultRoute ? <Navigate to={defaultRoute} replace /> : <NoAccessibleRoute />;
  }

  return <Navigate to={location.pathname.startsWith('/bn') ? '/bn/landing' : '/landing'} replace />;
}

// Keyed by the paths in PUBLIC_MARKETING_PATHS so each can be rendered twice
// below (bare + /bn-prefixed) without duplicating the <Route> declarations.
// Language for these pages comes from the URL (usePublicLanguage), not from
// which of the two routes matched, so the same element node is safe to reuse.
const PUBLIC_MARKETING_ELEMENTS = {
  '/landing': <PublicOnlyRoute><LandingPage /></PublicOnlyRoute>,
  '/privacy-policy': <PrivacyPolicyPage />,
  '/terms': <TermsPage />,
  '/founder': <FounderPage />,
  '/features': <FeatureHubPage />,
  '/features/:slug': <FeatureDetailPage />,
  '/solutions': <SolutionHubPage />,
  '/solutions/:slug': <SolutionDetailPage />,
  '/software': <SoftwareHubPage />,
  '/software/:slug': <SoftwareDetailPage />,
  '/pricing': <PricingPage />,
  '/contact': <ContactPage />,
  '/get-started': <GetStartedPage />,
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/bn" element={<Navigate to="/bn/landing" replace />} />
      {PUBLIC_MARKETING_PATHS.flatMap((path) => [
        <Route key={path} path={path} element={PUBLIC_MARKETING_ELEMENTS[path]} />,
        <Route key={`bn:${path}`} path={`/bn${path}`} element={PUBLIC_MARKETING_ELEMENTS[path]} />,
      ])}
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
