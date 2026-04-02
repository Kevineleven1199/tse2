import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/blog/[id]
 * Update blog post: publish, unpublish, edit
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession({ roles: ["HQ"] });
  const { id } = await params;

  const post = await prisma.blogPost.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = body.title;
  if (body.content !== undefined) data.content = body.content;
  if (body.excerpt !== undefined) data.excerpt = body.excerpt;
  if (body.category !== undefined) data.category = body.category;
  if (body.metaDescription !== undefined) data.metaDescription = body.metaDescription;

  if (body.published === true && !post.published) {
    data.published = true;
    data.publishedAt = new Date();
  } else if (body.published === false) {
    data.published = false;
  }

  const updated = await prisma.blogPost.update({
    where: { id },
    data,
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      actorId: session.userId,
      action: body.published === true ? "blog.published" : "blog.updated",
      metadata: { postId: id, changes: Object.keys(data) },
    },
  });

  return NextResponse.json({ post: updated });
}

/**
 * DELETE /api/admin/blog/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession({ roles: ["HQ"] });
  const { id } = await params;

  const post = await prisma.blogPost.findFirst({
    where: { id, tenantId: session.tenantId },
  });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  await prisma.blogPost.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "blog.deleted",
      metadata: { postId: id, title: post.title },
    },
  });

  return NextResponse.json({ success: true });
}
