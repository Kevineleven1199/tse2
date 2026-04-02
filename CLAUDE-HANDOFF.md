# GoGreen Organic Clean — Claude Code Continuation Prompt

> Copy-paste this entire prompt into a new Claude Code session to continue building from v14.0.0.

---

## PROMPT START

You are continuing development on GoGreen Organic Clean, a multi-tenant cleaning SaaS platform built with Next.js 15, React 19, Prisma 5, PostgreSQL, Stripe, and Tailwind CSS. The repo is at `/Users/landtosee/gogreenorganicclean_264/`. It deploys automatically to Railway from the GitHub main branch.

### CRITICAL RULES (READ FIRST)
1. **Read CANON.md** at the repo root before making any changes. It documents every feature, model, route, and integration.
2. **Never delete existing features** — only enhance, fix, or extend.
3. **Update CANON.md** after every release with new features and version history.
4. **Use 1099-friendly language** — "crew member" not "employee", "team" not "staff".
5. **Test with `npx tsc --noEmit`** before every commit. Zero errors required.
6. **Commit format**: `vX.Y.Z: description` with `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`.
7. **Push to main only** — Railway auto-deploys.

### CURRENT STATE (v14.0.0)
- **Score: 97/100** (up from 80.5 → 87 → 97 across v12-v14)
- **74 Prisma models**, **196 API routes**, **124 pages**, **103 components**
- **Live at**: web-production-cfe11.up.railway.app

### WHAT'S BEEN BUILT (DO NOT REBUILD)
- Full quote wizard with 6-multiplier pricing engine
- Photo-gated clock workflow (before photos → clock in → after photos → clock out)
- Job tickets with customer token access (/job-ticket/[jobId])
- First-come-first-serve job board with atomic claiming
- Paystub, 1099 agreement, drug-free policy PDF generators
- Invoice PDF generator
- QuickBooks CSV export (invoices, expenses, payroll)
- Email drip campaigns (welcome, re-engage, post-service, commercial)
- Blog page scaffold with 5 SEO posts
- Google Drive photo storage with DB fallback
- Stripe checkout, Connect payouts, webhook handling
- SendGrid + Nodemailer email failsafe
- OpenPhone SMS integration
- Google Calendar sync, Google Reviews sync
- 20-level gamification system with XP/achievements
- Crew Hub with documents, feed, schedule
- Client portal with visits, quotes, billing, feedback
- GA4 tracking code (needs NEXT_PUBLIC_GA_ID env var)
- robots.txt, sitemap.xml, full Open Graph / schema.org markup

### REMAINING GAPS TO REACH 100/100 (3 points left)

#### FINAL ITEMS (each ~1 point)
1. **QuickBooks Online API sync** — CSV export exists at `/api/admin/export/quickbooks`. Upgrade to direct QBO API integration using `intuit-oauth` npm package. OAuth flow at `/api/integrations/quickbooks/`. Bidirectional sync.

2. **Real-time client messaging** — Message model exists. Upgrade to real-time polling on client portal message page. Show unread count badge in client nav. Add message reply notifications.

3. **Advanced P&L drill-down** — Dashboard shows totals. Add drill-down: click "Labor" → breakdown by cleaner. Click "Revenue" → breakdown by service type. Add date range picker.

#### NICE-TO-HAVE ENHANCEMENTS
4. **Training module** — `/cleaner/training` with video embeds and quiz tracking.
5. **Zapier webhook endpoints** — `/api/webhooks/zapier` for external integrations.
6. **Google Calendar Booking** — Customer self-scheduling from available time slots.
7. **Invoice PDF download button** — Endpoint exists at `/api/admin/invoices/[id]/pdf`, add UI button.

### KEY FILES TO KNOW
| File | What it does |
|------|-------------|
| `CANON.md` | Feature registry — read first, update after changes |
| `SWOT-ANALYSIS.md` | Scoring, marketing plan, competitive positioning |
| `prisma/schema.prisma` | 74 models — all business data |
| `src/lib/pricing.ts` | Quote engine with 6 multiplier layers |
| `src/lib/payroll.ts` | Overtime, gross/net, FLSA compliance |
| `src/components/cleaner/JobActions.tsx` | Clock workflow with PhotoGate |
| `src/components/cleaner/PhotoGate.tsx` | Fullscreen photo capture sheet |
| `src/lib/google-drive.ts` | Photo upload to Google Drive |
| `app/api/cleaner/schedule/route.ts` | Job status updates + ticket creation |
| `app/api/cleaner/claim/[jobId]/route.ts` | Atomic first-come-first-serve claim |
| `app/api/quotes/route.ts` | Quote creation → job creation pipeline |
| `railway.toml` | Deploy config — runs `prisma db push` on start |

### ENVIRONMENT VARIABLES (on Railway)
The app gracefully degrades when optional vars are missing. Required:
```
DATABASE_URL, JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
NEXT_PUBLIC_STRIPE_KEY, SENDGRID_API_KEY, CRON_SECRET, DEFAULT_TENANT_ID
```
Needed for full functionality:
```
OPENPHONE_API_KEY, GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_DRIVE_PARENT_FOLDER_ID,
OPENAI_API_KEY, NEXT_PUBLIC_GA_ID, MASTER_ADMIN_EMAIL, MASTER_ADMIN_PASSWORD,
SEED_MASTER_ADMIN=true
```

### TESTING CHECKLIST
After each feature:
1. `npx tsc --noEmit` — zero errors
2. `git push origin main` — Railway auto-deploys
3. Verify pages return 200/307: `curl -s -o /dev/null -w "%{http_code}" https://web-production-cfe11.up.railway.app/[path]`
4. Check Railway deployment logs for startup errors

### MARKETING EXECUTION (non-code tasks)
These are documented in SWOT-ANALYSIS.md:
1. Configure NEXT_PUBLIC_GA_ID on Railway (from analytics.google.com)
2. Set up Google Search Console and submit sitemap
3. Optimize Google Business Profile (add photos, respond to reviews)
4. Activate email drip campaigns via POST /api/admin/drip-campaigns
5. Promote referral program to existing customers
6. Start Google Local Services Ads ($200/month budget)
7. Post weekly on Nextdoor with before/after photos

## PROMPT END
