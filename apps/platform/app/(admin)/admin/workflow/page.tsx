import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Phone, Globe, FileText, CheckCircle2, CalendarDays, UserCheck, MapPin,
  Camera, Clock, Receipt, DollarSign, CreditCard, Star, BarChart3,
  ArrowDown, Zap, Bell, Mail, MessageSquare, Repeat, TrendingUp,
  Shield, AlertTriangle, Users, Briefcase,
} from "lucide-react";

export const dynamic = "force-dynamic";

// ── Workflow Step Definition ──
type WorkflowStep = {
  id: string;
  title: string;
  description: string;
  icon: typeof Phone;
  color: string;
  automated: boolean;
  pageUrl?: string;
  apiUrl?: string;
  triggers: string[];
  outputs: string[];
};

const WORKFLOW_STEPS: WorkflowStep[] = [
  // ── LEAD CAPTURE ──
  {
    id: "lead-capture",
    title: "Lead Capture",
    description: "Customer finds us via Google, referral, or ad. Visits website or calls.",
    icon: Globe,
    color: "bg-blue-500",
    automated: true,
    pageUrl: "/",
    triggers: ["Website visit", "Phone call", "Referral link", "Google search"],
    outputs: ["Analytics tracked", "UTM captured", "Session started"],
  },
  {
    id: "quote-request",
    title: "Quote Request",
    description: "Customer fills out the quote wizard or calls for an estimate. AI calculates pricing.",
    icon: FileText,
    color: "bg-purple-500",
    automated: true,
    pageUrl: "/get-a-quote",
    apiUrl: "/api/quotes",
    triggers: ["Form submitted", "Phone call ends", "OpenPhone webhook"],
    outputs: ["DraftEstimate created", "Pricing calculated", "Secure token generated"],
  },
  {
    id: "estimate-page",
    title: "Stunning Estimate Page",
    description: "Customer receives a beautiful branded estimate page via SMS + email with accept button.",
    icon: Star,
    color: "bg-amber-500",
    automated: true,
    pageUrl: "/estimate/[draftId]",
    triggers: ["DraftEstimate created", "Admin sends estimate"],
    outputs: ["SMS sent to customer", "Email sent to customer", "Estimate page live"],
  },
  {
    id: "customer-accepts",
    title: "Customer Accepts",
    description: "Customer accepts estimate, creates account, gets logged into their portal.",
    icon: CheckCircle2,
    color: "bg-green-500",
    automated: true,
    pageUrl: "/estimate/[draftId]",
    apiUrl: "/api/confirm-estimate",
    triggers: ["Accept button clicked", "Password entered"],
    outputs: ["Customer account created", "ServiceRequest created", "Quote created", "Job created (PENDING)", "Session cookie set"],
  },
  // ── SCHEDULING ──
  {
    id: "cleaner-match",
    title: "Cleaner Matching",
    description: "AI scores cleaners by distance, skills, availability, and rating. Auto-assigns best match or broadcasts.",
    icon: UserCheck,
    color: "bg-teal-500",
    automated: true,
    apiUrl: "/api/admin/cleaners/available",
    triggers: ["Job created", "Estimate confirmed"],
    outputs: ["Cleaner auto-assigned OR all cleaners notified via SMS/email", "Job status → CLAIMED"],
  },
  {
    id: "schedule-confirm",
    title: "Schedule Confirmed",
    description: "Job scheduled on calendar. Google Calendar event created. Customer gets confirmation.",
    icon: CalendarDays,
    color: "bg-brand-500",
    automated: true,
    pageUrl: "/admin/schedule",
    triggers: ["Cleaner claims job", "Admin assigns cleaner"],
    outputs: ["Google Calendar event created", "Customer SMS confirmation", "24h reminder queued", "Job status → SCHEDULED"],
  },
  {
    id: "reminder",
    title: "24h Reminder",
    description: "Automated reminder sent to customer and cleaner 24 hours before the job.",
    icon: Bell,
    color: "bg-orange-500",
    automated: true,
    apiUrl: "/api/cron/reminders",
    triggers: ["Cron fires daily at 10 AM"],
    outputs: ["Customer SMS reminder", "Customer email reminder", "Cleaner notification"],
  },
  // ── DAY OF SERVICE ──
  {
    id: "en-route",
    title: "Cleaner En Route",
    description: "Cleaner taps 'Start Travel'. GPS tracking begins.",
    icon: MapPin,
    color: "bg-sky-500",
    automated: false,
    pageUrl: "/cleaner/jobs/[id]",
    triggers: ["Cleaner taps 'Start Travel'"],
    outputs: ["EnRouteAt timestamp set", "Optional: customer notified"],
  },
  {
    id: "before-photos",
    title: "Before Photos",
    description: "Cleaner must upload before photos. Required gate — cannot clock in without them.",
    icon: Camera,
    color: "bg-indigo-500",
    automated: false,
    pageUrl: "/cleaner/jobs/[id]",
    apiUrl: "/api/photos/upload",
    triggers: ["Cleaner takes photos"],
    outputs: ["Photos uploaded to Google Drive", "Thumbnails stored in DB", "Photo gate unlocked"],
  },
  {
    id: "clock-in",
    title: "Clock In",
    description: "Cleaner clocks in. Admin/manager alerts fire to all channels instantly.",
    icon: Clock,
    color: "bg-green-600",
    automated: true,
    pageUrl: "/cleaner/jobs/[id]",
    triggers: ["Before photos uploaded", "Clock-in button tapped"],
    outputs: ["ClockInAt timestamp set", "🟢 Alert → SMS, Telegram, WhatsApp, Gmail, Slack"],
  },
  {
    id: "service",
    title: "Service Performed",
    description: "Cleaner performs the cleaning according to the service checklist.",
    icon: Briefcase,
    color: "bg-brand-600",
    automated: false,
    pageUrl: "/cleaner/jobs/[id]",
    triggers: ["Cleaner on site"],
    outputs: ["Checklist items completed"],
  },
  {
    id: "after-photos",
    title: "After Photos",
    description: "Cleaner must upload after photos. Required gate — cannot clock out without them.",
    icon: Camera,
    color: "bg-violet-500",
    automated: false,
    pageUrl: "/cleaner/jobs/[id]",
    apiUrl: "/api/photos/upload",
    triggers: ["Cleaner finishes work"],
    outputs: ["After photos uploaded to Google Drive", "Clock-out gate unlocked"],
  },
  {
    id: "clock-out",
    title: "Clock Out",
    description: "Cleaner clocks out. MASSIVE automation cascade fires — invoice, payout, alerts, timesheet, ticket.",
    icon: Clock,
    color: "bg-red-500",
    automated: true,
    pageUrl: "/cleaner/jobs/[id]",
    apiUrl: "/api/cleaner/schedule",
    triggers: ["After photos uploaded", "Clock-out button tapped"],
    outputs: [
      "⏱ Timesheet auto-created (hours calculated)",
      "🧾 Invoice auto-created + auto-emailed to customer",
      "💰 Cleaner payout auto-queued for Stripe transfer",
      "🔴 Alert → SMS, Telegram, WhatsApp, Gmail, Slack",
      "📸 Job ticket created (shareable before/after page)",
      "📱 Customer SMS + email with completion notice",
      "📊 Audit log entry (job.completed)",
      "✅ Job status → COMPLETED",
      "⬆️ Cleaner XP +10, achievements checked",
    ],
  },
  // ── POST-SERVICE ──
  {
    id: "invoice-payment",
    title: "Invoice & Payment",
    description: "Customer receives invoice with Stripe payment link. Can pay deposit or full amount.",
    icon: CreditCard,
    color: "bg-amber-600",
    automated: true,
    pageUrl: "/pay/[invoiceId]",
    apiUrl: "/api/payments/invoice-intent",
    triggers: ["Invoice auto-sent on clock-out"],
    outputs: ["Stripe PaymentIntent created", "Payment captured", "Invoice marked PAID", "Webhook updates records"],
  },
  {
    id: "payout",
    title: "Cleaner Payout",
    description: "Stripe transfer sent to cleaner's connected account. Processed every 15 minutes.",
    icon: DollarSign,
    color: "bg-green-700",
    automated: true,
    apiUrl: "/api/cron/process-payouts",
    triggers: ["Payout queued on clock-out", "Cron fires every 15 min"],
    outputs: ["Stripe transfer executed", "Payout status → SENT", "Cleaner notified"],
  },
  {
    id: "review-request",
    title: "Review Request",
    description: "24 hours after completion, customer gets an SMS asking for a Google review.",
    icon: Star,
    color: "bg-yellow-500",
    automated: true,
    apiUrl: "/api/cron/review-requests",
    triggers: ["Cron fires daily", "Job completed 24-48h ago"],
    outputs: ["Review request SMS sent", "ReviewRequest record created"],
  },
  // ── REPORTING ──
  {
    id: "pnl",
    title: "P&L / Reporting",
    description: "Real-time P&L, revenue trends, conversion funnels, job costing — all from live transaction data.",
    icon: BarChart3,
    color: "bg-indigo-600",
    automated: true,
    pageUrl: "/admin/insights",
    triggers: ["Payments captured", "Payouts sent", "Expenses logged"],
    outputs: ["Revenue trend charts", "Conversion funnel", "Gross/net profit", "Year-end forecast"],
  },
  {
    id: "payroll",
    title: "Payroll",
    description: "Timesheets auto-created from clock-in/out. Tax withholding calculated. Paystub PDFs generated.",
    icon: Receipt,
    color: "bg-slate-600",
    automated: true,
    pageUrl: "/admin/payroll",
    apiUrl: "/api/employee/payroll",
    triggers: ["Timesheets created on clock-out", "Jobber timesheet sync"],
    outputs: ["Payroll calculated (FLSA overtime)", "Tax withholding (2025 brackets)", "Paystub PDFs", "CSV export for accountant"],
  },
  // ── RECURRING ──
  {
    id: "recurring",
    title: "Recurring Jobs",
    description: "Weekly/biweekly/monthly jobs auto-created from recurring schedules. Entire cycle repeats.",
    icon: Repeat,
    color: "bg-brand-700",
    automated: true,
    pageUrl: "/admin/recurring",
    apiUrl: "/api/cron/recurring-jobs",
    triggers: ["Cron fires daily at 6 AM", "Recurring schedule active"],
    outputs: ["New Job created", "Cleaner notified", "Entire workflow repeats automatically"],
  },
];

