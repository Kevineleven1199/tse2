"use client";

import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import type { CleanerStats } from "@/src/lib/cleaner-portal";

type LevelCardProps = {
  stats: CleanerStats;
};

export const LevelCard = ({ stats }: LevelCardProps) => {
  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-accent">Your Level</h2>
          <span className="text-2xl">{stats.levelBadge}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Level Display */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-2 text-white">
            <span className="text-2xl">{stats.levelBadge}</span>
            <span className="text-lg font-bold">Level {stats.level}</span>
          </div>
          <p className="mt-2 text-xl font-semibold text-accent">{stats.levelTitle}</p>
        </div>

        {/* Jobs to Next Level */}
        {stats.jobsToNextLevel > 0 && (
          <div className="rounded-xl bg-brand-50 p-3 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-accent">{stats.jobsToNextLevel}</span> more jobs to reach{" "}
              <span className="font-semibold text-brand-600">Level {stats.level + 1}</span>
            </p>
          </div>
        )}

        {/* Real Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-brand-50 p-3 text-center">
            <p className="text-2xl font-bold text-accent">{stats.completedJobs}</p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Jobs Done</p>
          </div>
          <div className="rounded-xl bg-brand-50 p-3 text-center">
            <p className="text-2xl font-bold text-accent">⭐ {stats.rating.toFixed(1)}</p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Rating</p>
          </div>
          <div className="rounded-xl bg-brand-50 p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.onTimeRate}%</p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">On-Time</p>
          </div>
          <div className="rounded-xl bg-brand-50 p-3 text-center">
            <p className="text-2xl font-bold text-brand-600">{stats.repeatClientRate}%</p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Repeat Clients</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
