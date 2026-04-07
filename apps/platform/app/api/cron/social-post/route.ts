/**
 * Cron: Publish Scheduled Social Posts
 * Runs every 15 minutes. Picks up posts where scheduledFor <= now and status=SCHEDULED.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publishPost } from "@/src/lib/social/publisher";
import { generateDailySocialPost } from "@/src/lib/content-pipeline";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // 1. Publish scheduled posts that are due
    const duePosts = await prisma.socialPost.findMany({
      where: {
        status: "SCHEDULED",
        scheduledFor: { lte: now },
      },
      take: 10, // batch size
    });

    const results = [];
    for (const post of duePosts) {
      const result = await publishPost(post);
      results.push({ id: post.id, platform: post.platform, ...result });
    }

    // 2. Generate daily social posts if none scheduled for today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const todayCount = await prisma.socialPost.count({
      where: {
        scheduledFor: { gte: todayStart, lte: todayEnd },
        status: { in: ["SCHEDULED", "PUBLISHED"] },
      },
    });

    let dailyGenerated = false;
    if (todayCount === 0 && now.getHours() >= 8 && now.getHours() <= 9) {
      // Generate daily posts at ~8-9 AM if nothing scheduled
      await generateDailySocialPost();
      dailyGenerated = true;
    }

    return NextResponse.json({
      published: results.length,
      results,
      dailyGenerated,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("[cron/social-post] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
