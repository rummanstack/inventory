# Deploying the Backend to AWS Lambda

The backend deploys as a single Lambda function behind a **Function URL**. The
frontend deploys separately to Vercel and proxies `/api/*` to the Function URL
via a rewrite, so the browser never talks to Lambda directly — cookies stay
first-party and no CORS is needed.

```
Browser ──▶ Vercel (static frontend)
              └── rewrite /api/* ──▶ Lambda Function URL ──▶ Express app
```

- Entry point: `backend/lambda.js` (`lambda.handler`), wraps the Express app
  with `@vendia/serverless-express`.
- Package: `npm run lambda-build` → `lambda-deploy.zip` at the repo root
  (backend code + production node_modules; excludes `.env`, tests, uploads,
  and the built frontend).

## 1. Build the package

```
npm run lambda-build
```

Afterwards run `npm --prefix backend install` to restore dev dependencies
locally (the build prunes them before zipping).

## 2. Create the function (first deploy only)

Create an execution role, then the function:

```
aws iam create-role --role-name stockledger-api-role \
  --assume-role-policy-document "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"lambda.amazonaws.com\"},\"Action\":\"sts:AssumeRole\"}]}"

aws iam attach-role-policy --role-name stockledger-api-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws lambda create-function \
  --function-name stockledger-api \
  --runtime nodejs22.x \
  --handler lambda.handler \
  --zip-file fileb://lambda-deploy.zip \
  --role arn:aws:iam::<ACCOUNT_ID>:role/stockledger-api-role \
  --timeout 30 \
  --memory-size 1024
```

Set environment variables (see the table below), then create the Function URL:

```
aws lambda create-function-url-config \
  --function-name stockledger-api \
  --auth-type NONE

aws lambda add-permission \
  --function-name stockledger-api \
  --action lambda:InvokeFunctionUrl \
  --principal "*" \
  --function-url-auth-type NONE \
  --statement-id public-url
```

Prefer a Function URL over API Gateway: same payload format (v2, already
handled by `lambda.js`), no stage path prefix to break `/api/...` routing, and
no extra cost. If you do use API Gateway HTTP API, use the `$default` stage so
there is no `/prod` prefix.

## 3. Environment variables

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | postgres connection string | **Required.** Append `?sslmode=no-verify` if the provider needs SSL without a CA chain. |
| `NODE_ENV` | `production` | Enables Secure cookies + HSTS. |
| `DB_MAX_CONNECTIONS` | `3` | Pool size **per Lambda container** — keep small. |
| `FILE_STORAGE_ROOT` | `/tmp` | Lambda's app dir is read-only; without this, local-disk uploads fail (the app still boots). |
| `SKIP_DATABASE_INIT` | `1` (optional) | Skips schema DDL on cold start → much faster. Only set it after the schema exists; **unset it for one deploy whenever `backend/db/schema.js` changes.** |
| `SESSION_COOKIE_NAME` / `SESSION_DAYS` | optional | Defaults: `arinda_session` / `7`. |
| `PHOTO_STORAGE_DRIVER` | `s3` recommended | With `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_S3_PUBLIC_BASE_URL`. `local` writes to `/tmp` — files disappear when the container is recycled. |
| `BACKUP_STORAGE_DRIVER` | `s3` recommended | With `AWS_S3_BACKUP_BUCKET` (or `AWS_S3_BUCKET`). |
| `GEMINI_API_KEY` | optional | AI insights. |

For the S3 drivers, don't set AWS access keys — attach an S3 read/write policy
for the bucket to `stockledger-api-role` instead; the SDK picks up the role
automatically.

## 4. Update an existing deployment

```
npm run lambda-build
aws lambda update-function-code --function-name stockledger-api --zip-file fileb://lambda-deploy.zip
```

## 5. Smoke test

```
curl https://<function-url>/api/landing-chat/status
```

(This route is public — expect a JSON body, not a 500. First hit is a cold start
— if `SKIP_DATABASE_INIT` is unset it runs the schema DDL and can take ~30s,
so keep `--timeout 30` or higher.)

## 6. Point the Vercel frontend at Lambda

When cutting the frontend over to the split setup:

1. **Delete the `api/` directory** from what Vercel deploys. Vercel's
   filesystem takes precedence over rewrites — if `api/[...path].js` still
   exists, it keeps serving `/api/*` itself and the rewrite below is ignored.
2. Replace the rewrites in `vercel.json`:

```json
{
  "buildCommand": "npm run render-build",
  "outputDirectory": "public",
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://<function-url>/api/:path*" },
    { "source": "/uploads/:path*", "destination": "https://<function-url>/uploads/:path*" }
  ]
}
```

No frontend code changes are needed: the app calls relative `/api/...` URLs
with `credentials: "include"`, and because Vercel proxies the request, the
session cookie is set on the Vercel domain (first-party, `SameSite=Lax` keeps
working). The `/uploads` rewrite only matters if `PHOTO_STORAGE_DRIVER=local`;
with S3 photos are served from `AWS_S3_PUBLIC_BASE_URL` directly.

## Known limitations on Lambda

- **PDF export fails** — report PDF export and installment agreement PDFs use
  Playwright/Chromium, which isn't packaged (no browser binaries on Lambda).
  Excel export works (`xlsx` is pure JS). Fixing this later means switching
  `reportExportService` to `@sparticuz/chromium` + `playwright-core`, or a
  separate container-image function.
- **Employee/voucher document uploads are ephemeral** — they use disk storage
  under `FILE_STORAGE_ROOT` (`/tmp`), which is per-container and temporary.
  Avoid relying on these until they get an S3 driver.
- **Cold starts** run the full app bootstrap; set `SKIP_DATABASE_INIT=1`
  (after first boot) to keep them short.
