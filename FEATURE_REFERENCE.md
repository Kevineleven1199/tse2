# GoGreen Platform — Feature Reference & Independence Scorecard

> **Last Updated:** 2026-03-17 (Launch Day)
> **Purpose:** Living document to track every confirmed feature, its real status, and progress toward full independence from third-party operational tools.
> **Rule:** Never remove a feature from this doc. If something breaks, mark it BROKEN — don't delete the row.

---

## INDEPENDENCE SCORE: 52 / 100

We need to fully replace: **Jobber** (job management), **OpenPhone** (communications), **QuickBooks** (accounting), **ADP** (payroll). Here's where we stand:

| System to Replace | What It Does | Our Coverage | Score |
|---|---|---|---|
| **Jobber** | Job scheduling, dispatch, client CRM, quotes, invoices | Scheduling ✅ Quotes ✅ Invoices ✅ Client CRM ✅ Dispatch (partial — no drag-drop assign) | **70/100** |
| **OpenPhone** | Business phone, SMS, call tracking | SMS sending ✅ Call transcript ingestion ✅ Webhook receiver ✅ No in-app calling, no shared inbox | **45/100** |
| **QuickBooks** | P&L, expense tracking, tax reporting, bank reconciliation | P&L dashboard ✅ Revenue tracking ✅ Expense entry ✅ No bank sync, no tax reports, no reconciliation | **35/100** |
| **ADP** | Payroll processing, tax withholding, direct deposit, W-2s | Timesheet tracking ✅ Hours calc ✅ Stripe payouts ✅ No tax withholding, no W-2/1099, no compliance | **40/100** |

**How to read the score:** 100 = we can cancel that subscription today with zero impact. Below 50 = still dependent.

---

## TIER 1: CLEANER FLOW (Priority #1)

| # | Feature | Status | Data Source | Key Files | Notes |
|---|---------|--------|-------------|-----------|-------|
| 1.1 | Job claiming | ✅ WORKING | Real DB (Prisma $transaction) | `app/api/cleaner/claim/[jobId]/route.ts`, `app/(cleaner)/cleaner/jobs/page.tsx` | Race-condition-proof atomic claim. SMS notification to customer on claim. |
| 1.2 | Clock in / clock out | ✅ WORKING | Real DB (Prisma $transaction) | `app/api/cleaner/schedule/route.ts` | Atomic: updates job status + creates timesheet + increments completedJobs. Supports start/arrive/complete. |
| 1.3 | Job detail view | ✅ WORKING | Real DB | `app/(cleaner)/cleaner/jobs/[id]/page.tsx` | Shows customer, address, service type, payout, checklist, Google Maps link, AI smart notes. |
| 1.4 | Available jobs list | ✅ WORKING | Real DB | `app/(cleaner)/cleaner/jobs/page.tsx` | Shows unclaimed PENDING jobs + cleaner's claimed jobs. Payout, hours, service type visible. |
| 1.5 | Schedule / calendar | ✅ WORKING | Real DB | `app/(cleaner)/cleaner/schedule/page.tsx`, `app/api/cleaner/schedule/route.ts` | Next 2 weeks view, grouped by day. Date range queries supported. |
| 1.6 | Payouts dashboard | ✅ WORKING | Real DB | `app/(cleaner)/cleaner/payouts/page.tsx`, `app/api/cleaner/payouts/route.ts` | Shows queued/processing/sent payouts, lifetime earnings, month-to-date. Real CleanerPayout records. |
| 1.7 | Stripe Connect onboarding | ✅ WORKING | Real DB + Stripe API | `app/api/cleaner/stripe-connect/route.ts`, `app/(cleaner)/cleaner/settings/StripeConnectSection.tsx` | Creates Express connected account, stores stripeAccountId, generates onboarding link. |
| 1.8 | Timesheet / hours tracking | ✅ WORKING | Real DB | `app/api/employee/timesheets/route.ts`, `app/(cleaner)/cleaner/paystubs/page.tsx` | Auto-created on clock-out. Manual creation by HQ/MANAGER. Stores clockIn/clockOut/hoursWorked. |
| 1.9 | Profile / settings | ✅ WORKING | Real DB | `app/(cleaner)/cleaner/settings/page.tsx` | Shows personal info, availability, coverage area, hourly rate, Stripe Connect status, notification prefs. |
| 1.10 | Referral dashboard | ✅ WORKING | Real DB | `app/(cleaner)/cleaner/referrals/page.tsx`, `CleanerReferralCard.tsx` | Real Referral table queries. Shows unique code, referral counts (rewarded/qualified/pending), credits earned. $25/referral. |
| 1.11 | SMS job notifications | ✅ WORKING | OpenPhone API | `src/lib/openphone.ts`, `lib/openphone.ts` | Templates: new job alert, claim confirmation, en route, completion. Requires OPENPHONE_API_KEY env var. |
| 1.12 | Employee hub / community | ❌ MISSING | N/A | N/A | No community/team chat feature exists. Would need to build from scratch. |

