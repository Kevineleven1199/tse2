import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AnalyticsEvent } from "@/src/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * Analytics Collection Endpoint
 * Receives batched analytics events from clients
 * Stores them in the database for later analysis
 */

// Rate limiting map (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; reset: number }>();

/**
 * Check rate limit for IP address
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);

  if (!limit || limit.reset < now) {
    // Reset rate limit
    rateLimitMap.set(ip, { count: 1, reset: now + 60000 }); // 1 minute window
    return true;
  }

  if (limit.count >= 100) {
    return false; // Rate limit exceeded (100 events per minute)
  }

  limit.count++;
  return true;
}

/**
 * Validate event structure
 */
function validateEvent(event: unknown): event is AnalyticsEvent {
  if (!event || typeof event !== "object") return false;

  const e = event as Record<string, unknown>;

  // Check required fields
  if (
    !e.type ||
    !e.page ||
    !e.timestamp ||
    !e.visitorId ||
    !e.sessionId ||
    !e.device ||
    !e.viewport
  ) {
    return false;
  }

  // Validate field types
  if (
    typeof e.type !== "string" ||
    typeof e.page !== "string" ||
    typeof e.timestamp !== "number" ||
    typeof e.visitorId !== "string" ||
    typeof e.sessionId !== "string" ||
    typeof e.device !== "string"
  ) {
    return false;
  }

  // Validate enum values
  const validTypes = ["pageview", "click", "scroll", "funnel", "custom"];
  if (!validTypes.includes(e.type)) return false;

  const validDevices = ["mobile", "tablet", "desktop"];
  if (!validDevices.includes(e.device)) return false;

  // Validate viewport
  const viewport = e.viewport as Record<string, unknown>;
  if (!viewport || typeof viewport.width !== "number" || typeof viewport.height !== "number") {
    return false;
  }

  return true;
}

/**
 * POST /api/analytics/collect
 * Accepts batch of analytics events and stores them
 */
export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400 }
      );
    }

    // Validate body structure
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { events } = body as Record<string, unknown>;

    // Validate events array
    if (!Array.isArray(events)) {
      return NextResponse.json(
        { error: "Events must be an array" },
        { status: 400 }
      );
    }

    if (events.length === 0) {
      return NextResponse.json(
        { received: 0 },
        { status: 200 }
      );
    }

    // Limit events per request to 100
    if (events.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 events per request" },
        { status: 400 }
      );
    }

    // Filter and validate events
    const validEvents: typeof events = [];
    for (const event of events) {
      if (validateEvent(event)) {
        validEvents.push(event);
      }
    }

    if (validEvents.length === 0) {
      return NextResponse.json(
        { error: "No valid events in batch" },
        { status: 400 }
      );
    }

    // Store events in database (graceful if table doesn't exist yet)
    try {
      const storedEvents = await prisma.analyticsEvent.createMany({
        data: validEvents.map((event: AnalyticsEvent) => ({
          type: event.type,
          page: event.page,
          event: event.event || null,
          label: event.label || null,
          value: event.value ? String(event.value) : null,
          metadata: event.metadata ? (event.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
          visitorId: event.visitorId,
          sessionId: event.sessionId,
          device: event.device,
          viewportW: event.viewport.width,
          viewportH: event.viewport.height,
          referrer: event.referrer || null,
          utmSource: event.utmSource || null,
          utmMedium: event.utmMedium || null,
          utmCampaign: event.utmCampaign || null,
          timestamp: new Date(event.timestamp),
        })),
        skipDuplicates: false,
      });

      return NextResponse.json(
        { received: storedEvents.count },
        { status: 200 }
      );
    } catch (dbErr) {
      // Table may not exist yet — accept the events silently
      console.error("[Analytics API] DB write failed (non-fatal):", dbErr);
      return NextResponse.json(
        { received: validEvents.length, note: "logged" },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("[Analytics API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/collect
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json(
    { status: "ok", message: "Analytics collector endpoint" },
    { status: 200 }
  );
}
