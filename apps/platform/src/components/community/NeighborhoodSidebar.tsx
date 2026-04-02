"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import type { NeighborhoodStats, CleanerSpotlight } from "@/src/lib/community";
import { formatRelativeTime } from "@/src/lib/community";

type NeighborhoodSidebarProps = {
  stats: NeighborhoodStats;
  spotlight?: CleanerSpotlight;
};

export const NeighborhoodSidebar = ({ stats, spotlight }: NeighborhoodSidebarProps) => {
  const ACTIVITY_ICONS = {
    post: "📝",
    comment: "💬",
    reaction: "❤️",
    new_member: "👋"
  };

  return (
    <div className="space-y-4">
      {/* Neighborhood Stats */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">📍</span>
            <div>
              <h2 className="font-semibold text-accent">{stats.neighborhood}</h2>
              {stats.city && <p className="text-xs text-muted-foreground">{stats.city}</p>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-brand-50 p-2">
              <p className="text-lg font-bold text-brand-600">{stats.totalMembers}</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
            <div className="rounded-xl bg-green-50 p-2">
              <p className="text-lg font-bold text-green-600">{stats.activeCleaners}</p>
              <p className="text-xs text-muted-foreground">Cleaners</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-2">
              <p className="text-lg font-bold text-blue-600">{stats.postsThisMonth}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cleaner Spotlight */}
      {spotlight && (
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <h2 className="font-semibold text-accent">Cleaner Spotlight</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-yellow-200 flex items-center justify-center text-2xl font-bold text-yellow-700">
                {spotlight.cleanerAvatar ? (
                  <Image
                    src={spotlight.cleanerAvatar}
                    alt={spotlight.cleanerName}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  spotlight.cleanerName.charAt(0)
                )}
              </div>
              <div>
                <p className="font-semibold text-accent">{spotlight.cleanerName}</p>
                <p className="text-xs text-muted-foreground">{spotlight.title}</p>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="text-yellow-600">⭐ {spotlight.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{spotlight.totalJobs} jobs</span>
                </div>
              </div>
            </div>
            
            <div className="mt-3 flex flex-wrap gap-1">
              {spotlight.specialties.map((specialty) => (
                <span 
                  key={specialty}
                  className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700"
                >
                  {specialty}
                </span>
              ))}
            </div>

            <p className="mt-3 text-xs italic text-yellow-700/70">
              {spotlight.story}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Top Contributors */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <h2 className="font-semibold text-accent">🏆 Top Contributors</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.topContributors.map((contributor, index) => (
              <div key={contributor.id} className="flex items-center gap-3">
                <span className="text-lg font-bold text-muted-foreground">
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                </span>
                <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-semibold text-brand-600">
                  {contributor.avatar ? (
                    <Image
                      src={contributor.avatar}
                      alt={contributor.name}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    contributor.name.charAt(0)
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-accent">{contributor.name}</p>
                  <p className="text-xs text-muted-foreground">{contributor.postCount} posts</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Popular Topics */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <h2 className="font-semibold text-accent">🔥 Trending Topics</h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stats.popularTopics.map((topic) => (
              <Link
                key={topic.tag}
                href={`/community?tag=${topic.tag}`}
                className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-600 transition hover:bg-brand-100"
              >
                #{topic.tag} <span className="text-xs text-muted-foreground">({topic.count})</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <h2 className="font-semibold text-accent">📊 Recent Activity</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <span>{ACTIVITY_ICONS[activity.type]}</span>
                <div className="flex-1">
                  <p className="text-muted-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground/70">{formatRelativeTime(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
