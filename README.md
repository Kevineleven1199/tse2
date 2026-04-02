# GoGreenOS – Multi-tenant SaaS for GoGreen Organic Clean

This repository now houses the **GoGreenOS** platform: a multi-tenant Next.js application that replaces the legacy WordPress marketing site and Jobber workflows. WordPress remains available in read-only mode strictly for historical reference.

## Repository layout

- `apps/platform/` – Next.js 14 application (App Router) that powers customer booking, AI quoting, crew marketplace, community feed, and automation dashboards.
- `legacy-wordpress/` – Archived WordPress site kept for reference-only access. It is **not** deployed to Railway.
- `mysqleditor/` – Deprecated phpMyAdmin tooling kept for completeness (optional to remove later).
- `bots/kalshi-bot/` – standalone Kalshi bot code.
- `bots/polymarket-bot/` – standalone Polymarket bot code.
- `scripts/check_bot_separation.py` – guard that fails when Kalshi and Polymarket bot code references each other.

## Local development

```bash
npm install           # installs workspace dependencies
npm run dev           # starts the Next.js app on http://localhost:3000
npm run prisma:generate
```

The project uses npm workspaces; all app-specific scripts are proxied through the root `package.json`.

### Prediction market bot commands

```bash
npm run bots:separation:check
npm run kalshi:status
npm run kalshi:paper -- --ticks 100 --seed 7
npm run pmhft:status
npm run pmhft:paper -- --ticks 50 --seed 7
```

### Environment variables

Create `apps/platform/.env.local` (or configure on Railway) with:

```
DATABASE_URL=postgres://...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
OPENPHONE_API_KEY=...
OPENPHONE_API_BASE_URL=https://api.openphone.com/v1/messages
GOOGLE_SERVICE_ACCOUNT=service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=primary
```

Missing credentials will gracefully fall back to mocked behaviour (e.g., quote narratives, calendar sync).

### Database

The Prisma schema targets PostgreSQL. Run migrations once you have a Railway Postgres instance or local database.

```bash
npm run prisma:migrate -- --name init
```

## Railway deployment

1. Create a new Railway project and provision a PostgreSQL database.
2. Set the service to build from `apps/platform` with the default `npm install && npm run build` step and `npm run start` for the start command.
3. Add the environment variables listed above to the service in Railway.
4. Point your primary domain (e.g., `app.gogreenorganicclean.com`) to the Railway-generated URL.
5. (Optional) Configure wildcard subdomains if you want per-tenant subdomains (`tenant.gogreenorganicclean.com`). The middleware falls back to tenant slug in the first path segment if no subdomain exists.

### Treating WordPress as reference-only

- The legacy WordPress instance now lives in `legacy-wordpress/`. Do **not** deploy it to Railway.
- If you need to host the legacy content for archival access, publish it separately (e.g., behind basic auth on a static host) or run it locally.
- Knowledge base articles or media you still want surfaced in GoGreenOS can be re-imported manually into the new platform.

## Key app flows

- `/request` – public intake form that feeds `POST /api/requests`, triggers AI quote generation, and notifies customers via OpenPhone.
- `/{tenantSlug}/dashboard` – HQ command center with metrics, booking pipeline, and crew utilisation.
- `/{tenantSlug}/requests` – triage queue for new leads.
- `/{tenantSlug}/marketplace` – real-time job board for cleaners (65/35 revenue split automation hooks).
- `/{tenantSlug}/community` – Nextdoor-style neighbor feed for virality and referrals.
- `/{tenantSlug}/settings` – integration hub for OpenPhone, Wise, Zelle, PayPal, Google Calendar, and ADP 1099 workflows.

## Next steps

- Connect production APIs (OpenAI, OpenPhone, Wise, Google Workspace, PayPal, Zelle, ADP) through Railway secrets.
- Implement authentication/authorization (e.g., NextAuth + Magic Links) for tenant admins, cleaners, and customers.
- Build data ingestion scripts to migrate any remaining WordPress assets into GoGreenOS modules.

