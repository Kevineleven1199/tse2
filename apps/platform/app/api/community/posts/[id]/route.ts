import { NextRequest, NextResponse } from "next/server";
import { getPostById, getPostComments } from "@/src/lib/community";
import {
  applyCommunityActorCookie,
  canAccessTeamCommunity,
  getCommunityActor,
} from "@/src/lib/community-identity";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const actor = await getCommunityActor();
    const { id } = await context.params;

    const rawPost = await prisma.communityPost.findUnique({
      where: { id },
      select: { audience: true },
    });

    if (!rawPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (rawPost.audience === "TEAM" && !canAccessTeamCommunity(actor)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [post, comments] = await Promise.all([
      getPostById(id, actor.key),
      getPostComments(id),
    ]);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return applyCommunityActorCookie(
      NextResponse.json({
        post,
        comments,
        viewer: {
          reactions: post.reactions.filter((item) => item.userReacted).map((item) => item.type),
        },
      }),
      actor
    );
  } catch (error) {
    console.error("[community/post GET] Error:", error);
    return NextResponse.json({ error: "Failed to load post" }, { status: 500 });
  }
}