**Tier 1 Score: 11/12 features working (92%)**

---

## TIER 2: ADMIN & MANAGER (Priority #2)

| # | Feature | Status | Data Source | Key Files | Notes |
|---|---------|--------|-------------|-----------|-------|
| 2.1 | Admin dashboard | ✅ WORKING | Real DB | `app/(admin)/admin/page.tsx`, `src/lib/admin-portal.ts` | Revenue (today/MTD/YTD), pipeline preview, team overview, activity feed, alerts. ~800 lines of real queries. |
| 2.2 | Customer management | ✅ WORKING | Real DB | `app/(admin)/admin/customers/page.tsx`, `app/api/admin/customers/route.ts` | Lists unique customers aggregated from service requests. View/edit contact details. |
| 2.3 | Job / schedule management | ✅ WORKING | Real DB | `app/(admin)/admin/schedule/page.tsx`, `ScheduleView.tsx` | Calendar view of jobs. Shows assignments with cleaner data. View + basic management. |
| 2.4 | Invoice management | ✅ WORKING | Real DB | `app/(admin)/admin/invoices/page.tsx`, `invoices-client.tsx`, `/api/admin/invoices/` | Create, send, mark paid, remind. Status filters. Revenue stats. |
| 2.5 | Financials / P&L | ✅ WORKING | Real DB | `app/(admin)/admin/financials/page.tsx`, `app/(admin)/admin/pnl/page.tsx`, `PnLDashboard.tsx` | Revenue, expenses, payouts, margins. Real aggregations from PaymentRecord, Expense, Paystub, CleanerPayout. |
| 2.6 | Team / cleaner management | ✅ WORKING | Real DB | `app/(admin)/admin/team/page.tsx` | Lists cleaners with rate, rating, completed jobs, earnings, status. |
| 2.7 | Payroll / timesheets | ✅ WORKING | Real DB | `app/(admin)/admin/payroll/page.tsx`, `PayrollDashboard.tsx` | View cleaner hours, earnings, timesheet history. Hourly rate data from CleanerProfile. |
| 2.8 | Stripe payment collection | ✅ WORKING | Real DB + Stripe API | `app/api/payments/intent/route.ts`, `app/api/webhooks/stripe/route.ts` | Creates payment intents, webhook processes confirmations, stores PaymentRecord. |
| 2.9 | Referral management | ✅ WORKING | Real DB | `app/(admin)/admin/referrals/page.tsx`, `referrals-client.tsx`, `/api/admin/referrals/` | Create, track status (PENDING/QUALIFIED/REWARDED/EXPIRED), view rewards paid. |
| 2.10 | Settings / config | ✅ WORKING | Real DB | `app/(admin)/admin/settings/page.tsx` | Tenant info, primary contact, served cities, connected integrations, custom fields. |
| 2.11 | Manager role pages | ✅ WORKING | Real DB | `app/(manager)/manager/*` | 9 pages: dashboard, schedule, customers, leads, team, pipeline, payroll, activity, todos. No financials access. |
| 2.12 | Quote / request management | ✅ WORKING | Real DB | `app/(admin)/admin/requests/page.tsx` | Lists service requests with status filters. Shows customer, service type, quote amount. |
| 2.13 | Analytics | ⚠️ PARTIAL | Mixed | `app/(admin)/admin/analytics/page.tsx` | Marketing/website analytics only. No custom business reporting or export tools. |
| 2.14 | Job creation / drag-drop assign | ❌ MISSING | N/A | N/A | Cannot create jobs or reassign cleaners from admin UI. Jobs only created from quote flow. |
| 2.15 | Automated recurring scheduling | ❌ MISSING | N/A | N/A | No recurring job generation. Each booking is one-time. Major gap vs Jobber. |
| 2.16 | Bank reconciliation | ❌ MISSING | N/A | N/A | No bank feed import. No transaction matching. Major gap vs QuickBooks. |
| 2.17 | Tax reporting (1099/W-2) | ❌ MISSING | N/A | N/A | No tax withholding calculation. No year-end form generation. Major gap vs ADP. |

**Tier 2 Score: 12/17 features working (71%)**

---

## TIER 3: CLIENT PORTAL (Priority #3)

