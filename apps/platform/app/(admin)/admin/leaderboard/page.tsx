import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { calculateLevelInfo, formatLevelDisplay, getAllLevels } from "@/src/lib/levels";
import { Trophy, TrendingUp, Award, Star, Flame } from "lucide-react";
import type { Role } from "@prisma/client";

/**
 * Gamification Leaderboard Page
 * - Displays ranked users by XP in their role
 * - Shows level, achievements, and streaks
 * - Celebration styling for top 3
 */

interface UserLeaderboardData {
  rank: number;
  id: string;
  name: string;
  email: string;
  xp: number;
  level: number;
  levelName: string;
  badge: string;
  achievementCount: number;
  medal: string;
  isCurrentUser: boolean;
}

async function getLeaderboardData(
  tenantId: string,
  role: string,
  userId: string,
  timeframe: "all" | "month" = "all"
): Promise<UserLeaderboardData[]> {
  let users = await prisma.user.findMany({
    where: {
      tenantId,
      role: role as Role,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      xp: true,
    },
    orderBy: {
      xp: "desc",
    },
  });

  // Get achievement counts
  const achievementCounts = await Promise.all(
    users.map(async (user) => {
      const count = await prisma.userAchievement.count({
        where: { userId: user.id },
      });
      return { userId: user.id, count };
    })
  );

  const countMap = new Map(achievementCounts.map((a) => [a.userId, a.count]));

  return users.map((user, idx) => {
    const levelInfo = calculateLevelInfo(user.xp);
    const displayInfo = formatLevelDisplay(user.xp);

    let medal = "";
    if (idx === 0) medal = "🥇";
    else if (idx === 1) medal = "🥈";
    else if (idx === 2) medal = "🥉";

    return {
      rank: idx + 1,
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      xp: user.xp,
      level: displayInfo.level,
      levelName: displayInfo.name,
      badge: displayInfo.badge,
      achievementCount: countMap.get(user.id) || 0,
      medal,
      isCurrentUser: user.id === userId,
    };
  });
}

interface LeaderboardPageProps {
  searchParams?: Promise<{
    role?: string;
    timeframe?: "all" | "month";
  }>;
}

