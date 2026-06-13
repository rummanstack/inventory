import { createBackendRuntime } from '../backend/runtime.js';

let runtimePromise;

async function getRuntime() {
  if (!runtimePromise) {
    runtimePromise = createBackendRuntime();
  }

  return runtimePromise;
}



export default async function handler(req, res) {
  const { app } = await getRuntime();

  const requestUrl = new URL(req.url || '/', 'http://localhost');
  const apiPath = requestUrl.searchParams.get('path');

  if (apiPath !== null) {
    requestUrl.searchParams.delete('path');
    const remainingQuery = requestUrl.searchParams.toString();
    req.url = `/api/${apiPath}${remainingQuery ? `?${remainingQuery}` : ''}`;
    req.originalUrl = req.url;
  }

  return app(req, res);
}
