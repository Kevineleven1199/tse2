import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toggleCommunityReaction } from "@/src/lib/community";
import {
  applyCommunityActorCookie,
  canAccessTeamCommunity,
  getCommunityActor,
} from "@/src/lib/community-identity";

export const dynamic = "force-dynamic";

const reactSchema = z.object({
  reaction: z.enum(["like", "helpful", "love", "celebrate"]),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const actor = await getCommunityActor();
    const { id } = await context.params;
    const body = reactSchema.parse(await request.json());

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

    const result = await toggleCommunityReaction({
      postId: id,
      reaction: body.reaction,
      actorKey: actor.key,
      actorName: actor.name,
      authorUserId: actor.userId ?? null,
    });

    return applyCommunityActorCookie(
      NextResponse.json(result),
      actor
    );
  } catch (error) {
    console.error("[community/react POST] Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid reaction payload", details: error.flatten() },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "Failed to update reaction" }, { status: 500 });
  }
}
