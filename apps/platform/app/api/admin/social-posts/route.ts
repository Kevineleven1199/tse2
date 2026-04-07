/**
 * Social Posts API
 * GET  — List social posts with filters
 * POST — Create/schedule a new social post
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await requireSession({ roles: ["HQ", "MANAGER"] });
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const where: any = { tenantId: session.tenantId };
    if (platform) where.platform = platform;
    if (status) where.status = status;

    const [posts, total] = await Promise.all([
      prisma.socialPost.findMany({
        where,
        orderBy: { scheduledFor: "desc" },
        take: limit,
      }),
      prisma.socialPost.count({ where }),
    ]);

    const stats = await prisma.socialPost.groupBy({
      by: ["status"],
      where: { tenantId: session.tenantId },
      _count: true,
    });

    return NextResponse.json({ posts, total, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession({ roles: ["HQ", "MANAGER"] });
    const body = await request.json();

    const post = await prisma.socialPost.create({
      data: {
        tenantId: session.tenantId,
        platform: body.platform,
        content: body.content,
        mediaUrls: body.mediaUrls || [],
        hashtags: body.hashtags || [],
        status: body.scheduledFor ? "SCHEDULED" : "DRAFT",
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
        blogPostId: body.blogPostId,
        aiGenerated: body.aiGenerated || false,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
