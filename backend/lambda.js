/**
 * AWS Lambda entry point.
 *
 * Wraps the Express app with @vendia/serverless-express so it handles
 * API Gateway HTTP API (v2) events. The app is initialised once on the
 * first invocation and reused across warm-container invocations.
 *
 * Environment variables expected in Lambda:
 *   DATABASE_URL           - PostgreSQL connection string (required)
 *   SESSION_COOKIE_NAME    - cookie name (default: arinda_session)
 *   SESSION_DAYS           - session lifetime in days (default: 7)
 *   DB_MAX_CONNECTIONS     - pg pool size per Lambda instance (default: 3)
 *   NODE_ENV               - set to "production"
 *
 * Handler reference in template.yaml / Lambda console: lambda.handler
 */

import serverlessExpress from "@vendia/serverless-express";
import { createBackendApp } from "./composition.js";

const BINARY_CONTENT_TYPES = [
  "application/octet-stream",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

// Bootstrap once per container; re-used on warm invocations.
const appPromise = createBackendApp().then(({ app }) =>
  serverlessExpress({
    app,
    binarySettings: {
      contentTypes: BINARY_CONTENT_TYPES,
      contentEncodings: ["gzip", "deflate", "br"],
    },
  }),
);

export const handler = async (event, context) => {
  // Tell Lambda not to wait for the event loop to drain before freezing the
  // container - pg keeps idle connections alive, which would otherwise block.
  context.callbackWaitsForEmptyEventLoop = false;

  const handle = await appPromise;
  return handle(event, context);
};
