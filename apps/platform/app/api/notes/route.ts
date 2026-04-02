/**
 * Notes API — Shared + Personal with checklist support
 * GET  /api/notes   → List notes
 * POST /api/notes   → Create, update, toggle checklist, or delete
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "";
    const view = searchParams.get("view") || "all";
    const relatedId = searchParams.get("relatedId");
    const relatedType = searchParams.get("relatedType");

    const where: any = {};
    if (relatedId) where.relatedId = relatedId;
    if (relatedType) where.relatedType = relatedType;

    if (view === "personal") {
      where.userId = userId;
      where.isShared = false;
    } else if (view === "shared") {
      where.isShared = true;
    } else {
      where.OR = [{ userId, isShared: false }, { isShared: true }];
    }

    const notes = await prisma.note.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      take: 100,
    });

    return NextResponse.json({ notes });
  } catch (error: any) {
    console.error("[notes] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id, ...data } = body;

    if (action === "create") {
      const note = await prisma.note.create({
        data: {
          tenantId: data.tenantId || "default",
          userId: data.userId,
          content: data.content || "",
          isShared: data.isShared || false,
          relatedId: data.relatedId,
          relatedType: data.relatedType,
          checklist: data.checklist || null,
          tags: data.tags || [],
          pinned: data.pinned || false,
        },
      });
      return NextResponse.json({ note });
    }

    if (action === "update" && id) {
      const note = await prisma.note.update({
        where: { id },
        data: {
          content: data.content,
          isShared: data.isShared,
          checklist: data.checklist,
          tags: data.tags,
          pinned: data.pinned,
        },
      });
      return NextResponse.json({ note });
    }

    if (action === "toggle_check" && id) {
      // Toggle a specific checklist item
      const note = await prisma.note.findUnique({ where: { id } });
      if (!note?.checklist) return NextResponse.json({ error: "No checklist" }, { status: 400 });

      const items = note.checklist as any[];
      const idx = data.checkIndex;
      if (idx >= 0 && idx < items.length) {
        items[idx].checked = !items[idx].checked;
      }

      const updated = await prisma.note.update({
        where: { id },
        data: { checklist: items },
      });
      return NextResponse.json({ note: updated });
    }

    if (action === "pin" && id) {
      const note = await prisma.note.findUnique({ where: { id } });
      const updated = await prisma.note.update({
        where: { id },
        data: { pinned: !note?.pinned },
      });
      return NextResponse.json({ note: updated });
    }

    if (action === "delete" && id) {
      await prisma.note.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[notes] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