| # | Feature | Status | Data Source | Key Files | Notes |
|---|---------|--------|-------------|-----------|-------|
| 3.1 | Client dashboard | ✅ WORKING | Real DB | `app/(client)/client/page.tsx`, `src/lib/client-portal.ts` | Upcoming visits, billing summary, loyalty tier, cleaner preview, referral card, tips, achievements. |
| 3.2 | Visit history / upcoming | ✅ WORKING | Real DB | `app/(client)/client/visits/page.tsx` | View-only list of scheduled visits with service type, date, time window, address. |
| 3.3 | Invoices / payments | ✅ WORKING | Real DB + Stripe/PayPal | `app/(client)/client/billing/page.tsx`, `InvoicePaymentButton.tsx` | Outstanding invoices with pay button. Stripe + PayPal checkout. Payment history. |
| 3.4 | Referral dashboard | ✅ WORKING | Real DB | `app/(client)/client/referrals/page.tsx`, `ReferralCard.tsx` | Shows unique code, referral count, credits earned. Real Referral table queries. Share buttons. |
| 3.5 | Feedback / reviews | ✅ WORKING | Real DB | `app/(client)/client/feedback/page.tsx`, `FeedbackForm.tsx` | 1-5 star rating + message. Posts to `/api/client/feedback`. Shows assigned cleaner. |
| 3.6 | Reschedule | ✅ WORKING | Real DB | `app/(client)/client/reschedule/page.tsx`, `RescheduleForm.tsx` | Select visit, propose 3 alternative windows, provide reason. Posts to API. |
| 3.7 | Cleaner profile view | ✅ WORKING | Real DB | `app/(client)/client/cleaner/[id]/page.tsx` | Real cleaner data from Prisma. Shows name, photo, rating, completed jobs. |
| 3.8 | Direct messaging | ❌ MISSING | N/A | `app/(client)/client/message/page.tsx` | Placeholder "coming soon" page with call/text CTAs. No backend messaging. |
| 3.9 | Book new cleaning (self-serve) | ❌ MISSING | N/A | N/A | No rebooking from client portal. Must go through public quote form. |
| 3.10 | Loyalty rewards redemption | ❌ MISSING | N/A | N/A | Loyalty tiers display but no way to apply/redeem loyalty discounts at checkout. |

**Tier 3 Score: 7/10 features working (70%)**

---

## TIER 4: PUBLIC SITE

| # | Feature | Status | Data Source | Key Files | Notes |
|---|---------|--------|-------------|-----------|-------|
| 4.1 | Homepage | ✅ WORKING | Static | `app/(public)/page.tsx` | 12+ sections. Professional layout. No false claims. |
| 4.2 | Get a quote form | ✅ WORKING | Real DB + pricing engine | `app/(public)/get-a-quote/page.tsx` | Multi-step form, instant price calc, referral code field, SMS/email confirmation. |
| 4.3 | Registration | ✅ WORKING | Real DB | `app/(public)/register/page.tsx` | Creates user account. Password strength indicator. Referral code from ?ref= param. |
| 4.4 | Login | ✅ WORKING | Real DB + JWT | `app/(public)/login/page.tsx` | JWT sessions via jose. 7-day expiry. gg_session cookie. |
| 4.5 | Cleaner application | ✅ WORKING | Real DB | `app/(public)/apply/page.tsx` | Full application form. Stores in DB. 48-hour review message. |
| 4.6 | Links page | ✅ WORKING | Static | `app/(public)/links/page.tsx` | Linktree-style. Social media, booking, apply links. |
| 4.7 | Privacy policy / terms | ❌ MISSING | N/A | N/A | No legal pages. Needed before collecting customer data. |

**Tier 4 Score: 6/7 features working (86%)**

---

## API INTEGRATIONS STATUS

| Integration | Status | What Works | What Doesn't | Env Vars Needed |
|---|---|---|---|---|
| **Stripe** | ✅ WORKING | Payment intents, webhooks, payout queueing | — | `STRIPE_SECRET_KEY` ⚠️ MISSING |
| **Stripe Connect** | ✅ WORKING | Account creation, onboarding links, transfer routing | Needs `prisma db push` for stripeAccountId column | `STRIPE_SECRET_KEY` ⚠️ MISSING |
| **OpenPhone** | ✅ WORKING | SMS sending, webhook receiver, signature verification | No in-app calling | `OPENPHONE_API_KEY` ✅, `OPENPHONE_FROM` ✅ |
| **SendGrid** | ✅ WORKING | Transactional emails, newsletters | — | `SENDGRID_API_KEY` ⚠️ MISSING |
| **OpenAI** | ✅ WORKING | Transcript analysis (3-tier cascade: Ollama→OpenRouter→OpenAI) | Only fires if first 2 fail | `OPENAI_API_KEY` ⚠️ MISSING |
| **Jobber** | ⚠️ PARTIAL | OAuth flow, manual sync endpoints, cron endpoint | No auto-sync without cron setup in Railway | `JOBBER_CLIENT_ID`, `JOBBER_CLIENT_SECRET` |
| **PayPal** | ⚠️ PARTIAL | Customer checkout orders | `createPayPalPayout()` is dead code — never called | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` |
| **Google Calendar** | ⚠️ PARTIAL | Event creation/update code exists | Not called from any active route | `GOOGLE_CALENDAR_*` vars |
| **Google Sheets** | ⚠️ PARTIAL | Call summary sync from OpenPhone webhook | Requires manual spreadsheet setup | `GOOGLE_SHEETS_ID` |

---

## PAYOUT PIPELINE (Critical Path)

```
Customer pays invoice (Stripe/PayPal)
    ↓
