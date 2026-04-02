import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { addCommunityComment } from "@/src/lib/community";
import {
  applyCommunityActorCookie,
  canAccessTeamCommunity,
  getCommunityActor,
} from "@/src/lib/community-identity";

export const dynamic = "force-dynamic";

const createCommentSchema = z.object({
  body: z.string().trim().min(2).max(2000),
  authorName: z.string().trim().min(2).max(60).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const actor = await getCommunityActor();
    const { id } = await context.params;
    const body = createCommentSchema.parse(await request.json());

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

    const authorName = actor.isAuthenticated
      ? actor.name?.trim()
      : body.authorName?.trim();

    if (!authorName) {
      return NextResponse.json({ error: "Author name is required" }, { status: 400 });
    }

    const comment = await addCommunityComment({
      postId: id,
      authorName,
      authorRole: actor.isAuthenticated ? actor.role : "client",
      authorBadge: actor.badge,
      authorUserId: actor.userId ?? null,
      body: body.body,
    });

    return applyCommunityActorCookie(
      NextResponse.json({ comment }, { status: 201 }),
      actor
    );
  } catch (error) {
    console.error("[community/comment POST] Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid comment payload", details: error.flatten() },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}
