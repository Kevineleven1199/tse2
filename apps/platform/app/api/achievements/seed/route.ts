import { NextResponse } from "next/server";
import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ALL_ACHIEVEMENTS } from "@/src/lib/achievements-definitions";

export const dynamic = "force-dynamic";

// Map achievement definitions to database schema
const ACHIEVEMENTS = ALL_ACHIEVEMENTS.map((ach, index) => ({
  key: ach.key,
  title: ach.title,
  description: ach.description,
  icon: ach.icon,
  xpReward: ach.xpReward,
  roleFilter: ach.roleFilter,
  category: ach.category,
  displayOrder: index,
}));

export async function POST() {
  try {
    // Require HQ role
    const session = await requireSession({ roles: ["HQ"] });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "No tenant associated with session" },
        { status: 400 }
      );
    }

    let createdCount = 0;
    let updatedCount = 0;

    // Upsert each achievement
    for (const achievement of ACHIEVEMENTS) {
      const result = await prisma.achievement.upsert({
        where: { tenantId_key: { tenantId, key: achievement.key } },
        update: {
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          xpReward: achievement.xpReward,
          roleFilter: achievement.roleFilter,
          category: achievement.category,
          displayOrder: achievement.displayOrder,
        },
        create: {
          key: achievement.key,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          xpReward: achievement.xpReward,
          roleFilter: achievement.roleFilter,
          category: achievement.category,
          displayOrder: achievement.displayOrder,
          tenantId,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Achievements seeded successfully`,
        created: ACHIEVEMENTS.length,
        updated: 0,
        total: ACHIEVEMENTS.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[achievements/seed] Error:", error);

    if (error instanceof Error && error.message.includes("redirect")) {
      // Re-throw redirect errors
      throw error;
    }

    return NextResponse.json(
      {
        error: "Failed to seed achievements",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
