import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';

import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const distRoot = path.join(frontendRoot, 'dist');
const serverPort = Number(process.env.PRERENDER_PORT || 4173);

const PUBLIC_ROUTES = [
  '/',
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
  '/pricing',
  '/contact',
  '/get-started',
  '/founder',
  '/privacy-policy',
  '/terms',
];

const BROWSER_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

async function findBrowserExecutable() {
  for (const candidate of BROWSER_CANDIDATES) {
    try {
      await stat(candidate);
      return candidate;
    } catch {
      // Try the next local browser.
    }
  }

  throw new Error('No Chrome or Edge executable was found. Set PUPPETEER_EXECUTABLE_PATH to continue.');
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.xml': return 'application/xml; charset=utf-8';
    case '.txt': return 'text/plain; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.ico': return 'image/x-icon';
    case '.webmanifest': return 'application/manifest+json';
    default: return 'application/octet-stream';
  }
}

function createStaticServer(rootDirectory) {
  return http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
      let relativePath = decodeURIComponent(requestUrl.pathname);
      if (relativePath === '/') {
        relativePath = '/index.html';
      }

      const normalizedRoot = path.normalize(rootDirectory);
      const requestedPath = path.normalize(path.join(rootDirectory, relativePath));
      let resolvedPath = requestedPath.startsWith(normalizedRoot)
        ? requestedPath
        : path.join(rootDirectory, 'index.html');

      try {
        const resolvedStat = await stat(resolvedPath);
        if (resolvedStat.isDirectory()) {
          resolvedPath = path.join(resolvedPath, 'index.html');
        }
      } catch {
        resolvedPath = path.join(rootDirectory, 'index.html');
      }

      const content = await readFile(resolvedPath);
      response.writeHead(200, { 'Content-Type': getContentType(resolvedPath) });
      response.end(content);
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(String(error));
    }
  });
}

async function writeRouteHtml(route, html) {
  if (route === '/') {
    await writeFile(path.join(distRoot, 'index.html'), html, 'utf8');
    return;
  }

  const routeDirectory = path.join(distRoot, route.replace(/^\//, ''));
  await mkdir(routeDirectory, { recursive: true });
  await writeFile(path.join(routeDirectory, 'index.html'), html, 'utf8');
}

async function prerender() {
  const executablePath = await findBrowserExecutable();
  const server = createStaticServer(distRoot);

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(serverPort, '127.0.0.1', resolve);
  });

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });

    for (const route of PUBLIC_ROUTES) {
      await page.goto(`http://127.0.0.1:${serverPort}${route}`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('main', { timeout: 15000 });
      const html = await page.evaluate(() => '<!doctype html>\n' + document.documentElement.outerHTML);
      await writeRouteHtml(route, html);
      console.log(`Prerendered ${route}`);
    }
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

await prerender();
