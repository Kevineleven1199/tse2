# GoGreen Organic Clean — Canonical Feature Registry

> **PURPOSE**: This is the single source of truth for every feature, model, route, and integration in the platform. Before adding, removing, or modifying ANY feature — check this document first. No feature drift. Only build up and enhance what exists.
>
> **RULE**: Never delete a feature. Only enhance, fix, or extend. If deprecating, mark it `[DEPRECATED]` with a date and replacement.
>
> **Last Updated**: 2026-03-24 · v14.1.0

---

## Platform Identity

| Field | Value |
|-------|-------|
| **Name** | Go Green Organic Clean |
| **Tagline** | Sarasota's Premier Organic Cleaning Service |
| **Domain** | gogreenorganicclean.com |
| **Railway URL** | web-production-cfe11.up.railway.app |
| **Repo** | Kevineleven1199/gogreenorganicclean_264 |
| **Stack** | Next.js 15, React 19, Prisma 5, PostgreSQL, Stripe, Tailwind |
| **Hosting** | Railway (web + postgres) |
| **Phone** | (941) 271-7948 |
| **Email** | info@ggoc.us / hello@gogreenorganicclean.com |
| **Service Area** | Sarasota, Manatee, Pinellas, Hillsborough, Pasco counties (FL) |

---

## Architecture

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15.5.12 (App Router, RSC) |
| UI | React 19.2.4, Tailwind CSS 3.4.4, Framer Motion |
| ORM | Prisma 5.16.1 → PostgreSQL |
| Auth | jose JWT + bcryptjs, cookie-based sessions |
| Payments | Stripe (checkout, Connect, webhooks) |
| Email | SendGrid (primary), Resend (fallback), Nodemailer (SMTP fallback) |
| SMS | OpenPhone API |
| AI | OpenAI (quote smartNotes), OpenRouter (fallback), Ollama (local fallback) |
| Storage | Google Drive (photos), PostgreSQL (structured data) |
| PDF | PDFKit (paystubs, contracts, policies) |
| State | Zustand (client), React Server Components (server) |
| Validation | Zod |
| Deployment | Railway auto-deploy from GitHub main branch |

---

## Database Schema — 77 Models

### Core Business (12)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| `Tenant` | Multi-tenant isolation | id, name, slug, domain |
| `User` | All users (HQ, MANAGER, CLEANER, CUSTOMER) | email, role, firstName, lastName, xp |
| `ServiceRequest` | Customer quote request | customerName, serviceType, address, status |
| `Quote` | Price breakdown for a request | total, breakdown (JSON), smartNotes |
| `Job` | Scheduled cleaning job | status (PENDING→COMPLETED), scheduledStart/End |
| `JobAssignment` | Cleaner-to-job mapping | cleanerId, clockInAt, clockOutAt |
| `Invoice` | Billing document | lineItems, total, status (DRAFT→PAID) |
| `PaymentRecord` | Stripe payment tracking | stripePaymentIntentId, amount, status |
| `Tip` | Customer tips | amount, jobId |
| `Refund` | Payment refunds | amount, reason |
| `RecurringSchedule` | Auto-rescheduling rules | frequency, dayOfWeek, cleanerId |
| `Service` | Service catalog | name, basePrice, duration |

### Team & Payroll (10)
| Model | Purpose |
|-------|---------|
| `CleanerProfile` | Contractor profile: rate, rating, taxClassification (W2/1099) |
| `Timesheet` | Clock in/out records, hours worked |
| `Paystub` | Earnings statement with overtime, deductions, YTD |
| `CleanerPayout` | Stripe Connect payout records |
| `PayrollAdjustment` | Bonuses, reimbursements, deductions |
| `CleanerSkill` | Skill certifications |
| `CleanerTeam` | Team groupings |
| `CleanerTeamMember` | Team membership |
| `AvailabilitySlot` | Weekly availability windows |
| `CleanerLocation` | Real-time GPS (future) |

### Job Execution (5)
| Model | Purpose |
|-------|---------|
| `JobPhoto` | Before/after photos (Drive + base64 fallback) |
| `JobSignature` | Customer signature at completion |
| `JobTicket` | Shareable visit proof with accessToken |
| `JobCost` | Line-item cost breakdown per job |
| `EstimatePhoto` | Pre-quote customer photos |

