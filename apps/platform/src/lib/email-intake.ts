import { prisma } from "@/lib/prisma";
import { sendEmailWithFailsafe } from "@/src/lib/email-failsafe";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI Provider Cascade: Ollama (FREE) → OpenRouter → OpenAI (paid)
// Ollama runs locally on your machine = $0 per email forever
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral-nemo";

// Types
export interface EmailClassification {
  category:
    | "reschedule"
    | "cancellation"
    | "question"
    | "complaint"
    | "feedback"
    | "quote_request"
    | "payment"
    | "general";
  priority: "urgent" | "high" | "normal" | "low";
  summary: string;
  actionItems: string[];
  sentiment: "positive" | "neutral" | "negative";
  suggestedResponse?: string;
  customerName?: string;
  referencedDate?: string;
}

export interface ProcessedResult {
  emailId: string;
  customerId?: string;
  leadId?: string;
  jobId?: string;
  requestId?: string;
  todoId?: string;
  classification: EmailClassification;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface CustomerEmailRecord {
  id: string;
  tenantId: string;
  fromEmail: string;
  fromName: string | null;
  subject: string;
  bodyText: string;
  createdAt: Date;
}

export interface CustomerMatchResult {
  userId?: string;
  leadId?: string;
  customerName?: string;
}

export interface JobMatchResult {
  jobId?: string;
  requestId?: string;
}

// System prompt for AI classification
const SYSTEM_PROMPT = `You are an expert email classifier for Tri State Enterprise, an eco-friendly cleaning service company.
Your role is to analyze customer emails and extract actionable information.

Classify emails into these categories:
- reschedule: Customer wants to change appointment date/time
- cancellation: Customer wants to cancel service
- question: Customer asking about services, pricing, or general info
- complaint: Customer expressing dissatisfaction or issues
- feedback: Customer providing positive feedback or suggestions
- quote_request: Customer requesting a pricing estimate
- payment: Issues related to invoices, payments, billing
- general: Everything else

Priority levels:
- urgent: Complaints, critical issues (set for complaints always)
- high: Reschedules, cancellations (time-sensitive)
- normal: Questions, feedback, quote requests
- low: General inquiries

Sentiment analysis:
- positive: Friendly, complimentary tone
- neutral: Matter-of-fact, informational
- negative: Frustrated, angry, or disappointed

Extract:
- Customer name (if mentioned)
- Any dates referenced (for appointment matching)
- Specific action items needed
- A brief suggested response for the admin

Return VALID JSON ONLY with no markdown formatting.`;

/**
 * Main processing pipeline for inbound customer emails
 */
export async function processInboundEmail(
  emailId: string
): Promise<ProcessedResult> {
  const startTime = new Date();
  let result: ProcessedResult = {
    emailId,
    classification: {} as EmailClassification,
    timestamp: startTime,
    success: false,
  };

  try {
    // 1. Load the CustomerEmail record
    const email = await prisma.customerEmail.findUnique({
      where: { id: emailId },
    });

    if (!email) {
      result.error = `CustomerEmail not found: ${emailId}`;
      return result;
    }

    const tenantId = email.tenantId;

    // 2. Classify the email using AI (Ollama FREE → OpenRouter → OpenAI)
    const classification = await classifyEmail(email.subject, email.bodyText || "");
    result.classification = classification;

    // 3. Match the sender to an existing customer or CRM lead
    const customerMatch = await matchCustomer(
      email.fromEmail,
      email.fromName,
      tenantId
    );
    result.customerId = customerMatch.userId;
    result.leadId = customerMatch.leadId;

    // 4. Match to a Job/ServiceRequest if applicable
    const jobMatch = await matchJob(
      tenantId,
      email.fromEmail,
      classification.referencedDate
    );
    result.jobId = jobMatch.jobId;
    result.requestId = jobMatch.requestId;

    // 5. Auto-create a TodoItem for admins if needed
    if (shouldCreateTodo(classification)) {
      const todoId = await createAutoTodo(email, classification, tenantId);
      result.todoId = todoId;
    }

    // 6. Create an AuditLog entry
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: null, // system action
        action: "email.inbound_processed",
        metadata: {
          emailId,
          fromEmail: email.fromEmail,
          category: classification.category,
          priority: classification.priority,
          customerId: result.customerId,
          leadId: result.leadId,
          jobId: result.jobId,
          summary: classification.summary,
        },
      },
    });

    // 7. Update the CustomerEmail record with extracted info
    await prisma.customerEmail.update({
      where: { id: emailId },
      data: {
        category: classification.category,
        priority: classification.priority,
        aiSummary: classification.summary,
        customerId: result.customerId || null,
        jobId: result.jobId || null,
        requestId: result.requestId || null,
        customerName: classification.customerName || email.fromName || null,
        processedAt: new Date(),
        aiActionItems: classification.actionItems,
        metadata: {
          sentiment: classification.sentiment,
          suggestedResponse: classification.suggestedResponse,
          referencedDate: classification.referencedDate,
        },
      },
    });

    result.success = true;
    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error processing email ${emailId}:`, error);
    return result;
  }
}

/**
 * Classify email using AI with 3-tier fallback: Ollama (FREE) → OpenRouter → OpenAI
 */
export async function classifyEmail(
  subject: string,
  bodyText: string
): Promise<EmailClassification> {
  const emailContent = `Subject: ${subject}\n\nBody: ${bodyText}`;

  let rawContent: string | null = null;
  let provider = "unknown";

  // ── Tier 1: Ollama (FREE — runs locally) ────────────────────────
  try {
    const resp = await fetch(`${OLLAMA_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: emailContent },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (resp.ok) {
      const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
      rawContent = data.choices?.[0]?.message?.content?.trim() || null;
      if (rawContent) {
        JSON.parse(rawContent); // validate JSON
        provider = "ollama";
        console.log("[email-intake] ✅ Used Ollama (FREE) for email classification");
      }
    }
  } catch (error) {
    console.warn("[email-intake] Ollama unavailable, trying OpenRouter:", error instanceof Error ? error.message : error);
  }

  // ── Tier 2: OpenRouter (cheap) ──────────────────────────────────
  if (!rawContent && process.env.OPENROUTER_API_KEY) {
    try {
      const resp = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-001",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: emailContent },
            ],
            response_format: { type: "json_object" },
          }),
        }
      );

      if (resp.ok) {
        const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
        rawContent = data.choices?.[0]?.message?.content?.trim() || null;
        if (rawContent) {
          provider = "openrouter";
          console.log("[email-intake] Used OpenRouter (paid) — start Ollama to save money");
        }
      } else {
        console.warn(`[email-intake] OpenRouter error: ${resp.status}`);
      }
    } catch (error) {
      console.warn("[email-intake] OpenRouter failed, trying OpenAI:", error);
    }
  }

  // ── Tier 3: OpenAI (most expensive, last resort) ────────────────
  if (!rawContent && process.env.OPENAI_API_KEY) {
    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: emailContent },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (resp.ok) {
        const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
        rawContent = data.choices?.[0]?.message?.content?.trim() || null;
        if (rawContent) {
          provider = "openai";
          console.log("[email-intake] Used OpenAI (PAID $$) — start Ollama to save money!");
        }
      } else {
        console.error(`[email-intake] OpenAI error: ${resp.status}`);
      }
    } catch (error) {
      console.error("[email-intake] OpenAI failed:", error);
    }
  }

  // ── All providers failed ────────────────────────────────────────
  if (!rawContent) {
    throw new Error(
      "All AI providers failed. Ensure Ollama is running (ollama serve) or set OPENROUTER_API_KEY / OPENAI_API_KEY"
    );
  }

  const parsed = JSON.parse(rawContent) as Partial<EmailClassification>;

  // Validate required fields
  const classification: EmailClassification = {
    category: parsed.category || "general",
    priority: parsed.priority || "normal",
    summary: parsed.summary || "",
    actionItems: parsed.actionItems || [],
    sentiment: parsed.sentiment || "neutral",
    suggestedResponse: parsed.suggestedResponse,
    customerName: parsed.customerName,
    referencedDate: parsed.referencedDate,
  };

  return classification;
}

