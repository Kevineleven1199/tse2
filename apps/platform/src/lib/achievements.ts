import { prisma } from "@/lib/prisma";
import { calculateLevelInfo, getXPNeededForNextLevel, formatLevelDisplay } from "./levels";

// Legacy function wrapper for backward compatibility
export function calculateLevel(xp: number): { level: number; title: string; badge: string; xpToNext: number; progress: number } {
  const levelInfo = calculateLevelInfo(xp);
  return {
    level: levelInfo.level,
    title: levelInfo.levelInfo.name,
    badge: levelInfo.levelInfo.badge,
    xpToNext: levelInfo.isMaxLevel ? 0 : Math.max(0, levelInfo.xpNeededForNext),
    progress: levelInfo.progress,
  };
}

export async function awardXp(userId: string, eventType: string, amount: number, relatedId?: string, relatedType?: string) {
  try {
    // Log the event
    await prisma.xpEvent.create({
      data: { userId, eventType, amount, relatedId, relatedType },
    });
    
    // Update user XP
    await prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: amount } },
    });
    
    // Check achievements
    await checkAchievements(userId);
    
    return true;
  } catch (error) {
    console.error("[achievements] Failed to award XP:", error);
    return false;
  }
}

export async function checkAchievements(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, xp: true, tenantId: true },
    });
    if (!user) return;
    
    // Get all achievements for this role
    const achievements = await prisma.achievement.findMany({
      where: {
        active: true,
        OR: [{ roleFilter: user.role }, { roleFilter: "ALL" }],
      },
    });
    
    // Get already unlocked
    const unlocked = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });
    const unlockedIds = new Set(unlocked.map((u) => u.achievementId));
    
    // Check each unearned achievement
    for (const achievement of achievements) {
      if (unlockedIds.has(achievement.id)) continue;
      
      const earned = await evaluateAchievement(userId, user.role, achievement.key);
      if (earned) {
        await prisma.userAchievement.create({
          data: { userId, achievementId: achievement.id, progress: 1, target: 1 },
        });
        // Award XP for the achievement
        await prisma.xpEvent.create({
          data: { userId, eventType: "achievement_unlocked", amount: achievement.xpReward, relatedId: achievement.id, relatedType: "achievement" },
        });
        await prisma.user.update({
          where: { id: userId },
          data: { xp: { increment: achievement.xpReward } },
        });
      }
    }
  } catch (error) {
    console.error("[achievements] Check failed:", error);
  }
}

async function evaluateAchievement(userId: string, role: string, key: string): Promise<boolean> {
  // Achievement evaluation logic based on key
  // This checks current user stats against achievement criteria
  try {
    switch (key) {
      // Cleaner achievements
      case "first_sparkle": {
        const profile = await prisma.cleanerProfile.findUnique({ where: { userId } });
        return profile ? (profile.completedJobs ?? 0) >= 1 : false;
      }
      case "five_star_shine": {
        const profile = await prisma.cleanerProfile.findUnique({ where: { userId } });
        return profile ? (profile.rating ?? 0) >= 5.0 && (profile.completedJobs ?? 0) >= 5 : false;
      }
      case "marathon_cleaner": {
        const profile = await prisma.cleanerProfile.findUnique({ where: { userId } });
        return profile ? (profile.completedJobs ?? 0) >= 50 : false;
      }
      
      // XP-based achievements (work for any role)
      case "xp_century": {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
        return (user?.xp ?? 0) >= 100;
      }
      case "xp_milestone": {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
        return (user?.xp ?? 0) >= 500;
      }
      
      // For most achievements, we return false and they get checked when relevant events trigger
      default:
        return false;
    }
  } catch {
    return false;
  }
}

export async function getUnlockedAchievements(userId: string) {
  return prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
    orderBy: { unlockedAt: "desc" },
  });
}

export async function getAchievementsForRole(role: string) {
  return prisma.achievement.findMany({
    where: {
      active: true,
      OR: [{ roleFilter: role }, { roleFilter: "ALL" }],
    },
    orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
  });
}

export async function getUserAchievementSummary(userId: string, role: string) {
  const [unlocked, allForRole, user] = await Promise.all([
    getUnlockedAchievements(userId),
    getAchievementsForRole(role),
    prisma.user.findUnique({ where: { id: userId }, select: { xp: true } }),
  ]);
  
  const levelInfo = calculateLevel(user?.xp ?? 0);
  const unlockedIds = new Set(unlocked.map((u) => u.achievementId));
  
  return {
    xp: user?.xp ?? 0,
    ...levelInfo,
    unlocked: unlocked.map((u) => ({
      id: u.achievement.id,
      key: u.achievement.key,
      title: u.achievement.title,
      description: u.achievement.description,
      icon: u.achievement.icon,
      unlockedAt: u.unlockedAt,
    })),
    locked: allForRole
      .filter((a) => !unlockedIds.has(a.id))
      .map((a) => ({
        id: a.id,
        key: a.key,
        title: a.title,
        description: a.description,
        icon: a.icon,
        xpReward: a.xpReward,
      })),
    totalAchievements: allForRole.length,
    unlockedCount: unlocked.length,
  };
}
