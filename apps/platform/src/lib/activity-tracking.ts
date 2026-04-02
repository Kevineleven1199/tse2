/**
 * Activity Tracking System
 * 
 * Tracks user activities across the platform for admin/manager visibility.
 * Similar to Jobber's "Viewed in Client Hub" feature.
 */

// Activity Types
export type ActivityType =
  | "invoice_viewed"
  | "invoice_paid"
  | "invoice_downloaded"
  | "quote_viewed"
  | "quote_accepted"
  | "quote_declined"
  | "email_opened"
  | "email_clicked"
  | "sms_received"
  | "sms_replied"
  | "portal_login"
  | "portal_visit"
  | "schedule_viewed"
  | "job_details_viewed"
  | "payment_method_added"
  | "profile_updated"
  | "document_viewed"
  | "document_downloaded"
  | "referral_shared"
  | "review_submitted"
  | "support_ticket_created"
  | "chat_message_sent";

export type ActorType = "customer" | "cleaner" | "admin" | "manager" | "system";

export type ActivityStatus = "success" | "failed" | "pending";

export interface Activity {
  id: string;
  type: ActivityType;
  actorType: ActorType;
  actorId: string;
  actorName: string;
  actorEmail?: string;
  actorAvatar?: string;
  
  // What was acted upon
  targetType: "invoice" | "quote" | "job" | "email" | "sms" | "document" | "profile" | "portal";
  targetId?: string;
  targetLabel?: string; // e.g., "Invoice #41", "Quote #123"
  
  // Context
  description: string;
  metadata?: Record<string, unknown>;
  
  // Location/Device info
  ipAddress?: string;
  userAgent?: string;
  device?: "desktop" | "mobile" | "tablet";
  location?: string;
  
  // Timestamps
  timestamp: Date;
  status: ActivityStatus;
}

