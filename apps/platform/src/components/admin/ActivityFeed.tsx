"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import type { Activity, ActivityType, ActorType } from "@/src/lib/activity-tracking";
import { ACTIVITY_CONFIG, formatActivityTime } from "@/src/lib/activity-tracking";

const TARGET_ROUTES: Record<string, string> = {
  invoice: "/admin/requests",
  quote: "/admin/requests",
  request: "/admin/requests",
  job: "/admin/pipeline",
  cleaner: "/admin/team",
  customer: "/admin/requests",
};

type ActivityFeedProps = {
  activities: Activity[];
  title?: string;
  showFilters?: boolean;
  maxItems?: number;
  compact?: boolean;
};

const ACTOR_TYPE_LABELS: Record<ActorType, { label: string; color: string }> = {
  customer: { label: "Customer", color: "bg-blue-100 text-blue-700" },
  cleaner: { label: "Cleaner", color: "bg-green-100 text-green-700" },
  admin: { label: "Admin", color: "bg-purple-100 text-purple-700" },
  manager: { label: "Manager", color: "bg-orange-100 text-orange-700" },
  system: { label: "System", color: "bg-gray-100 text-gray-700" }
};

const ACTIVITY_TYPE_FILTERS: { value: ActivityType | "all"; label: string }[] = [
  { value: "all", label: "All Activity" },
  { value: "invoice_viewed", label: "Invoice Views" },
  { value: "invoice_paid", label: "Payments" },
  { value: "quote_viewed", label: "Quote Views" },
  { value: "quote_accepted", label: "Quote Accepted" },
  { value: "email_opened", label: "Email Opens" },
  { value: "portal_login", label: "Logins" },
  { value: "sms_replied", label: "SMS Replies" }
];

export const ActivityFeed = ({ 
  activities, 
  title = "Activity Feed",
  showFilters = true,
  maxItems,
  compact = false
}: ActivityFeedProps) => {
  const [actorFilter, setActorFilter] = useState<ActorType | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all");

  // Apply filters
  let filteredActivities = activities;
  
  if (actorFilter !== "all") {
    filteredActivities = filteredActivities.filter(a => a.actorType === actorFilter);
  }
  
  if (typeFilter !== "all") {
    filteredActivities = filteredActivities.filter(a => a.type === typeFilter);
  }
  
  if (maxItems) {
    filteredActivities = filteredActivities.slice(0, maxItems);
  }

  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-accent">{title}</h2>
          {activities.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {filteredActivities.length} activities
            </span>
          )}
        </div>
        
        {showFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            {/* Actor Type Filter */}
            <select
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value as ActorType | "all")}
              className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm text-accent focus:border-brand-500 focus:outline-none"
            >
              <option value="all">All Users</option>
              <option value="customer">Customers</option>
              <option value="cleaner">Cleaners</option>
              <option value="admin">Admins</option>
            </select>
            
            {/* Activity Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ActivityType | "all")}
              className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm text-accent focus:border-brand-500 focus:outline-none"
            >
              {ACTIVITY_TYPE_FILTERS.map(filter => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {filteredActivities.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-4xl">📭</p>
            <p className="mt-2 text-sm text-muted-foreground">No activity to show</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredActivities.map((activity, index) => (
              <ActivityItem 
                key={activity.id} 
                activity={activity} 
                compact={compact}
                isLast={index === filteredActivities.length - 1}
              />
            ))}
          </div>
        )}
        
        {maxItems && activities.length > maxItems && (
          <Link
            href="/admin/activity"
            className="mt-4 block text-center text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            View all activity →
          </Link>
        )}
      </CardContent>
    </Card>
  );
};

type ActivityItemProps = {
  activity: Activity;
  compact?: boolean;
  isLast?: boolean;
};

const ActivityItem = ({ activity, compact = false, isLast = false }: ActivityItemProps) => {
  const config = ACTIVITY_CONFIG[activity.type];
  const actorConfig = ACTOR_TYPE_LABELS[activity.actorType];
  
  if (compact) {
    return (
      <div className={`flex items-center gap-3 py-2 ${!isLast ? "border-b border-brand-50" : ""}`}>
        <span className="text-lg">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-accent truncate">
            {config.description(activity)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatActivityTime(activity.timestamp)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 py-3 ${!isLast ? "border-b border-brand-50" : ""}`}>
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-lg">
          {config.icon}
        </div>
        {!isLast && <div className="mt-2 h-full w-px bg-brand-100" />}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-accent">
              {config.description(activity)}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actorConfig.color}`}>
                {actorConfig.label}
              </span>
              {activity.device && (
                <span className="text-xs text-muted-foreground">
                  {activity.device === "mobile" ? "📱" : activity.device === "tablet" ? "📱" : "💻"} {activity.device}
                </span>
              )}
              {activity.location && (
                <span className="text-xs text-muted-foreground">
                  📍 {activity.location}
                </span>
              )}
            </div>
          </div>
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {formatActivityTime(activity.timestamp)}
          </span>
        </div>
        
        {/* Target link */}
        {activity.targetId && activity.targetLabel && (
          <Link
            href={TARGET_ROUTES[activity.targetType ?? ""] ?? "/admin/pipeline"}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            View {activity.targetLabel} →
          </Link>
        )}
      </div>
    </div>
  );
};

// Compact inline activity indicator (for use in invoice/quote detail pages)
type ActivityIndicatorProps = {
  activities: Activity[];
  entityType: string;
};

export const ActivityIndicator = ({ activities, entityType }: ActivityIndicatorProps) => {
  const viewActivity = activities.find(a => 
    a.type === "invoice_viewed" || 
    a.type === "quote_viewed" || 
    a.type === "job_details_viewed"
  );
  
  if (!viewActivity) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-gray-300" />
        Not yet viewed
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-600">
      <span className="h-2 w-2 rounded-full bg-green-500" />
      Viewed in Client Hub • {formatActivityTime(viewActivity.timestamp)}
    </span>
  );
};

// Activity summary stats component
type ActivityStatsProps = {
  stats: {
    totalViews: number;
    uniqueViewers: number;
    lastViewedAt?: Date;
    emailOpens: number;
    portalLogins: number;
  };
};

export const ActivityStats = ({ stats }: ActivityStatsProps) => {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-xl bg-blue-50 p-3 text-center">
        <p className="text-2xl font-bold text-blue-600">{stats.totalViews}</p>
        <p className="text-xs text-blue-600/70">Total Views</p>
      </div>
      <div className="rounded-xl bg-green-50 p-3 text-center">
        <p className="text-2xl font-bold text-green-600">{stats.portalLogins}</p>
        <p className="text-xs text-green-600/70">Portal Logins</p>
      </div>
      <div className="rounded-xl bg-purple-50 p-3 text-center">
        <p className="text-2xl font-bold text-purple-600">{stats.emailOpens}</p>
        <p className="text-xs text-purple-600/70">Email Opens</p>
      </div>
      <div className="rounded-xl bg-orange-50 p-3 text-center">
        <p className="text-2xl font-bold text-orange-600">{stats.uniqueViewers}</p>
        <p className="text-xs text-orange-600/70">Unique Users</p>
      </div>
    </div>
  );
};
