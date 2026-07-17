import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';

import { INDEXABLE_PUBLIC_ROUTES, PUBLIC_ROUTES } from './public-routes.mjs';
import { distRoot } from './dist-root.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const reportPath = path.join(frontendRoot, 'public-navigation-audit.txt');

const routeSet = new Set(PUBLIC_ROUTES);

function normalizeRoute(href) {
  if (!href || !href.startsWith('/')) {
    return null;
  }

  const [pathname] = href.split(/[?#]/);
  if (!pathname) {
    return null;
  }

  if (pathname !== '/' && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function getHtmlPath(route) {
  if (route === '/') {
    return path.join(distRoot, 'index.html');
  }

  return path.join(distRoot, route.replace(/^\//, ''), 'index.html');
}

function collectLinks(html) {
  const matches = html.matchAll(/href="([^"]+)"/g);
  const links = new Set();

  for (const match of matches) {
    const route = normalizeRoute(match[1]);
    if (route && routeSet.has(route)) {
      links.add(route);
    }
  }

  return [...links].sort();
}

// This audit only makes sense against prerendered per-route HTML files. When
// prerendering was skipped (see prerender-public-pages.mjs), every route falls
// back to the same root index.html, so there's nothing route-specific to audit.
try {
  await readFile(getHtmlPath(INDEXABLE_PUBLIC_ROUTES[0]), 'utf8');
} catch {
  console.warn('Skipping navigation audit — no prerendered route files found.');
  process.exit(0);
}

const pages = [];
const incomingCounts = new Map(INDEXABLE_PUBLIC_ROUTES.map((route) => [route, 0]));

for (const route of INDEXABLE_PUBLIC_ROUTES) {
  const html = await readFile(getHtmlPath(route), 'utf8');
  const links = collectLinks(html).filter((href) => href !== route && href !== '/');

  pages.push({ route, links });

  for (const href of links) {
    if (incomingCounts.has(href)) {
      incomingCounts.set(href, incomingCounts.get(href) + 1);
    }
  }
}

const orphanRoutes = INDEXABLE_PUBLIC_ROUTES.filter((route) => (incomingCounts.get(route) || 0) === 0);
const weakRoutes = INDEXABLE_PUBLIC_ROUTES.filter((route) => (incomingCounts.get(route) || 0) < 2);
const detailRoutes = INDEXABLE_PUBLIC_ROUTES.filter((route) => route.startsWith('/features/') || route.startsWith('/solutions/'));
const detailRoutesMissingParent = detailRoutes.filter((route) => {
  const page = pages.find((entry) => entry.route === route);
  if (!page) {
    return true;
  }

  const expectedParent = route.startsWith('/features/') ? '/features' : '/solutions';
  return !page.links.includes(expectedParent);
});

const lines = [];
lines.push('StockLedger Public Navigation Audit');
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push('');
lines.push('Summary');
lines.push(`- Indexable public routes checked: ${INDEXABLE_PUBLIC_ROUTES.length}`);
lines.push(`- Orphan routes: ${orphanRoutes.length}`);
lines.push(`- Weak routes (<2 internal incoming links): ${weakRoutes.length}`);
lines.push(`- Detail routes missing parent hub link: ${detailRoutesMissingParent.length}`);
lines.push('');
lines.push('Findings');
lines.push(`- Orphan routes: ${orphanRoutes.length ? orphanRoutes.join(', ') : 'None'}`);
lines.push(`- Weak routes: ${weakRoutes.length ? weakRoutes.join(', ') : 'None'}`);
lines.push(`- Missing parent hub links: ${detailRoutesMissingParent.length ? detailRoutesMissingParent.join(', ') : 'None'}`);
lines.push('');
lines.push('Per-route incoming link counts');
for (const route of INDEXABLE_PUBLIC_ROUTES) {
  lines.push(`- ${route}: ${incomingCounts.get(route) || 0}`);
}
lines.push('');
lines.push('Per-route outgoing public links');
for (const page of pages) {
  lines.push(`- ${page.route}: ${page.links.length ? page.links.join(', ') : 'None'}`);
}

await writeFile(reportPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`Wrote ${path.relative(frontendRoot, reportPath)}`);
