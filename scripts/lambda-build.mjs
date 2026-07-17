/**
 * Builds a Lambda deployment zip without the SAM CLI.
 *
 * Usage:
 *   node scripts/lambda-build.mjs
 *
 * Output: lambda-deploy.zip  (in project root)
 *
 * After building, deploy manually:
 *   aws lambda update-function-code \
 *     --function-name stockledger-api \
 *     --zip-file fileb://lambda-deploy.zip
 *
 * Or create a new function:
 *   aws lambda create-function \
 *     --function-name stockledger-api \
 *     --runtime nodejs22.x \
 *     --handler lambda.handler \
 *     --zip-file fileb://lambda-deploy.zip \
 *     --role arn:aws:iam::<ACCOUNT>:role/<ROLE> \
 *     --timeout 30 \
 *     --memory-size 512 \
 *     --environment "Variables={DATABASE_URL=...,NODE_ENV=production,DB_MAX_CONNECTIONS=3}"
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const backendDir = path.join(root, "backend");
const outZip = path.join(root, "lambda-deploy.zip");

console.log("Building Lambda deployment package…\n");

// 1. Install production dependencies in backend/
//    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: browsers can't run on Lambda anyway
//    and would only slow the install down (they live outside node_modules).
console.log("  [1/3] npm install --omit=dev");
execSync("npm install --omit=dev", {
  cwd: backendDir,
  stdio: "inherit",
  env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1" },
});

// 2. Remove old zip
if (fs.existsSync(outZip)) {
  fs.unlinkSync(outZip);
}

// 3. Zip backend/ contents (node_modules included, no outer directory).
//    Excluded: secrets, tests, local upload dirs, and the built frontend
//    (backend/public/dist) — Lambda serves the API only.
console.log("\n  [2/3] Creating lambda-deploy.zip");

const EXCLUDED_TOP_LEVEL = new Set(["tests", "public", "uploads", "private_uploads", "coverage"]);
const entries = fs
  .readdirSync(backendDir)
  .filter((name) => !EXCLUDED_TOP_LEVEL.has(name) && !name.startsWith(".env"));
const entryArgs = entries.map((name) => `"${name}"`).join(" ");

if (process.platform === "win32") {
  // PowerShell 5.1's Compress-Archive writes backslash entry names, which
  // Lambda (Linux) cannot extract. bsdtar (ships with Windows 10+) writes
  // proper forward-slash zip entries.
  execSync(`tar.exe -a -cf "${outZip}" ${entryArgs}`, { cwd: backendDir, stdio: "inherit" });
} else {
  execSync(`zip -rq "${outZip}" ${entryArgs}`, { cwd: backendDir, stdio: "inherit" });
}

const sizeMB = (fs.statSync(outZip).size / 1024 / 1024).toFixed(1);
console.log(`\n  [3/3] Done — lambda-deploy.zip (${sizeMB} MB)\n`);
console.log(`Deploy:\n  aws lambda update-function-code --function-name stockledger-api --zip-file fileb://${outZip}\n`);
console.log("Note: backend/node_modules now has production deps only. Run `npm --prefix backend install` to restore dev dependencies.\n");