export default async function WorkflowPage() {
  const session = await requireSession({ roles: ["HQ"], redirectTo: "/login" });

  // Fetch real stats for the workflow health
  const [jobsToday, pendingJobs, completedToday, queuedPayouts] = await Promise.all([
    prisma.job.count({ where: { tenantId: session.tenantId, scheduledStart: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
    prisma.job.count({ where: { tenantId: session.tenantId, status: "PENDING" } }),
    prisma.job.count({ where: { tenantId: session.tenantId, status: "COMPLETED", updatedAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
    prisma.cleanerPayout.count({ where: { status: "QUEUED" } }).catch(() => 0),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-800 via-brand-800 to-emerald-700 p-8 text-white shadow-xl">
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-indigo-200/80">System Architecture</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Automated Workflow</h1>
          <p className="mt-1 text-sm text-indigo-100/80">
            Every step from lead capture to cleaner payout — fully interconnected, AI-driven.
          </p>
          <div className="mt-4 flex gap-4">
            <div className="rounded-2xl bg-white/10 px-4 py-2 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Jobs Today</p>
              <p className="text-xl font-bold">{jobsToday}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-2 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Pending</p>
              <p className="text-xl font-bold">{pendingJobs}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-2 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Completed Today</p>
              <p className="text-xl font-bold">{completedToday}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-2 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Payouts Queued</p>
              <p className="text-xl font-bold">{queuedPayouts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-brand-100 bg-white px-5 py-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Legend:</span>
        <span className="flex items-center gap-1.5 text-xs"><Zap className="h-3.5 w-3.5 text-green-500" /> Fully Automated</span>
        <span className="flex items-center gap-1.5 text-xs"><Users className="h-3.5 w-3.5 text-blue-500" /> Manual / Human Step</span>
        <span className="flex items-center gap-1.5 text-xs"><ArrowDown className="h-3.5 w-3.5 text-muted-foreground" /> Flow Direction</span>
      </div>

      {/* Workflow Steps */}
      <div className="space-y-1">
        {WORKFLOW_STEPS.map((step, i) => (
          <div key={step.id}>
            {/* Step Card */}
            <div className="rounded-3xl border border-brand-100 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex gap-4">
                {/* Icon + Automation Badge */}
                <div className="flex flex-col items-center gap-1">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${step.color} text-white shadow-sm`}>
                    <step.icon className="h-6 w-6" />
                  </div>
                  {step.automated ? (
                    <span className="flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-700">
                      <Zap className="h-2.5 w-2.5" /> Auto
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-700">
                      <Users className="h-2.5 w-2.5" /> Manual
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground/50">STEP {i + 1}</span>
                    <h3 className="font-bold text-accent">{step.title}</h3>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>

                  {/* Triggers + Outputs */}
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Triggers</p>
                      <div className="space-y-1">
                        {step.triggers.map((t, j) => (
                          <div key={j} className="flex items-center gap-1.5 text-xs text-accent">
                            <span className="h-1 w-1 rounded-full bg-blue-400" />
                            {t}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">Outputs</p>
                      <div className="space-y-1">
                        {step.outputs.map((o, j) => (
                          <div key={j} className="flex items-start gap-1.5 text-xs text-accent">
                            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                            {o}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Page + API Links */}
                  {(step.pageUrl || step.apiUrl) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {step.pageUrl && (
                        <Link href={step.pageUrl.includes("[") ? "#" : step.pageUrl} className="rounded-full bg-brand-50 px-3 py-1 text-[10px] font-bold text-brand-700 hover:bg-brand-100 transition">
                          📄 {step.pageUrl}
                        </Link>
                      )}
                      {step.apiUrl && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-mono text-slate-600">
                          ⚡ {step.apiUrl}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Arrow connector */}
            {i < WORKFLOW_STEPS.length - 1 && (
              <div className="flex justify-center py-0.5">
                <ArrowDown className="h-5 w-5 text-brand-300" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Automation Summary */}
      <div className="rounded-3xl border border-brand-100 bg-gradient-to-r from-green-50 to-emerald-50 p-6">
        <h3 className="flex items-center gap-2 font-bold text-accent">
          <Shield className="h-5 w-5 text-green-600" />
          Automation Coverage
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">
              {WORKFLOW_STEPS.filter(s => s.automated).length}/{WORKFLOW_STEPS.length}
            </p>
            <p className="text-xs text-muted-foreground">Steps Automated</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">
              {Math.round(WORKFLOW_STEPS.filter(s => s.automated).length / WORKFLOW_STEPS.length * 100)}%
            </p>
            <p className="text-xs text-muted-foreground">Automation Rate</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">
              {WORKFLOW_STEPS.filter(s => !s.automated).length}
            </p>
            <p className="text-xs text-muted-foreground">Human Steps (photos + cleaning)</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground text-center">
          Only 4 steps require human action: travel, before photos, the actual cleaning, and after photos.
          Everything else is fully automated from lead capture to payout.
        </p>
      </div>
    </div>
  );
}