### CRM & Marketing (12)
| Model | Purpose |
|-------|---------|
| `CrmLead` | Lead pipeline with scoring |
| `NextdoorLead` | Auto-captured Nextdoor leads |
| `EmailCampaign` | Campaign management with targeting |
| `EmailCampaignRecipient` | Per-recipient tracking |
| `NewsletterSubscriber` | Email list |
| `NewsletterSend` | Send history |
| `Coupon` | Promo code system |
| `CouponUsage` | Redemption tracking |
| `Referral` | Referral program tracking |
| `GiftCard` | Gift card codes and balances |
| `GiftCardUsage` | Redemption transactions |
| `ReviewRequest` | Automated review ask tracking |

### Community & Engagement (10)
| Model | Purpose |
|-------|---------|
| `CommunityPost` | Team/public feed posts |
| `CommunityComment` | Post comments |
| `CommunityReaction` | Likes/reactions |
| `CommunityView` | View tracking |
| `Achievement` | Gamification milestones |
| `AchievementProgress` | Progress toward achievements |
| `UserAchievement` | Earned achievements |
| `UserLevel` | XP level tracking |
| `XpEvent` | XP earning events |
| `LevelUpEvent` | Level-up history |
| `StreakEvent` | Consistency streaks |

### Operations (10)
| Model | Purpose |
|-------|---------|
| `CalendarEvent` | Google Calendar sync |
| `CalendarSync` | Sync state tracking |
| `Notification` | In-app notifications |
| `SmsMessage` | SMS history |
| `CallTranscript` | OpenPhone call transcripts |
| `AdminApproval` | Pending approval queue |
| `Automation` | Routing rules (auto-assign, auto-notify) |
| `AnalyticsEvent` | Custom analytics collection |
| `AuditLog` | Change history |
| `Integration` | Third-party auth tokens (Jobber, etc.) |

### Config & Metadata (5)
| Model | Purpose |
|-------|---------|
| `CustomFieldDefinition` | Dynamic custom fields |
| `CustomFieldValue` | Custom field data |
| `CustomerAddress` | Multi-address per customer |
| `CustomerEmail` | Multi-email per customer |
| `CancellationPolicy` | Cancellation rules |
| `PasswordResetToken` | Secure reset flow |
| `Note` | Shared notes with checklists |
| `TodoItem` | Task management (personal + shared) |
| `Expense` | Business expense tracking |
| `InventoryItem` | Supply tracking |
| `SupplyOrder` | Restock orders |
| `GoogleReview` | Synced Google Reviews |
| `Message` | Client-to-HQ messaging |

---

## Page Routes — 116 Pages