export interface ActivityFilter {
  actorType?: ActorType | ActorType[];
  actorId?: string;
  type?: ActivityType | ActivityType[];
  targetType?: Activity["targetType"];
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface ActivitySummary {
  totalActivities: number;
  byType: Record<ActivityType, number>;
  byActor: { actorId: string; actorName: string; count: number }[];
  recentActivity: Activity[];
  lastActivityAt?: Date;
}

// Activity display configuration
export const ACTIVITY_CONFIG: Record<ActivityType, {
  label: string;
  icon: string;
  color: string;
  description: (activity: Activity) => string;
}> = {
  invoice_viewed: {
    label: "Invoice Viewed",
    icon: "👁️",
    color: "blue",
    description: (a) => `${a.actorName} viewed ${a.targetLabel || "an invoice"}`
  },
  invoice_paid: {
    label: "Invoice Paid",
    icon: "💳",
    color: "green",
    description: (a) => `${a.actorName} paid ${a.targetLabel || "an invoice"}`
  },
  invoice_downloaded: {
    label: "Invoice Downloaded",
    icon: "📥",
    color: "blue",
    description: (a) => `${a.actorName} downloaded ${a.targetLabel || "an invoice"}`
  },
  quote_viewed: {
    label: "Quote Viewed",
    icon: "👁️",
    color: "blue",
    description: (a) => `${a.actorName} viewed ${a.targetLabel || "a quote"}`
  },
  quote_accepted: {
    label: "Quote Accepted",
    icon: "✅",
    color: "green",
    description: (a) => `${a.actorName} accepted ${a.targetLabel || "a quote"}`
  },
  quote_declined: {
    label: "Quote Declined",
    icon: "❌",
    color: "red",
    description: (a) => `${a.actorName} declined ${a.targetLabel || "a quote"}`
  },
  email_opened: {
    label: "Email Opened",
    icon: "📧",
    color: "blue",
    description: (a) => `${a.actorName} opened email: "${a.targetLabel || "Unknown"}"`
  },
  email_clicked: {
    label: "Email Link Clicked",
    icon: "🔗",
    color: "blue",
    description: (a) => `${a.actorName} clicked a link in email`
  },
  sms_received: {
    label: "SMS Delivered",
    icon: "📱",
    color: "green",
    description: (a) => `SMS delivered to ${a.actorName}`
  },
  sms_replied: {
    label: "SMS Reply",
    icon: "💬",
    color: "blue",
    description: (a) => `${a.actorName} replied to SMS`
  },
  portal_login: {
    label: "Portal Login",
    icon: "🔐",
    color: "green",
    description: (a) => `${a.actorName} logged into ${a.actorType} portal`
  },
  portal_visit: {
    label: "Portal Visit",
    icon: "🌐",
    color: "gray",
    description: (a) => `${a.actorName} visited ${a.actorType} portal`
  },
  schedule_viewed: {
    label: "Schedule Viewed",
    icon: "📅",
    color: "blue",
    description: (a) => `${a.actorName} viewed their schedule`
  },
  job_details_viewed: {
    label: "Job Details Viewed",
    icon: "📋",
    color: "blue",
    description: (a) => `${a.actorName} viewed ${a.targetLabel || "job details"}`
  },
  payment_method_added: {
    label: "Payment Method Added",
    icon: "💳",
    color: "green",
    description: (a) => `${a.actorName} added a payment method`
  },
  profile_updated: {
    label: "Profile Updated",
    icon: "✏️",
    color: "blue",
    description: (a) => `${a.actorName} updated their profile`
  },
  document_viewed: {
    label: "Document Viewed",
    icon: "📄",
    color: "blue",
    description: (a) => `${a.actorName} viewed ${a.targetLabel || "a document"}`
  },
  document_downloaded: {
    label: "Document Downloaded",
    icon: "📥",
    color: "blue",
    description: (a) => `${a.actorName} downloaded ${a.targetLabel || "a document"}`
  },
  referral_shared: {
    label: "Referral Shared",
    icon: "🔗",
    color: "purple",
    description: (a) => `${a.actorName} shared their referral link`
  },
  review_submitted: {
    label: "Review Submitted",
    icon: "⭐",
    color: "yellow",
    description: (a) => `${a.actorName} submitted a review`
  },
  support_ticket_created: {
    label: "Support Ticket",
    icon: "🎫",
    color: "orange",
    description: (a) => `${a.actorName} created a support ticket`
  },
  chat_message_sent: {
    label: "Chat Message",
    icon: "💬",
    color: "blue",
    description: (a) => `${a.actorName} sent a message`
  }
};

// Helper to format relative time
export const formatActivityTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: days > 365 ? "numeric" : undefined
  }).format(new Date(date));
};

// Data fetching functions — queries real AuditLog + Notification tables.
export async function getActivities(filter?: ActivityFilter): Promise<Activity[]> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const tenantId = process.env.DEFAULT_TENANT_ID ?? "";

    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;

    const auditLogs = await prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    if (auditLogs.length === 0) {
      return [];
    }

    const ACTION_TO_ACTIVITY: Record<string, { type: ActivityType; targetType: Activity["targetType"] }> = {
      INVOICE_CREATED: { type: "invoice_viewed", targetType: "invoice" },
      CALL_COMPLETED: { type: "sms_received", targetType: "sms" },
      JOBBER_CLIENT_SYNC: { type: "profile_updated", targetType: "portal" },
      ADP_SYNC_TRIGGERED: { type: "profile_updated", targetType: "portal" },
      QUOTE_ACCEPTED: { type: "quote_accepted", targetType: "quote" },
      QUOTE_DECLINED: { type: "quote_declined", targetType: "quote" },
    };

    return auditLogs.map((log) => {
      const mapping = ACTION_TO_ACTIVITY[log.action] ?? { type: "portal_visit" as ActivityType, targetType: "portal" as Activity["targetType"] };
      const meta = (log.metadata ?? {}) as Record<string, unknown>;

      return {
        id: log.id,
        type: mapping.type,
        actorType: "system" as ActorType,
        actorId: log.actorId ?? "system",
        actorName: (meta.customerName as string) ?? log.action.replace(/_/g, " ").toLowerCase(),
        targetType: mapping.targetType,
        targetId: (meta.requestId as string) ?? (meta.jobId as string) ?? undefined,
        description: formatActionDescription(log.action, meta),
        timestamp: log.createdAt,
        status: "success" as ActivityStatus,
      };
    });
  } catch (error) {
    console.error("[activity-tracking] DB query failed:", error);
    return [];
  }
}

