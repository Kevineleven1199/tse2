# Railway Deployment Guide for GoGreenOS

## Overview
GoGreenOS is deployed on Railway using Nixpacks. This document covers common issues and solutions.

---

## Project Structure
```
gogreenorganicclean_264/
├── apps/platform/          # Next.js app (THIS IS WHAT GETS DEPLOYED)
├── legacy-wordpress/       # Old WordPress site (EXCLUDED from build)
├── railway.toml            # Railway configuration
├── nixpacks.toml           # Nixpacks build configuration
├── .railwayignore          # Files to exclude from Railway build
└── package.json            # Root package.json with workspaces
```

---

## Configuration Files

### `railway.toml`
```toml
[build]
builder = "nixpacks"
buildCommand = "cd apps/platform && npm install && npx prisma generate && npm run build"

[deploy]
startCommand = "cd apps/platform && npm run start"
healthcheckPath = "/"
healthcheckTimeout = 300
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

### `nixpacks.toml`
```toml
[phases.setup]
nixPkgs = ["nodejs_20", "npm"]

[phases.install]
cmds = ["cd apps/platform && npm install"]

[phases.build]
cmds = ["cd apps/platform && npx prisma generate && npm run build"]

[start]
cmd = "cd apps/platform && npm run start"
```

### `.railwayignore`
```
legacy-wordpress/
*.md
docs/
.git/
.github/
```

---

## Common Errors & Solutions

### 1. "Could not find root directory: apps/platform"
**Cause**: Railway is looking for a root directory that doesn't exist at the path specified.
**Solution**: 
- Leave Root Directory EMPTY in Railway settings
- Use `railway.toml` and `nixpacks.toml` to handle the monorepo structure
- Build commands should `cd` into the correct directory

### 2. "stream did not contain valid UTF-8"
**Cause**: Nixpacks scans ALL files in the repo. If any file contains non-UTF-8 characters (common in WordPress JS files, binary files, etc.), the build fails.
**Solution**:
- Create `.railwayignore` file
- Add problematic directories: `legacy-wordpress/`
- This tells Nixpacks to skip those files during build

### 3. ESLint/TypeScript Errors During Build
**Cause**: Next.js runs linting during `next build`
**Solution**:
- Fix the lint errors, OR
- Add to `next.config.js`:
```js
module.exports = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true }
}
```

### 4. Prisma Client Not Generated
**Cause**: Prisma client needs to be generated before build
**Solution**: Ensure build command includes `npx prisma generate`:
```
cd apps/platform && npx prisma generate && npm run build
```

### 5. Database Connection Errors
**Cause**: DATABASE_URL not set or incorrect
**Solution**:
- For PostgreSQL: Add Railway Postgres plugin, use `${{Postgres.DATABASE_URL}}`
- For MongoDB: Use full connection string from Atlas
- Ensure IP whitelist includes Railway IPs (or 0.0.0.0/0)

---

## Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `${{Postgres.DATABASE_URL}}` |
| `NEXTAUTH_SECRET` | Random 32+ char string | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | App URL | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| `NODE_ENV` | Environment | `production` |

---

## Deployment Checklist

1. [ ] Ensure `.railwayignore` excludes non-UTF-8 files
2. [ ] Verify `railway.toml` and `nixpacks.toml` exist
3. [ ] Connect correct GitHub repo in Railway
4. [ ] Leave Root Directory empty
5. [ ] Add PostgreSQL database to project
6. [ ] Set all environment variables
7. [ ] Generate public domain
8. [ ] Deploy and monitor build logs

---

## Useful Commands

```bash
# Check git status
git status

# Push to trigger Railway deploy
git push origin main

# View Railway logs (if CLI installed)
railway logs
```

---

## Railway Dashboard Settings

**Service Settings:**
- **Source**: GitHub repo `Kevineleven1199/gogreenorganicclean_264`
- **Branch**: `main`
- **Root Directory**: (leave empty)
- **Builder**: Nixpacks (auto-detected)

**Build Settings** (if not using config files):
- **Build Command**: `cd apps/platform && npm install && npx prisma generate && npm run build`
- **Start Command**: `cd apps/platform && npm run start`
- **Watch Paths**: `apps/platform/**`

---

## Troubleshooting

If deployment still fails:
1. Check build logs for specific error
2. Verify all config files are committed and pushed
3. Try disconnecting and reconnecting the GitHub repo
4. Create a fresh Railway project if needed
5. Use Railway's Atlas Browser AI for help

---

*Last updated: December 2025*
