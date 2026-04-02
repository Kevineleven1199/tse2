export const dynamic = "force-dynamic";

import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HQ"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.tenantId;

    const teams = await prisma.cleanerTeam.findMany({
      where: {
        tenantId,
      },
      include: {
        members: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Serialize to match client expectations (memberIds instead of members array)
    const serialized = teams.map((team) => ({
      id: team.id,
      name: team.name,
      description: team.description,
      memberCount: team.members.length,
      memberIds: team.members.map((m) => m.cleanerId),
      createdAt: team.createdAt.toISOString(),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["HQ"].includes(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.tenantId;

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    }

    const team = await prisma.cleanerTeam.create({
      data: {
        tenantId,
        name,
        description: description || null,
      },
      include: {
        members: true,
      },
    });

    // Serialize to match client expectations (memberIds instead of members array)
    const serialized = {
      id: team.id,
      name: team.name,
      description: team.description,
      memberCount: team.members.length,
      memberIds: team.members.map((m) => m.cleanerId),
      createdAt: team.createdAt.toISOString(),
    };

    return NextResponse.json(serialized);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }
}
