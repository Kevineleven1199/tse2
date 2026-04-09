/**
 * POST /api/admin/social-posts/bulk-generate
 * Generate a full week of social media posts across all platforms.
 */
import { NextResponse } from "next/server";
import { requireSession } from "@/src/lib/auth/session";
import { generateWeeklyContent, generateContentForRange } from "@/src/lib/social/bulk-generator";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for bulk AI generation

export async function POST(request: Request) {
  try {
    const session = await requireSession({ roles: ["HQ", "MANAGER"] });
    const body = await request.json().catch(() => ({}));

    const weekStart = body.weekStart ? new Date(body.weekStart) : new Date();
    const platforms = body.platforms;
    const useBlogPosts = body.useBlogPosts !== false;
    const rangeEnd = body.endDate ? new Date(body.endDate) : null;

    const result = rangeEnd
      ? await generateContentForRange(weekStart, rangeEnd, session.tenantId)
      : await generateWeeklyContent({
          tenantId: session.tenantId,
          weekStart,
          platforms,
          useBlogPosts,
        });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("[bulk-generate] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