/**
 * Match customer by email to User or CrmLead
 */
export async function matchCustomer(
  fromEmail: string,
  fromName: string | null,
  tenantId: string
): Promise<CustomerMatchResult> {
  // First check User table by email (role: CUSTOMER)
  const user = await prisma.user.findFirst({
    where: {
      email: fromEmail,
      role: "CUSTOMER",
      tenantId,
    },
  });

  if (user) {
    return {
      userId: user.id,
      customerName: `${user.firstName} ${user.lastName}`.trim() || fromName || undefined,
    };
  }

  // Then check CrmLead table by contactEmail
  const lead = await prisma.crmLead.findFirst({
    where: {
      contactEmail: fromEmail,
      tenantId,
    },
  });

  if (lead) {
    return {
      leadId: lead.id,
      customerName: lead.contactName || fromName || undefined,
    };
  }

  return {
    customerName: fromName || undefined,
  };
}

/**
 * Match email to a Job or ServiceRequest by customer and date
 */
export async function matchJob(
  tenantId: string,
  customerEmail: string,
  referencedDate?: string
): Promise<JobMatchResult> {
  // Find upcoming service requests for this customer by email
  const serviceRequests = await prisma.serviceRequest.findMany({
    where: {
      tenantId,
      customerEmail,
      status: {
        in: ["NEW", "QUOTED", "ACCEPTED", "SCHEDULED"],
      },
    },
    orderBy: {
      preferredStart: "asc",
    },
    include: {
      job: { select: { id: true, scheduledStart: true, status: true } },
    },
    take: 10,
  });

  if (serviceRequests.length === 0) {
    return {};
  }

  // If a date is referenced, find the closest matching request
  let matchingRequest = serviceRequests[0];

  if (referencedDate) {
    const refDate = parseDate(referencedDate);
    if (refDate) {
      let closestDistance = Infinity;

      for (const req of serviceRequests) {
        const reqDate = req.job?.scheduledStart || req.preferredStart;
        if (reqDate) {
          const distance = Math.abs(
            reqDate.getTime() - refDate.getTime()
          );
          if (distance < closestDistance) {
            closestDistance = distance;
            matchingRequest = req;
          }
        }
      }
    }
  }

  // Get the associated job
  const job = matchingRequest.job;

  return {
    requestId: matchingRequest.id,
    jobId: job?.id,
  };
}

