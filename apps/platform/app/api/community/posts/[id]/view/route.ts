import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { trackCommunityView } from "@/src/lib/community";
import {
  applyCommunityActorCookie,
  canAccessTeamCommunity,
  getCommunityActor,
} from "@/src/lib/community-identity";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const actor = await getCommunityActor();
    const { id } = await context.params;

    const post = await prisma.communityPost.findUnique({
      where: { id },
      select: { id: true, audience: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.audience === "TEAM" && !canAccessTeamCommunity(actor)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await trackCommunityView({ postId: id, actorKey: actor.key });

    return applyCommunityActorCookie(
      NextResponse.json({ success: true }),
      actor
    );
  } catch (error) {
    console.error("[community/view POST] Error:", error);
    return NextResponse.json({ error: "Failed to record view" }, { status: 500 });
  }
}
