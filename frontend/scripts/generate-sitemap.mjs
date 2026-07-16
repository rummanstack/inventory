import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';

import { INDEXABLE_PUBLIC_ROUTES } from './public-routes.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const sitemapPath = path.join(frontendRoot, 'public', 'sitemap.xml');

// Keep this in sync with SEO_CONFIG.siteUrl in frontend/src/seo/config.js.
// Not imported directly because that file reads import.meta.env, a
// Vite-only feature this plain Node build script doesn't have.
const SITE_URL = 'https://stockledger.pro';

// Per-route priority/changefreq curation. Any indexable route not listed
// here still gets a sensible default from ROUTE_PREFIX_DEFAULTS below, so a
// newly added page can never be silently missing from the sitemap.
const ROUTE_OVERRIDES = {
  '/landing': { changefreq: 'weekly', priority: '1.0' },
  '/features': { changefreq: 'weekly', priority: '0.9' },
  '/features/inventory-management': { changefreq: 'monthly', priority: '0.8' },
  '/features/retail-pos': { changefreq: 'monthly', priority: '0.8' },
  '/features/accounting': { changefreq: 'monthly', priority: '0.8' },
  '/features/hr-payroll': { changefreq: 'monthly', priority: '0.75' },
  '/features/purchase-management': { changefreq: 'monthly', priority: '0.75' },
  '/features/due-collection': { changefreq: 'monthly', priority: '0.75' },
  '/features/dsr-dealer-management': { changefreq: 'monthly', priority: '0.8' },
  '/features/installment-sales': { changefreq: 'monthly', priority: '0.7' },
  '/features/reporting': { changefreq: 'monthly', priority: '0.75' },
  '/features/repair-warranty': { changefreq: 'monthly', priority: '0.7' },
  '/solutions': { changefreq: 'weekly', priority: '0.9' },
  '/solutions/retail-shop': { changefreq: 'monthly', priority: '0.8' },
  '/solutions/wholesale-business': { changefreq: 'monthly', priority: '0.8' },
  '/solutions/dealer-distributor': { changefreq: 'monthly', priority: '0.8' },
  '/solutions/dsr-sales-team': { changefreq: 'monthly', priority: '0.75' },
  '/solutions/pharmacy': { changefreq: 'monthly', priority: '0.75' },
  '/solutions/grocery-store': { changefreq: 'monthly', priority: '0.75' },
  '/software': { changefreq: 'weekly', priority: '0.85' },
  '/software/business-management-software-bangladesh': { changefreq: 'monthly', priority: '0.8' },
  '/software/hr-payroll-software-bangladesh': { changefreq: 'monthly', priority: '0.75' },
  '/software/inventory-software-bangladesh': { changefreq: 'monthly', priority: '0.8' },
  '/software/dsr-management-software-bangladesh': { changefreq: 'monthly', priority: '0.75' },
  '/software/dealer-management-software-bangladesh': { changefreq: 'monthly', priority: '0.75' },
  '/software/retail-pos-software-bangladesh': { changefreq: 'monthly', priority: '0.8' },
  '/software/accounting-software-bangladesh': { changefreq: 'monthly', priority: '0.8' },
  '/software/business-reporting-software-bangladesh': { changefreq: 'monthly', priority: '0.75' },
  '/software/pharmacy-management-software-bangladesh': { changefreq: 'monthly', priority: '0.75' },
  '/software/wholesale-software-bangladesh': { changefreq: 'monthly', priority: '0.8' },
  '/software/shop-management-software-bangladesh': { changefreq: 'monthly', priority: '0.75' },
  '/software/grocery-store-software-bangladesh': { changefreq: 'monthly', priority: '0.75' },
  '/pricing': { changefreq: 'monthly', priority: '0.7' },
  '/get-started': { changefreq: 'monthly', priority: '0.75' },
  '/contact': { changefreq: 'monthly', priority: '0.7' },
  '/founder': { changefreq: 'monthly', priority: '0.6' },
  '/privacy-policy': { changefreq: 'yearly', priority: '0.3' },
  '/terms': { changefreq: 'yearly', priority: '0.3' },
};

const ROUTE_PREFIX_DEFAULTS = [
  { prefix: '/features/', changefreq: 'monthly', priority: '0.75' },
  { prefix: '/solutions/', changefreq: 'monthly', priority: '0.75' },
  { prefix: '/software/', changefreq: 'monthly', priority: '0.75' },
];

const FALLBACK_DEFAULT = { changefreq: 'monthly', priority: '0.6' };

// A /bn/* route inherits its English sibling's priority/changefreq curation
// rather than needing its own ROUTE_OVERRIDES entry.
function stripBnPrefix(route) {
  if (route === '/bn') return '/landing';
  return route.startsWith('/bn/') ? route.slice(3) : route;
}

function entryFor(route) {
  const basePath = stripBnPrefix(route);
  if (ROUTE_OVERRIDES[basePath]) return ROUTE_OVERRIDES[basePath];
  const prefixMatch = ROUTE_PREFIX_DEFAULTS.find(({ prefix }) => basePath.startsWith(prefix));
  return prefixMatch || FALLBACK_DEFAULT;
}

function buildSitemap() {
  const urls = INDEXABLE_PUBLIC_ROUTES.map((route) => {
    const { changefreq, priority } = entryFor(route);
    const basePath = stripBnPrefix(route);
    const loc = `${SITE_URL}${route}`;
    const enHref = `${SITE_URL}${basePath}`;
    const bnHref = `${SITE_URL}/bn${basePath}`;
    return [
      `  <url>`,
      `<loc>${loc}</loc>`,
      `<changefreq>${changefreq}</changefreq>`,
      `<priority>${priority}</priority>`,
      `<xhtml:link rel="alternate" hreflang="en" href="${enHref}"/>`,
      `<xhtml:link rel="alternate" hreflang="bn" href="${bnHref}"/>`,
      `<xhtml:link rel="alternate" hreflang="x-default" href="${enHref}"/>`,
      `</url>`,
    ].join('');
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

await writeFile(sitemapPath, buildSitemap(), 'utf8');
console.log(`Generated ${path.relative(frontendRoot, sitemapPath)} with ${INDEXABLE_PUBLIC_ROUTES.length} URLs.`);
