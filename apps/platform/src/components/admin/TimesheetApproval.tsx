"use client";

import { useState, useTransition } from "react";
import { Check, X, Clock } from "lucide-react";

type TimesheetRow = {
  id: string;
  cleanerName: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  hoursWorked: number | null;
  source: string;
  notes: string | null;
  approved: boolean;
};

export const TimesheetApproval = ({ timesheets: initialTimesheets }: { timesheets: TimesheetRow[] }) => {
  const [timesheets, setTimesheets] = useState(initialTimesheets);
  const [pending, startTransition] = useTransition();

  const handleApprove = (id: string) => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/timesheets/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true }),
      });
      if (res.ok) {
        setTimesheets((prev) => prev.map((t) => (t.id === id ? { ...t, approved: true } : t)));
      }
    });
  };

  const handleReject = (id: string) => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/timesheets/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: false }),
      });
      if (res.ok) {
        setTimesheets((prev) => prev.filter((t) => t.id !== id));
      }
    });
  };

  const pendingTimesheets = timesheets.filter((t) => !t.approved);

  if (pendingTimesheets.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50/30 px-6 py-8 text-center">
        <Check className="h-8 w-8 text-brand-500" />
        <p className="font-medium text-accent">All timesheets approved</p>
        <p className="text-sm text-muted-foreground">No pending timesheets for this period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-amber-500" />
        <h3 className="font-semibold text-accent">
          {pendingTimesheets.length} Timesheet{pendingTimesheets.length !== 1 ? "s" : ""} Pending Approval
        </h3>
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-100 bg-brand-50/50">
              <th className="px-4 py-3 text-left font-semibold text-accent">Cleaner</th>
              <th className="px-4 py-3 text-left font-semibold text-accent">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-accent">Hours</th>
              <th className="px-4 py-3 text-left font-semibold text-accent">Source</th>
              <th className="px-4 py-3 text-left font-semibold text-accent">Notes</th>
              <th className="px-4 py-3 text-right font-semibold text-accent">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingTimesheets.map((ts) => (
              <tr key={ts.id} className="border-b border-brand-100/50 last:border-b-0">
                <td className="px-4 py-3 font-medium text-accent">{ts.cleanerName}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(ts.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </td>
                <td className="px-4 py-3 font-medium text-accent">{ts.hoursWorked?.toFixed(1) ?? "—"}h</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                    {ts.source}
                  </span>
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">{ts.notes ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(ts.id)}
                      disabled={pending}
                      className="rounded-lg bg-green-100 p-2 text-green-700 transition hover:bg-green-200 disabled:opacity-50"
                      title="Approve"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(ts.id)}
                      disabled={pending}
                      className="rounded-lg bg-red-100 p-2 text-red-700 transition hover:bg-red-200 disabled:opacity-50"
                      title="Reject"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
