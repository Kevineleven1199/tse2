import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    // Auth check — admin only (HQ or MANAGER)
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const filter = url.searchParams.get("status") || undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const where = filter === "new"
      ? { processedAt: null }
      : filter === "reviewed"
        ? { processedAt: { not: null } }
        : filter === "followup"
          ? { followUpNeeded: true }
          : {};

    const [transcripts, total] = await Promise.all([
      prisma.callTranscript.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.callTranscript.count({ where }),
    ]);

    return NextResponse.json({ transcripts, total, limit, offset });
  } catch (err) {
    console.error("[transcripts] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch transcripts" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    // Auth check — admin only (HQ or MANAGER)
    const session = await getSession();
    if (!session || !["HQ", "MANAGER"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, followUpNotes } = body;

    if (!id)
      return NextResponse.json({ error: "id required" }, { status: 400 });

    const updated = await prisma.callTranscript.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(followUpNotes !== undefined && { followUpNotes }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[transcripts] Update error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
