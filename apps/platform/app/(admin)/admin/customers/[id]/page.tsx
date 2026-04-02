import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { formatCurrency } from "@/src/lib/utils";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Star,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Lock,
  Plus,
} from "lucide-react";
import { CustomerDetailClient } from "./customer-detail-client";

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

// Generate a natural-language AI summary from structured customer data
function generateCustomerAiSummary(data: {
  name: string;
  totalJobs: number;
  totalSpent: number;
  loyaltyLevel: string;
  lastServiceDate?: Date | null;
  callCount: number;
  emailCount: number;
  smsCount: number;
  crmStage?: string | null;
  sentiment?: string | null;
  isBlocked: boolean;
}): string {
  const parts: string[] = [];

  if (data.isBlocked) {
    parts.push(`${data.name} is currently BLOCKED.`);
  }

  // Engagement summary
  if (data.totalJobs === 0) {
    parts.push(`${data.name} is a new prospect with no completed services yet.`);
  } else if (data.totalJobs >= 20) {
    parts.push(`${data.name} is a loyal, high-value customer with ${data.totalJobs} services and $${data.totalSpent.toLocaleString()} lifetime spend.`);
  } else if (data.totalJobs >= 5) {
    parts.push(`${data.name} is an active repeat customer (${data.totalJobs} services, $${data.totalSpent.toLocaleString()} total).`);
  } else {
    parts.push(`${data.name} has had ${data.totalJobs} service(s) totaling $${data.totalSpent.toLocaleString()}.`);
  }

  // Recency
  if (data.lastServiceDate) {
    const daysSince = Math.floor((Date.now() - data.lastServiceDate.getTime()) / 86400000);
    if (daysSince > 90) {
      parts.push(`Last service was ${daysSince} days ago — at risk of churning.`);
    } else if (daysSince > 30) {
      parts.push(`Last service was ${daysSince} days ago.`);
    } else {
      parts.push(`Recently serviced (${daysSince} days ago).`);
    }
  }

  // Communication activity
  const commTotal = data.callCount + data.emailCount + data.smsCount;
  if (commTotal > 10) {
    parts.push(`Highly engaged — ${data.callCount} calls, ${data.emailCount} emails, ${data.smsCount} texts on record.`);
  } else if (commTotal > 0) {
    parts.push(`${commTotal} communication(s) on file.`);
  }

  // Sentiment
  if (data.sentiment === "positive") {
    parts.push("Latest call sentiment was positive.");
  } else if (data.sentiment === "negative") {
    parts.push("Latest call sentiment was negative — may need attention.");
  }

  // CRM stage
  if (data.crmStage) {
    const stageLabels: Record<string, string> = {
      COLD_LEAD: "Cold lead",
      WARM_LEAD: "Warm lead",
      PROSPECT: "Active prospect",
      FIRST_TIME_CUSTOMER: "First-time customer",
      REPEAT_CUSTOMER: "Repeat customer",
      LOYAL_CUSTOMER: "Loyal customer",
      REFERRER: "Referrer",
      CHAMPION: "Champion advocate",
    };
    parts.push(`CRM stage: ${stageLabels[data.crmStage] || data.crmStage}.`);
  }

  return parts.join(" ");
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const session = await requireSession({ roles: ["HQ"], redirectTo: "/login" });
  const tenantId = session.tenantId;

  const { id: customerId } = await params;

  try {
    // Fetch customer user
    const customer = await prisma.user.findFirst({
      where: {
        id: customerId,
        tenantId,
      },
    });

    if (!customer) {
      notFound();
    }

    // Fetch all service requests for this customer
    const serviceRequests = await prisma.serviceRequest.findMany({
      where: {
        customerEmail: customer.email,
        tenantId,
      },
      include: {
        quote: true,
        job: {
          include: {
            assignments: {
              include: {
                cleaner: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        payments: true,
        schedulingOptions: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch CRM lead data if available
    const crmLead = await prisma.crmLead.findFirst({
      where: {
        contactEmail: customer.email,
        tenantId,
      },
    });

    // Fetch ALL communications for unified timeline
    const [calls, emails, smsMessages, notes, auditActivity] = await Promise.all([
      // Call transcripts mentioning this customer
      prisma.callTranscript.findMany({
        where: { tenantId, OR: [{ customerEmail: customer.email }, { customerPhone: customer.phone ?? "NONE" }] },
        select: { id: true, direction: true, summary: true, sentiment: true, duration: true, customerName: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      // Inbound/outbound emails
      prisma.customerEmail.findMany({
        where: { tenantId, OR: [{ fromEmail: customer.email }, { toEmail: customer.email }] },
        select: { id: true, direction: true, subject: true, aiSummary: true, category: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      // SMS messages
      prisma.smsMessage.findMany({
        where: { tenantId, OR: [{ fromNumber: customer.phone ?? "NONE" }, { toNumber: customer.phone ?? "NONE" }] },
        select: { id: true, direction: true, content: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      // Notes about this customer
      prisma.note.findMany({
        where: { tenantId, OR: [{ relatedId: customerId }, { relatedId: customer.email }] },
        select: { id: true, content: true, pinned: true, tags: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      // Audit activity for this customer
      prisma.auditLog.findMany({
        where: { tenantId, OR: [{ actorId: customerId }, { metadata: { path: ["customerEmail"], equals: customer.email } }] },
        select: { id: true, action: true, metadata: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 30,
      }).catch(() => []), // graceful fail if metadata query not supported
    ]);

    // Calculate customer stats
    const totalJobs = serviceRequests.filter((sr) => sr.job).length;
    const totalSpent = serviceRequests.reduce(
      (sum, sr) => sum + (sr.quote?.total || 0),
      0
    );

    // Calculate average rating from jobs
    let totalRating = 0;
    let ratedJobs = 0;
    serviceRequests.forEach((sr) => {
      if (sr.job && sr.job.assignments.length > 0) {
        // This is a placeholder - you may need to add rating field to JobAssignment
        ratedJobs++;
      }
    });
    const avgRating = ratedJobs > 0 ? totalRating / ratedJobs : 0;

    // Determine loyalty level
    let loyaltyLevel = "Bronze";
    if (totalJobs >= 20) loyaltyLevel = "Gold";
    else if (totalJobs >= 10) loyaltyLevel = "Silver";

    // Get last service date
    const lastServiceJob = serviceRequests.find((sr) => sr.job?.scheduledStart);
    const lastServiceDate = lastServiceJob?.job?.scheduledStart;

    // Member since
    const memberSince = customer.createdAt;

    // Status determination
    const isBlocked = customer.blocked;
    const statusText = isBlocked ? "Blocked" : customer.status === "active" ? "Active" : "Inactive";

    // Prepare data for client component
    const customerData = {
      id: customer.id,
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      phone: customer.phone,
      status: statusText,
      isBlocked,
      memberSince: memberSince.toISOString(),
      totalJobs,
      totalSpent,
      avgRating,
      loyaltyLevel,
      lastServiceDate: lastServiceDate?.toISOString(),
      serviceRequests: serviceRequests.map((sr) => ({
        id: sr.id,
        status: sr.status,
        serviceType: sr.serviceType,
        address: sr.addressLine1,
        city: sr.city,
        state: sr.state,
        createdAt: sr.createdAt.toISOString(),
        scheduledDate: sr.job?.scheduledStart?.toISOString(),
        jobStatus: sr.job?.status,
        assignedCleaner: sr.job?.assignments[0]
          ? `${sr.job.assignments[0].cleaner.user.firstName} ${sr.job.assignments[0].cleaner.user.lastName}`
          : null,
        quotedAmount: sr.quote?.total || 0,
        jobId: sr.job?.id,
      })),
      payments: serviceRequests
        .flatMap((sr) => sr.payments)
        .map((p) => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          method: p.provider,
          date: p.createdAt.toISOString(),
          isDeposit: p.deposit,
        })),
      crmLead: crmLead
        ? {
            id: crmLead.id,
            source: crmLead.source,
            status: crmLead.status,
            priority: crmLead.priority,
            lifecycleStage: crmLead.lifecycleStage,
            lastContacted: crmLead.lastContactedAt?.toISOString(),
            lifetimeValue: crmLead.lifetimeValue,
            totalBookings: crmLead.totalBookings,
          }
        : null,
      // Unified communications timeline
      communications: [
        ...calls.map((c) => ({ type: "call" as const, id: c.id, date: c.createdAt.toISOString(), direction: c.direction, summary: c.summary, sentiment: c.sentiment, duration: c.duration })),
        ...emails.map((e) => ({ type: "email" as const, id: e.id, date: e.createdAt.toISOString(), direction: e.direction, subject: e.subject, aiSummary: e.aiSummary, category: e.category, status: e.status })),
        ...smsMessages.map((s) => ({ type: "sms" as const, id: s.id, date: s.createdAt.toISOString(), direction: s.direction, content: s.content?.slice(0, 200) })),
        ...notes.map((n) => ({ type: "note" as const, id: n.id, date: n.createdAt.toISOString(), content: n.content?.slice(0, 300), pinned: n.pinned, tags: n.tags })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      // Activity feed
      recentActivity: auditActivity.map((a) => ({
        id: a.id,
        action: a.action,
        metadata: a.metadata as Record<string, unknown>,
        date: a.createdAt.toISOString(),
      })),
      // AI Summary (generated from data, not an API call)
      aiSummary: generateCustomerAiSummary({
        name: `${customer.firstName} ${customer.lastName}`,
        totalJobs,
        totalSpent,
        loyaltyLevel,
        lastServiceDate,
        callCount: calls.length,
        emailCount: emails.length,
        smsCount: smsMessages.length,
        crmStage: crmLead?.lifecycleStage,
        sentiment: calls[0]?.sentiment,
        isBlocked: customer.blocked,
      }),
    };

    return (
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-8 text-white">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
                Customer Profile
              </p>
              <h1 className="text-3xl font-semibold">{customerData.name}</h1>
              <p className="text-sm text-brand-100">
                {totalJobs} services completed • Member since{" "}
                {memberSince.toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-3">
              <Link href={`/admin/customers/${customerId}/edit`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="gap-2">
                <Mail className="h-4 w-4" />
                Send Email
              </Button>
              <Link href={`/admin/customers/${customerId}/new-job`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Job
                </Button>
              </Link>
              {!isBlocked ? (
                <Button variant="outline" size="sm" className="gap-2 text-red-600">
                  <Lock className="h-4 w-4" />
                  Block
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="gap-2">
                  <Lock className="h-4 w-4" />
                  Unblock
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="border border-brand-100 bg-white">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="text-xs font-medium">Email</span>
                </div>
                <p className="font-semibold text-sm break-all">{customerData.email}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-brand-100 bg-white">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span className="text-xs font-medium">Phone</span>
                </div>
                <p className="font-semibold text-sm">
                  {customerData.phone || "Not provided"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-brand-100 bg-white">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {loyaltyLevel}
                  </Badge>
                </div>
                <p className="font-semibold text-sm">{statusText}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-brand-100 bg-white">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-medium">Member Since</span>
                </div>
                <p className="font-semibold text-sm">
                  {memberSince.toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border border-brand-100 bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Jobs
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-brand-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalJobs}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {lastServiceDate
                  ? `Last service: ${new Date(lastServiceDate).toLocaleDateString()}`
                  : "No services yet"}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-brand-100 bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Spent
                </CardTitle>
                <DollarSign className="h-4 w-4 text-brand-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(totalSpent)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalJobs > 0
                  ? `Avg: ${formatCurrency(totalSpent / totalJobs)} per job`
                  : "No transactions"}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-brand-100 bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Loyalty Level
                </CardTitle>
                <Star className="h-4 w-4 text-brand-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loyaltyLevel}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalJobs >= 20
                  ? "Gold status active"
                  : totalJobs >= 10
                    ? "Silver status active"
                    : "Bronze member"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content */}
        <CustomerDetailClient customerData={customerData} customerId={customerId} />
      </div>
    );
  } catch (error) {
    console.error("Error fetching customer:", error);
    notFound();
  }
}
