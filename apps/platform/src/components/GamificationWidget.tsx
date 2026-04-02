"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Loader2, Trophy, Lock, Star, TrendingUp, Zap, Award, Target } from "lucide-react";
import Link from "next/link";

interface GamificationData {
  user: {
    id: string;
    name: string;
    role: string;
  };
  xp: number;
  level: number;
  levelName: string;
  levelTitle: string;
  badge: string;
  progress: number;
  xpInCurrentLevel: number;
  xpNeededForNext: number;
  isMaxLevel: boolean;
  nextLevelName?: string;
  achievements: {
    total: number;
    unlocked: number;
    locked: number;
    lockedList: Array<{
      id: string;
      title: string;
      description: string;
      icon: string;
      xpReward: number;
    }>;
  };
  recentAchievements: Array<{
    id: string;
    title: string;
    icon: string;
    xpReward: number;
    unlockedAt: string;
  }>;
  leaderboard: {
    userRank: number;
    top5: Array<{
      rank: number;
      name: string;
      xp: number;
      level: number;
      medal: string;
    }>;
  };
  perks: string[];
}

export function GamificationWidget() {
  const [data, setData] = useState<GamificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandAchievements, setExpandAchievements] = useState(false);

  useEffect(() => {
    fetch("/api/gamification")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="border-brand-100 bg-white shadow-sm">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const topAchievementsToShow = data.recentAchievements.slice(0, 4);
  const nextLockedAchievements = data.achievements.lockedList.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Main Level Card */}
      <Card className="overflow-hidden border-brand-100 bg-gradient-to-br from-brand-50 to-white shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{data.badge}</span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Level {data.level}
                  </p>
                  <h3 className="text-xl font-bold text-accent">{data.levelName}</h3>
                  <p className="text-sm text-muted-foreground">{data.levelTitle}</p>
                </div>
              </div>
            </div>
            <Link
              href="/admin/leaderboard"
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
            >
              Leaderboard
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* XP Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-accent">{data.xp} Total XP</span>
              {!data.isMaxLevel && (
                <span className="text-muted-foreground">
                  {data.xpNeededForNext} XP to Level {data.level + 1}
                </span>
              )}
              {data.isMaxLevel && (
                <span className="font-semibold text-brand-600">Max Level!</span>
              )}
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-brand-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-700"
                style={{ width: `${Math.min(100, data.progress)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {data.xpInCurrentLevel} / {data.xpInCurrentLevel + data.xpNeededForNext} XP in this level
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-white p-3 sm:grid-cols-4">
            <div className="text-center">
              <div className="flex justify-center text-lg text-brand-600">
                <Trophy className="h-5 w-5" />
              </div>
              <p className="mt-1 text-2xl font-bold text-accent">{data.achievements.unlocked}</p>
              <p className="text-xs text-muted-foreground">Achievements</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center text-lg text-sunshine">
                <Zap className="h-5 w-5" />
              </div>
              <p className="mt-1 text-2xl font-bold text-accent">{data.xp}</p>
              <p className="text-xs text-muted-foreground">Total XP</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center text-lg text-brand-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <p className="mt-1 text-2xl font-bold text-accent">#{data.leaderboard.userRank}</p>
              <p className="text-xs text-muted-foreground">Rank</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center text-lg text-brand-600">
                <Award className="h-5 w-5" />
              </div>
              <p className="mt-1 text-2xl font-bold text-accent">
                {data.achievements.unlocked}/{data.achievements.total}
              </p>
              <p className="text-xs text-muted-foreground">Unlocked</p>
            </div>
          </div>

          {/* Perks */}
          {data.perks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Perks
              </p>
              <div className="flex flex-wrap gap-2">
                {data.perks.slice(0, 3).map((perk, idx) => (
                  <div
                    key={idx}
                    className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
                  >
                    ✓ {perk}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Achievements */}
      {topAchievementsToShow.length > 0 && (
        <Card className="border-brand-100 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-accent">
              <Star className="h-4 w-4 text-sunshine" />
              Recent Achievements
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {topAchievementsToShow.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg bg-gradient-to-br from-brand-50 to-brand-100/30 p-3 text-center"
                >
                  <div className="text-2xl">{a.icon}</div>
                  <p className="mt-1 text-xs font-semibold text-accent">{a.title}</p>
                  <p className="text-xs text-muted-foreground">+{a.xpReward} XP</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Preview */}
      {data.leaderboard.top5.length > 0 && (
        <Card className="border-brand-100 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-accent">
                <Trophy className="h-4 w-4" />
                Top Contributors
              </h3>
              <Link
                href="/admin/leaderboard"
                className="text-xs font-semibold text-brand-600 transition hover:text-brand-700"
              >
                View All
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.leaderboard.top5.map((user) => (
                <div
                  key={user.rank}
                  className={`flex items-center gap-3 rounded-lg p-2 ${
                    user.rank === data.leaderboard.userRank
                      ? "bg-brand-50 ring-2 ring-brand-200"
                      : "bg-gray-50"
                  }`}
                >
                  <span className="text-lg font-bold text-muted-foreground">
                    {user.medal || `#${user.rank}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-accent truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground">Level {user.level}</p>
                  </div>
                  <p className="text-sm font-bold text-brand-600">{user.xp} XP</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Achievements */}
      {nextLockedAchievements.length > 0 && (
        <Card className="border-brand-100 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-accent">
              <Target className="h-4 w-4" />
              Next Goals
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {nextLockedAchievements.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg bg-gray-50 p-3"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-200">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-accent">{a.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.description}</p>
                  </div>
                  <span className="flex-shrink-0 text-xs font-bold text-brand-600">+{a.xpReward}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Achievements Link */}
      <Link
        href="/admin/achievements"
        className="block text-center rounded-lg bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-600 transition hover:bg-brand-100"
      >
        View All Achievements ({data.achievements.unlocked}/{data.achievements.total})
      </Link>
    </div>
  );
}