Stripe webhook fires (payment_intent.succeeded)
    ↓
Webhook queues CleanerPayout record (status: QUEUED)
    ↓
Cron job: /api/cron/process-payouts          ← NEEDS RAILWAY CRON SETUP
    ↓
createStripeTransfer() sends to cleaner's connected account
    ↓
CleanerPayout status → SENT
```

**⚠️ Gap:** The cron job endpoint exists but Railway needs to be configured to call it on a schedule. Without this, payouts queue up but never execute. Manual trigger: `curl -H "Authorization: Bearer $CRON_SECRET" https://web-production-cfe11.up.railway.app/api/cron/process-payouts`

---

## WHAT WE STILL NEED TO CANCEL EACH TOOL

### To cancel Jobber (currently 70/100):
- [ ] Admin UI to create jobs manually (not just from quotes)
- [ ] Drag-and-drop cleaner assignment
- [ ] Recurring job scheduling (weekly/biweekly/monthly)
- [ ] Route optimization / day planning
- [ ] Client self-serve booking from portal

### To cancel OpenPhone (currently 45/100):
- [ ] In-app SMS inbox (two-way messaging)
- [ ] Call forwarding / VoIP integration
- [ ] Shared team inbox for SMS
- [ ] Auto-responder for missed calls
- [ ] We still DEPEND on OpenPhone API for sending — need our own Twilio/bandwidth setup to fully replace

### To cancel QuickBooks (currently 35/100):
- [ ] Bank feed import / reconciliation
- [ ] Chart of accounts
- [ ] Automated expense categorization
- [ ] Sales tax calculation & reporting
- [ ] Quarterly/annual tax summaries
- [ ] Accounts receivable aging report
- [ ] Export to accountant (CSV/QBO format)

### To cancel ADP (currently 40/100):
- [ ] Tax withholding calculations (federal/state/local)
- [ ] Direct deposit via ACH (not just Stripe)
- [ ] W-2 / 1099 generation
- [ ] PTO tracking
- [ ] Workers' comp integration
- [ ] Payroll compliance (overtime rules, minimum wage)
- [ ] Pay stub PDF generation with tax breakdowns

---

## REGRESSION WATCHLIST

Features that have broken before or are fragile:

| Feature | Risk | What to watch |
|---|---|---|
| Job claiming | Race condition | Must use $transaction — if anyone touches claim API, verify atomicity |
| Clock out | Race condition | 4 DB writes must stay atomic — if anyone adds a 5th, add it inside the transaction |
| Tenant data isolation | Data leak | Every admin/manager DB query MUST include `tenantId` filter |
| Redirect loops | UX death | Every `requireSession()` call must have `redirectTo: "/login"` — never redirect to self |
| Referral counts | Fake data | `src/lib/client-portal.ts` previously had hardcoded 0s — verify real DB queries |
| OpenPhone SMS format | API break | Must be `to: ["+1..."]` (array), auth header is bare key (no Bearer) |
| Prisma version | Build break | Local must use v5 — never run global `npx prisma` which may pull v7+ |

---

## ENVIRONMENT VARIABLES CHECKLIST (Railway)

| Variable | Status | Required For |
|---|---|---|
| `DATABASE_URL` | ✅ Set | Everything |
| `DEFAULT_TENANT_ID` | ✅ Set | Multi-tenant queries |
| `OPENPHONE_API_KEY` | ✅ Set | SMS notifications |
| `OPENPHONE_FROM` | ✅ Set | SMS sender number |
| `SENDGRID_FROM_EMAIL` | ✅ Set | Email sender address |
| `AUTH_SECRET` | ✅ Set | JWT signing |
| `CRON_SECRET` | ✅ Set | Cron job auth |
| `NEXT_PUBLIC_BASE_URL` | ⏳ Adding | Absolute URLs in emails/SMS |
| `STRIPE_SECRET_KEY` | ❌ Missing | ALL payments + payouts |
| `SENDGRID_API_KEY` | ❌ Missing | ALL email notifications |
| `OPENAI_API_KEY` | ❌ Missing | AI transcript summaries |

---

*This document is the source of truth. Update it every time a feature is added, fixed, or broken. Never delete rows — only change status.*
