# Railway Deployment Reference

## Project
- **Project:** exemplary-benevolence
- **Service:** web (web-production-cfe11.up.railway.app)
- **Region:** us-east4
- **Branch:** main (auto-deploy on push)

## Database
- **Service:** Postgres
- **Internal URL:** `postgresql://postgres:MeMEemAQaVEpSCxDRJqcFIZHMkyYBKoO@postgres.railway.internal:5432/railway`
- **Public Proxy URL:** `postgresql://postgres:MeMEemAQaVEpSCxDRJqcFIZHMkyYBKoO@yamanote.proxy.rlwy.net:59283/railway`
- **Use internal URL** in Railway env vars (faster, no egress)
- **Use public URL** for local development, migrations, and direct DB access

## Deploy Config (railway.toml)
```toml
[build]
builder = "nixpacks"
buildCommand = "npm run prisma:generate && npm run build && cp -r apps/platform/.next/static apps/platform/.next/standalone/apps/platform/.next/static && cp -r apps/platform/public apps/platform/.next/standalone/apps/platform/public"

[deploy]
startCommand = "cd apps/platform && npx prisma db push 2>&1 && cd ../.. && node apps/platform/.next/standalone/apps/platform/server.js"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 5
numReplicas = 1
```

## Required Environment Variables
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Auto-linked from Postgres (use internal URL) |
| `AUTH_SECRET` | JWT signing — `openssl rand -base64 32` |
| `CRON_SECRET` | Cron endpoint auth — `openssl rand -base64 32` |
| `DEFAULT_TENANT_ID` | `ten_gogreen` |
| `DEFAULT_TENANT_SLUG` | `gogreen` |
| `MASTER_ADMIN_EMAIL` | `kevin@ggoc.us` |
| `MASTER_ADMIN_PASSWORD` | Admin login password |
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_APP_URL` | `https://web-production-cfe11.up.railway.app` |

## Cron Jobs
All require `Authorization: Bearer {CRON_SECRET}` header.

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `GET /api/cron/recurring-jobs` | Daily 6 AM | Creates jobs from recurring schedules |
| `GET /api/cron/process-payouts` | Every 15 min | Stripe payouts to cleaners |
| `GET /api/cron/reminders` | Daily 10 AM | Appointment reminders |
| `GET /api/cron/review-requests` | Daily 2 PM | Review request SMS |
| `GET /api/cron/expire-estimates` | Daily midnight | Expire old estimates |
| `GET /api/cron/auto-blog` | Weekly Monday | AI blog post generation |
| `GET /api/cron/jobber-sync` | Every 6 hours | Sync Jobber + clock alerts |
| `GET /api/cron/backup` | Daily midnight | DB backup summary to Drive |

## Webhooks to Configure
| Provider | URL |
|----------|-----|
| Stripe | `https://web-production-cfe11.up.railway.app/api/webhooks/stripe` |
| OpenPhone | `https://web-production-cfe11.up.railway.app/api/webhooks/openphone` |

## Schema Changes
- `prisma db push` runs on every deploy (without `--accept-data-loss`)
- Additive changes (new columns, tables, indexes) apply automatically
- Destructive changes (column drops, renames) will FAIL the deploy
- For destructive changes: connect via public proxy URL and run manually

## Direct DB Access
```bash
# Connect with psql
psql "postgresql://postgres:MeMEemAQaVEpSCxDRJqcFIZHMkyYBKoO@yamanote.proxy.rlwy.net:59283/railway"

# Run Prisma commands against production
DATABASE_URL="postgresql://postgres:MeMEemAQaVEpSCxDRJqcFIZHMkyYBKoO@yamanote.proxy.rlwy.net:59283/railway" npx prisma studio
```
