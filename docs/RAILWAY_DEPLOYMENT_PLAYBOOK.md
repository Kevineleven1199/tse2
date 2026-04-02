# Railway Deployment Playbook (Nixpacks)

This is the fix that got this project over repeated Railway deployment failures.

## Root Cause We Hit

Railway Nixpacks already runs `npm ci` in the **install** phase.
Our `buildCommand` also ran `npm ci`, which caused:

`EBUSY: resource busy or locked, rmdir '/app/node_modules/.cache'`

That second install step was fighting with mounted cache directories in the build container.

## Working Pattern

Use one install phase only, then keep build steps focused on generate/build/copy.

### Known-good `railway.toml` pattern

```toml
[build]
builder = "nixpacks"
buildCommand = "npm run prisma:generate && npm run build && cp -r apps/platform/.next/static apps/platform/.next/standalone/apps/platform/.next/static && cp -r apps/platform/public apps/platform/.next/standalone/apps/platform/public"

[deploy]
startCommand = "node apps/platform/.next/standalone/apps/platform/server.js"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 5
numReplicas = 1
```

## Rules To Reuse Across Projects

1. If `builder = "nixpacks"`, do not put `npm ci` or `npm install` in `buildCommand`.
2. Keep `startCommand` aligned with your real build artifact path.
3. Use a lightweight health endpoint (`/api/health`) that does not require auth or DB writes.
4. In monorepos, keep all paths explicit and test the exact command chain locally before pushing.
5. If you see `EBUSY` under `/app/node_modules/.cache`, remove duplicate install commands first.

## Quick Verification Before Push

```bash
npm ci
npm run prisma:generate
npm run build
```

Then verify your start command path exists:

```bash
ls apps/platform/.next/standalone/apps/platform/server.js
```

## If Railway Still Fails

1. Check whether Railway is using `railway.toml`, `railway.json`, or dashboard overrides.
2. Confirm no config still points at a missing server path.
3. Paste the first failing log block (error + 20 lines above it) and patch from there.
