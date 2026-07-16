// Hand-maintained (not generated from seoPages.js/intentPages.js): those data
// files re-export .png assets, which a plain Node script can't import
// (no Vite asset loader here). Keep this list in sync with
// frontend/src/seo/publicRoutePaths.js and the slugs in
// frontend/src/features/landing/data/{seoPages,intentPages}.js when either
// changes. Every English route also has a /bn sibling for the bilingual
// public site.
const ENGLISH_ROUTES = [
  '/landing',
  '/features',
  '/features/inventory-management',
  '/features/retail-pos',
  '/features/accounting',
  '/features/hr-payroll',
  '/features/purchase-management',
  '/features/due-collection',
  '/features/dsr-dealer-management',
  '/features/installment-sales',
  '/features/reporting',
  '/features/repair-warranty',
  '/solutions',
  '/solutions/retail-shop',
  '/solutions/wholesale-business',
  '/solutions/dealer-distributor',
  '/solutions/dsr-sales-team',
  '/solutions/pharmacy',
  '/solutions/grocery-store',
  '/software',
  '/software/business-management-software-bangladesh',
  '/software/hr-payroll-software-bangladesh',
  '/software/inventory-software-bangladesh',
  '/software/dsr-management-software-bangladesh',
  '/software/dealer-management-software-bangladesh',
  '/software/retail-pos-software-bangladesh',
  '/software/accounting-software-bangladesh',
  '/software/business-reporting-software-bangladesh',
  '/software/pharmacy-management-software-bangladesh',
  '/software/wholesale-software-bangladesh',
  '/software/shop-management-software-bangladesh',
  '/software/grocery-store-software-bangladesh',
  '/pricing',
  '/contact',
  '/get-started',
  '/founder',
  '/privacy-policy',
  '/terms',
];

export const PUBLIC_ROUTES = [
  '/',
  ...ENGLISH_ROUTES,
  ...ENGLISH_ROUTES.map((route) => `/bn${route}`),
];

export const INDEXABLE_PUBLIC_ROUTES = PUBLIC_ROUTES.filter((route) => route !== '/');