function formatActionDescription(action: string, meta: Record<string, unknown>): string {
  switch (action) {
    case "INVOICE_CREATED":
      return `Invoice created for $${(meta.total as number)?.toFixed(2) ?? "0.00"}`;
    case "CALL_COMPLETED":
      return `Call ${meta.direction ?? ""} from ${meta.from ?? "unknown"} (${Math.round((meta.duration as number) ?? 0)}s)`;
    case "JOBBER_CLIENT_SYNC":
      return `Synced ${meta.clientsSynced ?? 0} clients from Jobber`;
    case "ADP_SYNC_TRIGGERED":
      return "ADP 1099 sync triggered";
    default:
      return action.replace(/_/g, " ").toLowerCase();
  }
}

export async function getActivitySummary(filter?: ActivityFilter): Promise<ActivitySummary> {
  const activities = await getActivities(filter);
  
  const byType: Record<string, number> = {};
  const actorCounts: Record<string, { name: string; count: number }> = {};
  
  activities.forEach(activity => {
    // Count by type
    byType[activity.type] = (byType[activity.type] || 0) + 1;
    
    // Count by actor
    if (!actorCounts[activity.actorId]) {
      actorCounts[activity.actorId] = { name: activity.actorName, count: 0 };
    }
    actorCounts[activity.actorId].count++;
  });
  
  const byActor = Object.entries(actorCounts)
    .map(([actorId, data]) => ({ actorId, actorName: data.name, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return {
    totalActivities: activities.length,
    byType: byType as Record<ActivityType, number>,
    byActor,
    recentActivity: activities.slice(0, 5),
    lastActivityAt: activities[0]?.timestamp
  };
}

export async function getActivitiesForEntity(
  entityType: "customer" | "cleaner" | "invoice" | "quote" | "job",
  entityId: string
): Promise<Activity[]> {
  if (entityType === "customer" || entityType === "cleaner") {
    return getActivities({ actorId: entityId });
  }
  
  const targetTypeMap: Record<string, Activity["targetType"]> = {
    invoice: "invoice",
    quote: "quote",
    job: "job"
  };
  
  return getActivities({ 
    targetType: targetTypeMap[entityType], 
    targetId: entityId 
  });
}

// Function to track a new activity — persists to AuditLog
export async function trackActivity(
  activity: Omit<Activity, "id" | "timestamp" | "status">
): Promise<Activity> {
  const newActivity: Activity = {
    ...activity,
    id: `act-${Date.now()}`,
    timestamp: new Date(),
    status: "success"
  };

  try {
    const { prisma } = await import("@/lib/prisma");
    const tenantId = process.env.DEFAULT_TENANT_ID ?? "";

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: activity.actorId,
        action: activity.type.toUpperCase(),
        metadata: {
          actorType: activity.actorType,
          actorName: activity.actorName,
          actorEmail: activity.actorEmail,
          targetType: activity.targetType,
          targetId: activity.targetId,
          targetLabel: activity.targetLabel,
          description: activity.description,
          device: activity.device,
          location: activity.location,
          ...(activity.metadata ?? {}),
        },
      },
    });
  } catch (error) {
    console.error("[trackActivity] Failed to persist to DB:", error);
  }

  return newActivity;
}