### Public Pages (19)
| Route | Purpose |
|-------|---------|
| `/` | Homepage with hero, services, testimonials, FAQ |
| `/about` | Company story and mission |
| `/services` | Service catalog with pricing |
| `/get-a-quote` | Multi-step quote wizard with live pricing |
| `/contact` | Contact form |
| `/faq` | Frequently asked questions |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/login` | Auth with "Forgot password?" link |
| `/register` | Customer registration |
| `/apply` | Cleaner application form |
| `/request` | Service request form |
| `/newsletter` | Newsletter signup |
| `/community` | Public community feed |
| `/reset-password` | Token-based password reset |
| `/pay/[invoiceId]` | Public invoice payment page |
| `/job-ticket/[jobId]` | Shareable visit report with photos |
| `/quote/confirmation` | Post-quote confirmation |
| `/links` | Social links page |

### Admin Portal (52 pages)
Dashboard, customers, invoices, expenses, campaigns, leads, CRM pipeline, payroll, financials, analytics, integrations, settings, team management, route optimization, call center, google reviews, loyalty, referrals, coupons, gift cards, achievements, inventory, todos, notes, insights, diagnostics

### Cleaner Portal (10 pages)
Home, jobs, jobs/[id], schedule, availability, paystubs, payouts, referrals, pipeline, settings

### Client Portal (10 pages)
Dashboard, visits, quotes, billing, feedback, referrals, messages, settings

### Crew Hub / Employee Hub (8 pages)
Feed, jobs, schedule, payroll, paystubs, payouts, documents

### Manager Portal (8 pages)
Dashboard, team, payroll, schedules, leads, customers, todos

---

## API Routes — 190 Endpoints

### Auth (7): login, register, logout, forgot-password, reset-password, apply, me
### Payments (6): intent, tip, stripe-connect, checkout, refund
### Jobs (13): claim, schedule, status, open-jobs, reschedule, assign
### Customers (12): CRUD, addresses, custom-fields, block, import
### Admin (60+): invoices, timesheets, team, expenses, campaigns, payroll, refunds, diagnostics
### CRM (6): pipeline, prospects, leads, contacts, call-lists, scoring
### Communications (15): campaigns, newsletters, messages, email-intake, transcripts
### Photos (4): upload, list, delete, estimate-photos
### Documents (3): contractor-agreement, drug-free-policy, paystub PDF
### Cron (8): email-intake, google-reviews, jobber-sync, newsletter, payouts, recurring-jobs, reminders, review-requests
### Webhooks (5): stripe, openphone, nextdoor, inbound-email, openphone-health
### Analytics (3): collect, dashboard, profitability

---

## Components — 103 Files

### Portal Infrastructure (8)
PortalHeader, PortalFooter, PortalBottomNav, ImpersonationBanner, LoadingSkeleton

### Cleaner (6)
JobActions, JobPhotos, PhotoGate, LevelCard, PaystubList, SignatureCanvas

### Client (3)
MessageThread, FeedbackForm, ClientDashboardWidgets

### Admin (15+)
TimesheetApproval, CampaignEditor, CustomerTable, InvoiceBuilder, PayrollDashboard, TeamManager, RouteOptimizer, LeadScoring, etc.

### Shared/UI (20+)
Card, CardHeader, CardContent, EmptyState, Badge, Button, Input, Modal, Tooltip, Toast, etc.

### Marketing (5)
QuoteWizard, TestimonialsSection, HeroSection, ServicesGrid, FAQAccordion

---

## Lib Modules — 56 Files

### Business Logic
| Module | Purpose |
|--------|---------|
| `pricing.ts` | Quote engine: room types, seasonal, loyalty, frequency, location multipliers |
| `payroll.ts` | Overtime (FLSA), gross/net calc, approved timesheets only |
| `tax-withholding.ts` | Federal brackets, FICA, Medicare, W2 vs 1099 |
| `invoice-generator.ts` | Invoice creation, email sending, payment reminders |
| `route-optimizer.ts` | Route optimization solver |
| `job-matching.ts` | Auto-assign cleaners to jobs |

### Integrations
| Module | Purpose |
|--------|---------|
| `google-drive.ts` | Client folders, photo upload to Drive |
| `google-reviews.ts` | Fetch + sync Google Places reviews |
| `google-calendar.ts` | Calendar event sync |
| `notifications.ts` | SMS (OpenPhone) + Email (SendGrid) |
| `email-failsafe.ts` | Multi-provider email with fallback chain |
| `openphone.ts` | SMS/call integration |

### CRM & Marketing
| Module | Purpose |
|--------|---------|
| `campaign-engine.ts` | Email campaign creation and sending |
| `email-campaign-templates.ts` | 5+ commercial outreach templates |
| `newsletter/` | 90+ days rotating content, multi-provider sending |
| `crm/lead-scoring.ts` | Automated lead temperature scoring |
| `commercial-prospects.ts` | 19 industry types with revenue estimation |
| `review-automation.ts` | Auto-request reviews 24hrs post-job |
| `gift-cards.ts` | Gift card generation, purchase, redemption |
| `activity-tracking.ts` | 20+ event types for attribution |

### Portal Data
| Module | Purpose |
|--------|---------|
| `admin-portal.ts` | Dashboard data aggregation |
| `client-portal.ts` | Client dashboard data |
| `cleaner-portal.ts` | Cleaner stats + level data |
| `levels.ts` | 20-level gamification system |
| `community.ts` | Feed posts, reactions, comments |

---

## Integrations Registry

| Integration | Status | Auth Method | Purpose |
|-------------|--------|-------------|---------|
| **Stripe** | LIVE | API key + webhook secret | Payments, Connect payouts |
| **SendGrid** | LIVE | API key | Transactional + campaign email |
| **OpenPhone** | LIVE | API key | SMS, calls, contact sync |
| **Google Drive** | LIVE | Service account (base64) | Photo storage, client folders |
| **Google Calendar** | LIVE | Service account | Job scheduling sync |
| **Google Places** | LIVE | API key | Review fetching |
| **OpenAI** | LIVE | API key | Smart notes, email classification |
| **Nextdoor** | LIVE | Webhook secret (Zapier) | Lead capture from ads |
| **Jobber** | CONFIGURED | OAuth2 | Quote/job sync (optional) |
| **Resend** | CONFIGURED | API key | Email fallback |
| **OpenRouter** | CONFIGURED | API key | AI fallback |

---

## Environment Variables — 46 Keys

### Required for Production
```
DATABASE_URL, JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
NEXT_PUBLIC_STRIPE_KEY, SENDGRID_API_KEY, OPENPHONE_API_KEY,
GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_DRIVE_PARENT_FOLDER_ID,
CRON_SECRET, DEFAULT_TENANT_ID
```

### Optional (graceful degradation)
```
OPENAI_API_KEY, OPENROUTER_API_KEY, RESEND_API_KEY,
GOOGLE_CALENDAR_ID, JOBBER_CLIENT_ID, JOBBER_CLIENT_SECRET,
NEXTDOOR_WEBHOOK_SECRET, INBOUND_EMAIL_SECRET,
NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_GA_ID
```

---

## Cron Jobs (8 Automated Tasks)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `email-intake` | Every 5 min | Classify inbound emails, create leads |
| `google-reviews` | Daily | Sync Google Reviews to DB |
| `jobber-sync` | Hourly | Sync quotes/jobs from Jobber |
| `newsletter-preload` | Daily 6am | Pre-generate newsletter content |
| `process-payouts` | Weekly | Process cleaner Stripe payouts |
| `recurring-jobs` | Daily | Auto-create jobs from RecurringSchedule |
| `reminders` | Hourly | Send job reminders to cleaners + clients |
| `review-requests` | Daily | Send review requests 24hrs post-completion |

---

## PDF Documents (3 Generators)

| Document | Endpoint | Details |
|----------|----------|---------|
| **Paystub** | `/api/employee/paystubs/[id]/pdf` | Branded, overtime, tax withholding, YTD |
| **1099 Contractor Agreement** | `/api/documents/contractor-agreement` | 10 legal sections, signature lines |
| **Drug-Free Workplace Policy** | `/api/documents/drug-free-policy` | 8 sections, FL compliance, acknowledgment |

---

## Pricing Engine (pricing.ts)

### Service Types & Base Prices
| Service | Base | Per Bed | Per Bath |
|---------|------|---------|----------|
| Healthy Home Clean | $149 | $26-48 | $18-35 |
| Deep Refresh & Detox | $229 | $36-62 | $26-45 |
| Move-In/Move-Out Detail | $269 | $45-72 | $30-52 |
| Eco Commercial Care | $189 | — | — |

### Multipliers
- **Frequency**: Weekly -22%, Biweekly -15%, Monthly -8%
- **Location**: Sarasota 1.0, Tampa/Pinellas 1.05, Pasco 0.95
- **Seasonal**: Peak (Dec-Mar) +8%, Summer (Jun-Sep) -5%
- **Loyalty**: Silver -3%, Gold -5%, Platinum -8%
- **Minimum Rate Guard**: $22/hr cleaner floor

---

## Loyalty Tiers

| Tier | Visits | Discount |
|------|--------|----------|
| Bronze | 0-4 | 0% |
| Silver | 5-11 | 5% |
| Gold | 12-23 | 10% |
| Platinum | 24+ | 15% |

---

## Gamification (20 Levels)

Level 1: Rising Star → Level 20: Eco Legend
Progressive XP requirements, color-coded (blue → gold → platinum)

---

## Version History

| Version | Date | Summary |
|---------|------|---------|
| v11.0.0 | 2026-03 | Initial multi-tenant platform |
| v11.1.0 | 2026-03 | CRM overhaul, CSV import, campaigns |
| v11.2.0 | 2026-03 | Todos, calendar, payroll overhaul |
| v11.3.0 | 2026-03 | 100% page coverage, call center, reviews |
| v12.0.0 | 2026-03-23 | Crew portal, PDF docs, quote engine, Stripe fixes |
| v13.0.0 | 2026-03-23 | iOS-native mobile, photo-gated clock, job tickets |
| v13.1.0 | 2026-03-23 | CANON registry, SWOT analysis, job grab fix, GA4, sitemap |
| v13.2.0 | 2026-03-23 | Invoice PDF, QuickBooks CSV export, email drip campaigns, blog |
| v14.0.0 | 2026-03-24 | Time-slot picker, 5 blog posts, push notifications, route optimizer, 6 area pages |
| v14.1.0 | 2026-03-24 | Full QB replacement: Chart of Accounts, Balance Sheet, AP, Calendar scheduling |

---

## RULES FOR FUTURE DEVELOPMENT

1. **Never delete a working feature** — only enhance or extend
2. **Check this document before adding anything** — does it already exist?
3. **Update this document after every release** — version history + new features
4. **All new models must be documented** in the Schema section
5. **All new API routes must be documented** in the Routes section
6. **All new integrations must be documented** in the Integrations section
7. **Test after every change** — `npx tsc --noEmit` minimum, `npm run build` preferred
8. **Push to main only** — Railway auto-deploys from main
9. **Commit messages must start with version** — `vX.Y.Z: description`
10. **1099-friendly language** — "crew member" not "employee", "team" not "staff"
