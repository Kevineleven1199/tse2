export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { NextRequest, NextResponse } from "next/server";

interface ActivityItem {
  id: string;
  type:
    | "email_inbound"
    | "email_outbound"
    | "sms_inbound"
    | "sms_outbound"
    | "call_inbound"
    | "call_outbound"
    | "campaign_email"
    | "note"
    | "todo";
  timestamp: string;
  direction: "inbound" | "outbound" | null;
  summary: string;
  details: Record<string, unknown>;
  status: string;
}

interface ActivityResponse {
  contact: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    type: "customer" | "lead";
  };
  activity: ActivityItem[];
  stats: {
    totalEmails: number;
    totalSms: number;
    totalCalls: number;
    lastContactedAt: string | null;
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";
    const limit = parseInt(searchParams.get("limit") || "50");

    // Step 1: Look up the contact — try CrmLead first, then User
    let contact: {
      id: string;
      name: string | null;
      email: string | null;
      phone: string | null;
      type: "customer" | "lead";
    } | null = null;

    // Try to find as CrmLead
    const crmLead = await prisma.crmLead.findUnique({
      where: { id },
      select: {
        id: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        businessName: true,
      },
    });

    if (crmLead) {
      contact = {
        id: crmLead.id,
        name: crmLead.contactName || crmLead.businessName,
        email: crmLead.contactEmail,
        phone: crmLead.contactPhone,
        type: "lead",
      };
    } else {
      // Try to find as User (customer)
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      });

      if (user) {
        contact = {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          phone: user.phone,
          type: "customer",
        };
      }
    }

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // Step 2: Query across multiple tables in parallel
    const [emails, sms, calls, campaigns, notes, todos] = await Promise.all([
      // CustomerEmails
      prisma.customerEmail.findMany({
        where: {
          OR: [
            { fromEmail: contact.email || undefined },
            { toEmail: contact.email || undefined },
          ],
        },
        select: {
          id: true,
          direction: true,
          fromEmail: true,
          fromName: true,
          toEmail: true,
          subject: true,
          bodyText: true,
          category: true,
          priority: true,
          createdAt: true,
          status: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),

      // SmsMessages
      prisma.smsMessage.findMany({
        where: {
          OR: [
            { fromNumber: contact.phone || undefined },
            { toNumber: contact.phone || undefined },
          ],
        },
        select: {
          id: true,
          direction: true,
          fromNumber: true,
          toNumber: true,
          content: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),

      // CallTranscripts
      prisma.callTranscript.findMany({
        where: {
          OR: [
            { fromNumber: contact.phone || undefined },
            { toNumber: contact.phone || undefined },
            { phoneNumber: contact.phone || undefined },
          ],
        },
        select: {
          id: true,
          direction: true,
          fromNumber: true,
          toNumber: true,
          phoneNumber: true,
          duration: true,
          summary: true,
          transcript: true,
          createdAt: true,
          status: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),

      // EmailCampaignRecipients
      contact.email
        ? prisma.emailCampaignRecipient.findMany({
            where: { email: contact.email },
            select: {
              id: true,
              campaign: {
                select: {
                  id: true,
                  subject: true,
                  name: true,
                },
              },
              status: true,
              sentAt: true,
              openedAt: true,
            },
            orderBy: { sentAt: "desc" },
            take: limit,
          })
        : Promise.resolve([]),

      // Notes
      prisma.note.findMany({
        where: {
          relatedId: id,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          userId: true,
          pinned: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),

      // TodoItems
      prisma.todoItem.findMany({
        where: {
          relatedId: id,
        },
        select: {
          id: true,
          title: true,
          description: true,
          completed: true,
          priority: true,
          createdAt: true,
          dueDate: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);

    // Step 3: Merge and convert to unified timeline
    const activity: ActivityItem[] = [];

    // Add emails
    emails.forEach((email) => {
      activity.push({
        id: `email_${email.id}`,
        type: email.direction === "inbound" ? "email_inbound" : "email_outbound",
        timestamp: email.createdAt.toISOString(),
        direction: (email.direction as "inbound" | "outbound") || null,
        summary: email.subject || "Email",
        details: {
          subject: email.subject,
          category: email.category,
          priority: email.priority,
          preview: email.bodyText
            ? email.bodyText.substring(0, 150)
            : undefined,
        },
        status: email.status || "received",
      });
    });

    // Add SMS
    sms.forEach((msg) => {
      activity.push({
        id: `sms_${msg.id}`,
        type: msg.direction === "inbound" ? "sms_inbound" : "sms_outbound",
        timestamp: msg.createdAt.toISOString(),
        direction: (msg.direction as "inbound" | "outbound") || null,
        summary: msg.content.substring(0, 100),
        details: {
          content: msg.content,
          fromNumber: msg.fromNumber,
          toNumber: msg.toNumber,
        },
        status: msg.status || "delivered",
      });
    });

    // Add calls
    calls.forEach((call) => {
      activity.push({
        id: `call_${call.id}`,
        type: call.direction === "inbound" ? "call_inbound" : "call_outbound",
        timestamp: call.createdAt.toISOString(),
        direction: (call.direction as "inbound" | "outbound") || null,
        summary:
          call.summary ||
          `${call.direction} call (${Math.round(call.duration)}s)`,
        details: {
          duration: call.duration,
          from: call.fromNumber || call.phoneNumber,
          to: call.toNumber,
          summary: call.summary,
          hasTranscript: !!call.transcript,
        },
        status: call.status || "completed",
      });
    });

    // Add campaign emails
    (campaigns as unknown[]).forEach((camp: any) => {
      activity.push({
        id: `campaign_${camp.id}`,
        type: "campaign_email",
        timestamp: camp.sentAt ? new Date(camp.sentAt).toISOString() : new Date().toISOString(),
        direction: "outbound",
        summary: camp.campaign?.subject || "Campaign Email",
        details: {
          campaignName: camp.campaign?.name,
          subject: camp.campaign?.subject,
          opened: !!camp.openedAt,
          openedAt: camp.openedAt,
        },
        status: camp.status || "sent",
      });
    });

    // Add notes
    notes.forEach((note) => {
      activity.push({
        id: `note_${note.id}`,
        type: "note",
        timestamp: note.createdAt.toISOString(),
        direction: null,
        summary: note.content.substring(0, 100),
        details: {
          content: note.content,
          pinned: note.pinned,
        },
        status: "created",
      });
    });

    // Add todos
    todos.forEach((todo) => {
      activity.push({
        id: `todo_${todo.id}`,
        type: "todo",
        timestamp: todo.createdAt.toISOString(),
        direction: null,
        summary: todo.title,
        details: {
          title: todo.title,
          description: todo.description,
          completed: todo.completed,
          priority: todo.priority,
          dueDate: todo.dueDate,
        },
        status: todo.completed ? "completed" : "open",
      });
    });

    // Step 4: Filter by type if specified
    let filtered = activity;
    if (type !== "all") {
      filtered = activity.filter((item) => {
        if (type === "emails") return item.type.startsWith("email");
        if (type === "sms") return item.type.startsWith("sms");
        if (type === "calls") return item.type.startsWith("call");
        if (type === "notes") return item.type === "note";
        return true;
      });
    }

    // Step 5: Sort by timestamp descending and limit
    filtered.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    filtered = filtered.slice(0, limit);

    // Step 6: Calculate stats
    const stats = {
      totalEmails: emails.length,
      totalSms: sms.length,
      totalCalls: calls.length,
      lastContactedAt:
        filtered.length > 0
          ? filtered[0].timestamp
          : new Date().toISOString(),
    };

    const response: ActivityResponse = {
      contact,
      activity: filtered,
      stats,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Activity feed error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity feed" },
      { status: 500 }
    );
  }
}
