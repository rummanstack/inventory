// Plain data, no React/Vite-only syntax, so both App.jsx and the Node build
// scripts (frontend/scripts/*.mjs) can import this single source of truth.
export const PUBLIC_MARKETING_PATHS = [
  '/landing',
  '/privacy-policy',
  '/terms',
  '/founder',
  '/features',
  '/features/:slug',
  '/solutions',
  '/solutions/:slug',
  '/software',
  '/software/:slug',
  '/pricing',
  '/contact',
  '/get-started',
];
