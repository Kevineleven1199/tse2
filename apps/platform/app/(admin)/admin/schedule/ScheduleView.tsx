"use client";

import { useEffect, useState } from "react";
import { Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { FullCalendar } from "@/src/components/schedule/FullCalendar";
import { CreateJobModal } from "@/src/components/admin/CreateJobModal";
import type { CalendarJob } from "@/src/components/schedule/types";

type ScheduleViewProps = {
  jobs: CalendarJob[];
};

type CalendarStatus = {
  connected: boolean;
  calendarId: string | null;
  serviceAccount?: string;
  error?: string;
};

export const ScheduleView = ({ jobs }: ScheduleViewProps) => {
  const [calStatus, setCalStatus] = useState<CalendarStatus | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/admin/calendar-status")
      .then((r) => r.json())
      .then(setCalStatus)
      .catch(() => setCalStatus({ connected: false, calendarId: null, error: "Failed to check" }));
  }, []);

  const handleJobCreated = () => {
    // Trigger a page-level refresh to pick up new jobs
    setRefreshKey((k) => k + 1);
    window.location.reload();
  };

  // Calculate statistics
  const todayJobs = jobs.filter((j) => {
    const today = new Date().toISOString().split("T")[0];
    return j.date === today;
  }).length;

  const weekJobs = jobs.filter((j) => {
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const jobDate = new Date(j.date);
    return jobDate >= today && jobDate <= weekFromNow;
  }).length;

  const unassignedJobs = jobs.filter((j) => j.cleaner === "Unassigned").length;

  return (
    <div className="space-y-6">
      {/* Google Calendar Sync Status - Subtle */}
      {calStatus && (
        <div className={`rounded-xl border-2 px-4 py-3 transition-all ${
          calStatus.connected
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {calStatus.connected ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Google Calendar Connected</p>
                    {calStatus.serviceAccount && (
                      <p className="text-xs opacity-75">Synced via {calStatus.serviceAccount}</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Calendar Not Connected</p>
                    <p className="text-xs opacity-75">Set GOOGLE_SERVICE_ACCOUNT to enable auto-invites</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Statistics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-brand-100 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today's Jobs</p>
          <p className="mt-2 text-3xl font-bold text-brand-600">{todayJobs}</p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">This Week</p>
          <p className="mt-2 text-3xl font-bold text-brand-600">{weekJobs}</p>
        </div>
        <div className={`rounded-xl border px-4 py-3 shadow-sm ${
          unassignedJobs > 0
            ? "border-amber-200 bg-amber-50"
            : "border-brand-100 bg-white"
        }`}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unassigned</p>
          <p className={`mt-2 text-3xl font-bold ${
            unassignedJobs > 0 ? "text-amber-600" : "text-green-600"
          }`}>
            {unassignedJobs}
          </p>
        </div>
      </div>

      {/* Main Calendar */}
      <FullCalendar key={refreshKey} initialJobs={jobs} />

      {/* Create Job Modal */}
      {showCreateModal && (
        <CreateJobModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleJobCreated}
        />
      )}
    </div>
  );
};
