"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Loader2, Trophy, Lock, Star } from "lucide-react";

interface AchievementData {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  xpReward?: number;
}

interface AchievementSummary {
  xp: number;
  level: number;
  title: string;
  badge: string;
  xpToNext: number;
  progress: number;
  unlocked: AchievementData[];
  locked: AchievementData[];
  totalAchievements: number;
  unlockedCount: number;
}

export function AchievementsCard() {
  const [data, setData] = useState<AchievementSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/achievements")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-accent">Your Progress</h2>
          <span className="text-2xl">{data.badge}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Level & XP */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2 text-white shadow-md">
            <span className="text-xl">{data.badge}</span>
            <span className="font-bold">Level {data.level}</span>
          </div>
          <p className="mt-2 text-lg font-semibold text-accent">{data.title}</p>
          <p className="text-sm text-muted-foreground">{data.xp} XP total</p>
        </div>

        {/* XP Bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{data.xpToNext > 0 ? `${data.xpToNext} XP to Level ${data.level + 1}` : "Max Level!"}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-brand-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-700"
              style={{ width: `${data.progress}%` }}
            />
          </div>
        </div>

        {/* Achievement Stats */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <Trophy className="h-4 w-4 text-sunshine" />
          <span className="font-semibold text-accent">
            {data.unlockedCount} / {data.totalAchievements}
          </span>
          <span className="text-muted-foreground">achievements earned</span>
        </div>

        {/* Unlocked Achievements */}
        {data.unlocked.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Earned</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {data.unlocked.slice(0, 6).map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-b from-brand-50 to-white p-3 text-center shadow-sm border border-brand-100/50"
                >
                  <span className="text-2xl">{a.icon}</span>
                  <span className="text-xs font-semibold text-accent leading-tight">{a.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Locked Achievements */}
        {data.locked.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Up Next</p>
            <div className="space-y-2">
              {data.locked.slice(0, 3).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl bg-gray-50 p-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-lg opacity-50">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-600">{a.title}</p>
                    <p className="text-xs text-gray-400 truncate">{a.description}</p>
                  </div>
                  <span className="text-xs font-medium text-brand-500">+{a.xpReward} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
