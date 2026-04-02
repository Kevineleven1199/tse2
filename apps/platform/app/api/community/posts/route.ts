import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createCommunityPost,
  getCommunityFeed,
  type CommunityAudience,
  type PostCategory,
} from "@/src/lib/community";
import {
  applyCommunityActorCookie,
  canAccessTeamCommunity,
  getCommunityActor,
} from "@/src/lib/community-identity";

export const dynamic = "force-dynamic";

const audienceSchema = z.enum(["public", "team"]);
const categorySchema = z.enum([
  "cleaning_tip",
  "eco_tip",
  "recommendation",
  "question",
  "cleaner_spotlight",
  "promotion",
  "announcement",
  "before_after",
]);

const createPostSchema = z.object({
  audience: audienceSchema.default("public"),
  category: categorySchema,
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(20).max(4000),
  authorName: z.string().trim().min(2).max(60).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await getCommunityActor();
    const audience = audienceSchema.parse(
      request.nextUrl.searchParams.get("audience") ?? "public"
    );
    const categoryParam = request.nextUrl.searchParams.get("category");
    const category = categoryParam ? categorySchema.parse(categoryParam) : undefined;

    if (audience === "team" && !canAccessTeamCommunity(actor)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const neighborhood = audience === "team" ? "TriState Team" : "Community";
    const feed = await getCommunityFeed(
      neighborhood,
      category as PostCategory | undefined,
      undefined,
      audience as CommunityAudience,
      actor.tenantId ?? undefined
    );

    return applyCommunityActorCookie(NextResponse.json(feed), actor);
  } catch (error) {
    console.error("[community/posts GET] Error:", error);
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getCommunityActor();
    const body = createPostSchema.parse(await request.json());

    if (body.audience === "team" && !canAccessTeamCommunity(actor)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = actor.tenantId ?? process.env.DEFAULT_TENANT_ID;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not configured" }, { status: 500 });
    }

    const authorName = actor.isAuthenticated
      ? actor.name?.trim()
      : body.authorName?.trim();

    if (!authorName) {
      return NextResponse.json({ error: "Author name is required" }, { status: 400 });
    }

    const post = await createCommunityPost({
      tenantId,
      audience: body.audience,
      category: body.category,
      title: body.title,
      body: body.body,
      authorName,
      authorRole: actor.isAuthenticated ? actor.role : "client",
      authorBadge: actor.badge,
      authorUserId: actor.userId ?? null,
      neighborhood: body.audience === "team" ? "TriState Team" : "Community",
      isVerified: actor.isAuthenticated,
    });

    return applyCommunityActorCookie(
      NextResponse.json({ post }, { status: 201 }),
      actor
    );
  } catch (error) {
    console.error("[community/posts POST] Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid post payload", details: error.flatten() },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "Failed to publish post" }, { status: 500 });
  }
}