/**
 * Create automatic TodoItem for admins based on email classification
 */
export async function createAutoTodo(
  email: { id: string; fromEmail: string; fromName?: string | null; subject: string },
  classification: EmailClassification,
  tenantId: string
): Promise<string> {
  if (!shouldCreateTodo(classification)) {
    return "";
  }

  const customerName = classification.customerName || email.fromName || "Unknown";
  let title = "";

  switch (classification.category) {
    case "reschedule":
      title = `📅 Reschedule: ${customerName}`;
      if (classification.referencedDate) {
        title += ` - ${classification.referencedDate}`;
      }
      break;
    case "cancellation":
      title = `❌ Cancellation Request: ${customerName}`;
      break;
    case "complaint":
      title = `⚠️ Complaint: ${customerName}`;
      break;
    case "quote_request":
      title = `💰 Quote Request: ${customerName}`;
      break;
    default:
      title = `📬 Action Required: ${customerName}`;
  }

  // Map priority to todo priority (1=urgent, 2=high, 3=normal, 4=low)
  const priorityMap: Record<string, number> = {
    urgent: 1,
    high: 1,
    normal: 2,
    low: 3,
  };

  const priority = priorityMap[classification.priority] || 2;
  const isUrgentOrHigh = ["urgent", "high"].includes(classification.priority);

  // Find an HQ user to assign the todo to
  const hqUser = await prisma.user.findFirst({
    where: { tenantId, role: "HQ" },
    select: { id: true },
  });

  const todoItem = await prisma.todoItem.create({
    data: {
      tenantId,
      userId: hqUser?.id || "system",
      title,
      description: `${classification.summary}\n\nFrom: ${email.fromEmail}\nSubject: ${email.subject}`,
      priority,
      isShared: true,
      category: classification.category,
      relatedId: email.id,
      relatedType: "customer_email",
      dueDate: isUrgentOrHigh ? new Date() : undefined,
    },
  });

  return todoItem.id;
}

/**
 * Determine if a TodoItem should be created for this email
 */
function shouldCreateTodo(classification: EmailClassification): boolean {
  const requiresAction = [
    "reschedule",
    "cancellation",
    "complaint",
    "quote_request",
    "payment",
  ];
  return requiresAction.includes(classification.category);
}

/**
 * Parse various date formats from email text
 */
function parseDate(dateString: string): Date | null {
  if (!dateString) return null;

  // Try parsing as ISO date
  const isoDate = new Date(dateString);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // Try common US formats
  const patterns = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
    /(\d{1,2})-(\d{1,2})-(\d{4})/, // MM-DD-YYYY
  ];

  for (const pattern of patterns) {
    const match = dateString.match(pattern);
    if (match) {
      const [, month, day, year] = match;
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day)
      );
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}

/**
 * Send auto-response to customer email
 */
export async function sendAutoResponse(
  email: CustomerEmailRecord,
  classification: EmailClassification
): Promise<boolean> {
  try {
    const defaultResponse =
      classification.suggestedResponse ||
      "Thank you for contacting Tri State Enterprise! We have received your email and will respond shortly.";

    const html = `
      <p>${defaultResponse}</p>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        Best regards,<br/>
        Tri State Enterprise<br/>
        <a href="https://tse.com">Visit our website</a>
      </p>
    `;

    await sendEmailWithFailsafe({
      to: email.fromEmail,
      subject: `Re: ${email.subject}`,
      html,
    });

    return true;
  } catch (error) {
    console.error("Failed to send auto-response:", error);
    return false;
  }
}
