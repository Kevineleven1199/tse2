"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import type { AlertItem } from "@/src/lib/admin-portal";

/**
 * AlertsCard - Available to ADMIN and MANAGER
 * Shows actionable alerts and notifications
 */

type AlertsCardProps = {
  alerts: AlertItem[];
};

const ALERT_STYLES = {
  warning: { bg: "bg-amber-50", border: "border-amber-200", icon: "⚠️", text: "text-amber-800" },
  error: { bg: "bg-red-50", border: "border-red-200", icon: "🚨", text: "text-red-800" },
  info: { bg: "bg-blue-50", border: "border-blue-200", icon: "ℹ️", text: "text-blue-800" },
  success: { bg: "bg-green-50", border: "border-green-200", icon: "✅", text: "text-green-800" }
};

export const AlertsCard = ({ alerts }: AlertsCardProps) => {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(date));
  };

  return (
    <Card className="rounded-2xl bg-white shadow-sm card-hover">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-accent">Alerts</h2>
          {alerts.length > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              {alerts.length}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-2xl">✨</p>
            <p className="mt-2 text-sm text-muted-foreground">All clear! No alerts.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => {
              const style = ALERT_STYLES[alert.type];
              return (
                <div
                  key={alert.id}
                  className={`rounded-2xl border p-4 ${style.bg} ${style.border} shadow-xs`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{style.icon}</span>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${style.text}`}>{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{formatTime(alert.createdAt)}</span>
                        {alert.actionUrl && (
                          <Link 
                            href={alert.actionUrl}
                            className={`text-xs font-semibold ${style.text} hover:underline`}
                          >
                            View →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
