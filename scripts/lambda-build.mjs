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
console.log("  [1/3] npm install --omit=dev");
execSync("npm install --omit=dev", { cwd: backendDir, stdio: "inherit" });

// 2. Remove old zip
if (fs.existsSync(outZip)) {
  fs.unlinkSync(outZip);
}

// 3. Zip backend/ contents (node_modules included, no outer directory)
//    Uses PowerShell on Windows, zip on Unix/Mac.
console.log("\n  [2/3] Creating lambda-deploy.zip");

const isWindows = process.platform === "win32";

if (isWindows) {
  execSync(
    `powershell -Command "Compress-Archive -Path '${backendDir}\\*' -DestinationPath '${outZip}' -Force"`,
    { stdio: "inherit" },
  );
} else {
  execSync(`zip -r "${outZip}" . --exclude "*.test.js" --exclude ".env*"`, {
    cwd: backendDir,
    stdio: "inherit",
  });
}

const sizeMB = (fs.statSync(outZip).size / 1024 / 1024).toFixed(1);
console.log(`\n  [3/3] Done — lambda-deploy.zip (${sizeMB} MB)\n`);
console.log(`Deploy:\n  aws lambda update-function-code --function-name stockledger-api --zip-file fileb://${outZip}\n`);
