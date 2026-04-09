/**
 * Individual social post CRUD + manual publish trigger.
 * GET    /api/admin/social-posts/[id]
 * PATCH  /api/admin/social-posts/[id]  — update content/schedule
 * DELETE /api/admin/social-posts/[id]
 * POST   /api/admin/social-posts/[id]  — trigger manual publish-now
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { publishPost } from "@/src/lib/social/publisher";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession({ roles: ["HQ", "MANAGER"] });
    const { id } = await params;
    const post = await prisma.socialPost.findUniqueOrThrow({ where: { id } });
    return NextResponse.json(post);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession({ roles: ["HQ", "MANAGER"] });
    const { id } = await params;
    const body = await request.json();

    const data: any = {};
    if (body.content !== undefined) data.content = body.content;
    if (body.hashtags !== undefined) data.hashtags = body.hashtags;
    if (body.mediaUrls !== undefined) data.mediaUrls = body.mediaUrls;
    if (body.scheduledFor !== undefined) data.scheduledFor = new Date(body.scheduledFor);
    if (body.status !== undefined) data.status = body.status;

    const updated = await prisma.socialPost.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession({ roles: ["HQ", "MANAGER"] });
    const { id } = await params;
    await prisma.socialPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** POST = publish now (manual trigger) */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession({ roles: ["HQ", "MANAGER"] });
    const { id } = await params;
    const post = await prisma.socialPost.findUniqueOrThrow({ where: { id } });
    const result = await publishPost(post);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