export default async function LeaderboardPage(props: LeaderboardPageProps) {
  const session = await getSession();
  const tenantId = session?.tenantId || process.env.DEFAULT_TENANT_ID || "ten_tse";
  const userId = session?.userId || "";
  const resolvedParams = await props.searchParams;
  const role = resolvedParams?.role || session?.role || "HQ";
  const timeframe = (resolvedParams?.timeframe || "all") as "all" | "month";

  if (!session) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-semibold text-red-700">Authentication Required</p>
      </div>
    );
  }

  const leaderboard = await getLeaderboardData(tenantId, role, userId, timeframe);
  const currentUserData = leaderboard.find((u) => u.isCurrentUser);
  const allLevels = getAllLevels();

  // Group by level
  const byLevel = new Map<number, UserLeaderboardData[]>();
  leaderboard.forEach((user) => {
    if (!byLevel.has(user.level)) {
      byLevel.set(user.level, []);
    }
    byLevel.get(user.level)!.push(user);
  });

  const getMedalIcon = (medal: string) => {
    switch (medal) {
      case "🥇":
        return "text-yellow-500";
      case "🥈":
        return "text-gray-400";
      case "🥉":
        return "text-orange-600";
      default:
        return "text-muted-foreground";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "CUSTOMER":
        return "Customers";
      case "CLEANER":
        return "Cleaners";
      case "MANAGER":
        return "Managers";
      case "HQ":
        return "Admins";
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 p-8 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Leaderboard</h1>
            <p className="mt-1 text-brand-100">
              Compete and celebrate excellence in the {getRoleLabel(role)} community
            </p>
          </div>
        </div>
      </div>

      {/* User Stats */}
      {currentUserData && (
        <Card className="border-brand-100 bg-white shadow-sm">
          <CardHeader className="pb-4">
            <h2 className="text-lg font-semibold text-accent">Your Standing</h2>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-brand-50 p-4 text-center">
                <p className="text-3xl font-bold text-brand-600">#{currentUserData.rank}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Your Rank
                </p>
              </div>
              <div className="rounded-lg bg-sunshine/10 p-4 text-center">
                <p className="text-3xl font-bold text-sunshine">{currentUserData.xp}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total XP
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <p className="text-2xl">{currentUserData.badge}</p>
                <p className="mt-1 text-sm font-bold text-accent">Level {currentUserData.level}</p>
                <p className="text-xs text-muted-foreground">{currentUserData.levelName}</p>
              </div>
              <div className="rounded-lg bg-green-50 p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{currentUserData.achievementCount}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Achievements
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Users Leaderboard */}
      <Card className="border-brand-100 bg-white shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-accent">
              <TrendingUp className="h-5 w-5" />
              {getRoleLabel(role)} Rankings
            </h2>
            <span className="text-sm text-muted-foreground">{leaderboard.length} members</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 font-semibold">Rank</th>
                  <th className="pb-3 font-semibold">Member</th>
                  <th className="pb-3 font-semibold">Level</th>
                  <th className="pb-3 text-right font-semibold">XP</th>
                  <th className="pb-3 text-center font-semibold">Achievements</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((user) => {
                  const isCelebrated = user.rank <= 3;
                  const bgClass =
                    user.rank === 1
                      ? "bg-yellow-50"
                      : user.rank === 2
                        ? "bg-gray-50"
                        : user.rank === 3
                          ? "bg-orange-50"
                          : user.isCurrentUser
                            ? "bg-brand-50"
                            : "";

                  return (
                    <tr
                      key={user.id}
                      className={`border-b border-brand-50 transition ${bgClass} ${
                        isCelebrated ? "ring-1 ring-inset ring-yellow-200" : ""
                      } ${user.isCurrentUser ? "font-semibold" : ""}`}
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          {user.medal ? (
                            <span className="text-xl">{user.medal}</span>
                          ) : (
                            <span className="w-6 text-center text-muted-foreground">
                              #{user.rank}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="min-w-0">
                          <p className="font-medium text-accent">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{user.badge}</span>
                          <div className="min-w-0">
                            <p className="font-medium text-accent">Level {user.level}</p>
                            <p className="text-xs text-muted-foreground">{user.levelName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <p className="font-bold text-brand-600">{user.xp}</p>
                      </td>
                      <td className="py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Award className="h-4 w-4 text-sunshine" />
                          <span className="font-semibold">{user.achievementCount}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Level Distribution */}
      <Card className="border-brand-100 bg-white shadow-sm">
        <CardHeader className="pb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-accent">
            <Star className="h-5 w-5" />
            Member Distribution by Level
          </h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from(byLevel.entries())
              .sort(([a], [b]) => b - a)
              .slice(0, 10)
              .map(([level, users]) => {
                const levelInfo = allLevels.find((l) => l.level === level);
                const percentage = Math.round((users.length / leaderboard.length) * 100);

                return (
                  <div key={level} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="text-lg">{levelInfo?.badge}</span>
                        <span>Level {level}: {levelInfo?.name}</span>
                      </div>
                      <span className="text-muted-foreground">{users.length} members</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full bg-gradient-to-r from-brand-400 to-brand-600"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Top Achievements Earners */}
      {leaderboard.slice(0, 5).length > 0 && (
        <Card className="border-brand-100 bg-white shadow-sm">
          <CardHeader className="pb-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-accent">
              <Flame className="h-5 w-5 text-red-500" />
              Top Achievement Hunters
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {leaderboard
                .sort((a, b) => b.achievementCount - a.achievementCount)
                .slice(0, 6)
                .map((user, idx) => (
                  <div
                    key={user.id}
                    className="rounded-lg border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-accent">{user.name}</p>
                        <p className="mt-1 text-2xl font-bold text-sunshine">{user.achievementCount}</p>
                        <p className="text-xs text-muted-foreground">achievements earned</p>
                      </div>
                      <span className="text-2xl">{user.badge}</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
