import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/src/lib/auth/cookies";
import { prisma } from "@/lib/prisma";
import { awardXp, checkAchievements } from "@/src/lib/achievements";
import { calculateLevelInfo, formatLevelDisplay } from "@/src/lib/levels";

export const dynamic = "force-dynamic";

/**
 * GET /api/gamification
 * Returns complete gamification data for the current user:
 * - XP and level information
 * - All achievements (locked and unlocked)
 * - Progress toward next level
 * - Recent achievements
 * - Leaderboard position
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.userId;

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        xp: true,
        tenantId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate level info
    const levelInfo = calculateLevelInfo(user.xp);
    const displayInfo = formatLevelDisplay(user.xp);

    // Get all achievements for this role
    const allAchievements = await prisma.achievement.findMany({
      where: {
        tenantId: user.tenantId,
        active: true,
        OR: [{ roleFilter: user.role }, { roleFilter: "ALL" }],
      },
      orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
    });

    // Get unlocked achievements
    const unlockedAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true, unlockedAt: true },
    });

    const unlockedIds = new Set(unlockedAchievements.map((u) => u.achievementId));

    const unlocked = allAchievements.filter((a) => unlockedIds.has(a.id));
    const locked = allAchievements.filter((a) => !unlockedIds.has(a.id));

    // Get recent achievements (last 5)
    const recentAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: "desc" },
      take: 5,
    });

    // Get user's leaderboard position
    const userRank = await prisma.user.count({
      where: {
        tenantId: user.tenantId,
        role: user.role,
        xp: { gt: user.xp },
      },
    });

    // Get top 5 in same role
    const topUsers = await prisma.user.findMany({
      where: {
        tenantId: user.tenantId,
        role: user.role,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        xp: true,
      },
      orderBy: { xp: "desc" },
      take: 5,
    });

    // Calculate medals
    const getMedal = (rank: number) => {
      switch (rank) {
        case 1:
          return "🥇";
        case 2:
          return "🥈";
        case 3:
          return "🥉";
        default:
          return "";
      }
    };

    const leaderboardTop = topUsers.map((u, idx) => {
      const ubLevelInfo = calculateLevelInfo(u.xp);
      return {
        rank: idx + 1,
        name: `${u.firstName} ${u.lastName}`,
        xp: u.xp,
        level: ubLevelInfo.level,
        medal: getMedal(idx + 1),
      };
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
      },
      xp: user.xp,
      level: displayInfo.level,
      levelName: displayInfo.name,
      levelTitle: displayInfo.title,
      badge: displayInfo.badge,
      progress: levelInfo.progress,
      xpInCurrentLevel: levelInfo.xpInCurrentLevel,
      xpNeededForNext: levelInfo.isMaxLevel ? 0 : levelInfo.xpNeededForNext,
      isMaxLevel: levelInfo.isMaxLevel,
      nextLevelName: levelInfo.nextLevel?.name || null,
      nextLevelXpRequired: levelInfo.nextLevel?.xpRequired || null,
      achievements: {
        total: allAchievements.length,
        unlocked: unlocked.length,
        locked: locked.length,
        unlockedList: unlocked.map((a) => ({
          id: a.id,
          key: a.key,
          title: a.title,
          description: a.description,
          icon: a.icon,
          xpReward: a.xpReward,
          category: a.category,
        })),
        lockedList: locked.map((a) => ({
          id: a.id,
          key: a.key,
          title: a.title,
          description: a.description,
          icon: a.icon,
          xpReward: a.xpReward,
          category: a.category,
        })),
      },
      recentAchievements: recentAchievements.map((ua) => ({
        id: ua.achievement.id,
        title: ua.achievement.title,
        icon: ua.achievement.icon,
        xpReward: ua.achievement.xpReward,
        unlockedAt: ua.unlockedAt,
      })),
      leaderboard: {
        userRank: userRank + 1,
        top5: leaderboardTop,
      },
      perks: levelInfo.levelInfo.perks,
    });
  } catch (error) {
    console.error("[gamification API] GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch gamification data" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gamification
 * Award XP for a specific action
 * Request body: { eventType: string, amount?: number, relatedId?: string, relatedType?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { eventType, amount, relatedId, relatedType } = body;

    if (!eventType) {
      return NextResponse.json({ error: "Missing eventType" }, { status: 400 });
    }

    // Default XP amounts for common events
    const defaultXpAmounts: Record<string, number> = {
      booking_created: 10,
      booking_completed: 50,
      job_completed: 75,
      review_submitted: 25,
      referral_confirmed: 100,
      profile_updated: 15,
      login_daily: 5,
    };

    const xpAmount = amount || defaultXpAmounts[eventType] || 10;

    // Award the XP
    const success = await awardXp(
      session.userId,
      eventType,
      xpAmount,
      relatedId,
      relatedType
    );

    if (!success) {
      return NextResponse.json(
        { error: "Failed to award XP" },
        { status: 500 }
      );
    }

    // Get updated user data
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { xp: true },
    });

    const levelInfo = calculateLevelInfo(user?.xp ?? 0);
    const displayInfo = formatLevelDisplay(user?.xp ?? 0);

    return NextResponse.json({
      success: true,
      xpAwarded: xpAmount,
      totalXp: user?.xp,
      level: displayInfo.level,
      levelName: displayInfo.name,
      badge: displayInfo.badge,
      progress: levelInfo.progress,
      leveledUp: levelInfo.nextLevel && user && user.xp >= levelInfo.nextLevel.xpRequired,
      message: `Earned ${xpAmount} XP for ${eventType}`,
    });
  } catch (error) {
    console.error("[gamification API] POST Error:", error);
    return NextResponse.json(
      { error: "Failed to process gamification request" },
      { status: 500 }
    );
  }
}
