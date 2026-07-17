import http from 'node:http';
import path from 'node:path';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';

import puppeteer from 'puppeteer';

import { PUBLIC_ROUTES } from './public-routes.mjs';
import { distRoot } from './dist-root.mjs';

const serverPort = Number(process.env.PRERENDER_PORT || 4173);

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
  const server = createStaticServer(distRoot);

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(serverPort, '127.0.0.1', resolve);
  });

  // puppeteer (not puppeteer-core) bundles its own Chromium, downloaded for
  // the current platform at npm install time, so this works unmodified on
  // Windows locally and on Render/Vercel's Linux build containers.
  // PUPPETEER_EXECUTABLE_PATH still overrides it if one is set.
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });

    // CI build containers (Render) are often CPU-starved right after a Vite build
    // finishes, and the very first navigation also pays for JS bundle parse/compile.
    // A generous timeout plus one retry absorbs that transient slowness without
    // failing the whole deploy over a single slow page.
    async function renderRoute(route) {
      await page.goto(`http://127.0.0.1:${serverPort}${route}`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('main', { timeout: 45000 });
      return page.evaluate(() => '<!doctype html>\n' + document.documentElement.outerHTML);
    }

    for (const route of PUBLIC_ROUTES) {
      let html;
      try {
        html = await renderRoute(route);
      } catch (error) {
        console.warn(`Retrying ${route} after: ${error.message}`);
        html = await renderRoute(route);
      }
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
