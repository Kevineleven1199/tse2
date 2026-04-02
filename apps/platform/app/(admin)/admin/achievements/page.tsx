import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Lock, Star, Trophy, Zap } from "lucide-react";

/**
 * Achievements Gallery Page
 * - Shows all achievements available to the user's role
 * - Displays locked/unlocked status with progress
 * - Organized by category
 */

interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  category: string;
  unlocked: boolean;
  unlockedAt?: Date;
}

async function getAchievementsForUser(
  userId: string,
  role: string,
  tenantId: string
): Promise<Achievement[]> {
  // Get all achievements for this role
  const achievements = await prisma.achievement.findMany({
    where: {
      tenantId,
      active: true,
      OR: [{ roleFilter: role }, { roleFilter: "ALL" }],
    },
    orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
  });

  // Get user's unlocked achievements
  const unlockedAchievements = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true, unlockedAt: true },
  });

  const unlockedMap = new Map(
    unlockedAchievements.map((u) => [u.achievementId, u.unlockedAt])
  );

  return achievements.map((a) => ({
    id: a.id,
    key: a.key,
    title: a.title,
    description: a.description,
    icon: a.icon,
    xpReward: a.xpReward,
    category: a.category,
    unlocked: unlockedMap.has(a.id),
    unlockedAt: unlockedMap.get(a.id),
  }));
}

interface AchievementsPageProps {
  searchParams?: Promise<{
    category?: string;
  }>;
}

export default async function AchievementsPage(props: AchievementsPageProps) {
  const session = await getSession();
  const tenantId = session?.tenantId || process.env.DEFAULT_TENANT_ID || "ten_tse";
  const userId = session?.userId || "";
  const role = session?.role || "HQ";
  const resolvedParams = await props.searchParams;
  const filterCategory = resolvedParams?.category || "all";

  if (!session) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-semibold text-red-700">Authentication Required</p>
      </div>
    );
  }

  const allAchievements = await getAchievementsForUser(userId, role, tenantId);

  // Filter by category
  const achievements =
    filterCategory === "all"
      ? allAchievements
      : allAchievements.filter((a) => a.category === filterCategory);

  // Group by category
  const byCategory = new Map<string, Achievement[]>();
  achievements.forEach((a) => {
    if (!byCategory.has(a.category)) {
      byCategory.set(a.category, []);
    }
    byCategory.get(a.category)!.push(a);
  });

  // Sort by unlocked status (unlocked first)
  const sortedCategories: [string, Achievement[]][] = Array.from(byCategory.entries()).map(([cat, achs]) => [
    cat,
    achs.sort((a, b) => (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0)),
  ] as [string, Achievement[]]);

  const categoryIcons: Record<string, string> = {
    milestone: "🎯",
    performance: "⭐",
    engagement: "💚",
    streak: "🔥",
    general: "✨",
  };

  const categoryLabels: Record<string, string> = {
    milestone: "Milestones",
    performance: "Performance",
    engagement: "Engagement",
    streak: "Streaks",
    general: "General",
  };

  const unlockedCount = allAchievements.filter((a) => a.unlocked).length;
  const totalCount = allAchievements.length;
  const completionPercent = Math.round((unlockedCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 p-8 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8" />
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Achievements</h1>
            <p className="mt-1 text-brand-100">
              Unlock achievements and earn rewards by reaching milestones
            </p>
          </div>
          <div className="rounded-lg bg-white/10 backdrop-blur px-6 py-4 text-right">
            <p className="text-3xl font-bold">{completionPercent}%</p>
            <p className="text-sm text-brand-100">
              {unlockedCount} / {totalCount} unlocked
            </p>
          </div>
        </div>
      </div>

      {/* Overall Progress */}
      <Card className="border-brand-100 bg-white shadow-sm">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-accent">Overall Progress</h3>
              <span className="text-sm text-muted-foreground">
                {unlockedCount} / {totalCount}
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-brand-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements by Category */}
      {Array.from(sortedCategories).map(([category, categoryAchievements]) => {
        const categoryKey = category as string;
        const catUnlocked = categoryAchievements.filter((a) => a.unlocked).length;
        const catTotal = categoryAchievements.length;

        return (
          <Card key={category} className="border-brand-100 bg-white shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-3 text-lg font-bold text-accent">
                  <span className="text-2xl">
                    {categoryIcons[categoryKey] || "🏆"}
                  </span>
                  {categoryLabels[categoryKey] || categoryKey}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {catUnlocked} / {catTotal}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categoryAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`rounded-lg border-2 p-4 transition ${
                      achievement.unlocked
                        ? "border-brand-200 bg-gradient-to-br from-brand-50 to-white"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    {/* Header */}
                    <div className="mb-3 flex items-start justify-between">
                      <span
                        className={`text-4xl ${
                          achievement.unlocked ? "" : "opacity-40"
                        }`}
                      >
                        {achievement.icon}
                      </span>
                      {achievement.unlocked ? (
                        <Star className="h-5 w-5 fill-sunshine text-sunshine" />
                      ) : (
                        <Lock className="h-5 w-5 text-gray-400" />
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      className={`font-bold ${
                        achievement.unlocked
                          ? "text-accent"
                          : "text-gray-600"
                      }`}
                    >
                      {achievement.title}
                    </h3>

                    {/* Description */}
                    <p
                      className={`mt-1 text-xs ${
                        achievement.unlocked
                          ? "text-muted-foreground"
                          : "text-gray-500"
                      }`}
                    >
                      {achievement.description}
                    </p>

                    {/* XP Reward & Status */}
                    <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-3">
                      <div className="flex items-center gap-1 text-sm font-bold text-brand-600">
                        <Zap className="h-4 w-4" />
                        +{achievement.xpReward} XP
                      </div>
                      {achievement.unlocked && achievement.unlockedAt && (
                        <span className="text-xs text-muted-foreground">
                          {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                          }).format(new Date(achievement.unlockedAt))}
                        </span>
                      )}
                      {!achievement.unlocked && (
                        <span className="text-xs font-semibold text-gray-500">
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Empty State */}
      {achievements.length === 0 && (
        <Card className="border-dashed border-brand-300 bg-brand-50">
          <CardContent className="py-12 text-center">
            <p className="font-semibold text-muted-foreground">
              No achievements found for this category
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try selecting a different category or check back soon
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
