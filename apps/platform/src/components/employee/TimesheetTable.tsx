"use client";

import { Check, Edit3, Trash2 } from "lucide-react";
import { cn } from "@/src/lib/utils";

type TimesheetEntry = {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  hoursWorked: number | null;
  source: string;
  notes: string | null;
  approved: boolean;
};

type Props = {
  timesheets: TimesheetEntry[];
  isAdmin: boolean;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (entry: TimesheetEntry) => void;
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

export const TimesheetTable = ({
  timesheets,
  isAdmin,
  onApprove,
  onDelete,
  onEdit,
}: Props) => {
  if (timesheets.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-100 px-4 py-8 text-center text-sm text-muted-foreground">
        No timesheet entries for this period. Sync from Jobber or add manual
        entries.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-brand-100 text-left">
            <th className="pb-3 font-semibold text-accent">Date</th>
            <th className="pb-3 font-semibold text-accent">Clock In</th>
            <th className="pb-3 font-semibold text-accent">Clock Out</th>
            <th className="pb-3 font-semibold text-accent text-right">Hours</th>
            <th className="pb-3 font-semibold text-accent">Source</th>
            <th className="pb-3 font-semibold text-accent">Notes</th>
            <th className="pb-3 font-semibold text-accent text-center">
              Status
            </th>
            {isAdmin && (
              <th className="pb-3 font-semibold text-accent text-center">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-50">
          {timesheets.map((t) => (
            <tr key={t.id} className="hover:bg-brand-50/30">
              <td className="py-3 text-accent">{formatDate(t.date)}</td>
              <td className="py-3 text-muted-foreground">
                {formatTime(t.clockIn)}
              </td>
              <td className="py-3 text-muted-foreground">
                {t.clockOut ? formatTime(t.clockOut) : "—"}
              </td>
              <td className="py-3 text-right font-medium text-accent">
                {t.hoursWorked?.toFixed(1) ?? "—"}h
              </td>
              <td className="py-3">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    t.source === "jobber"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-brand-50 text-accent"
                  )}
                >
                  {t.source}
                </span>
              </td>
              <td className="max-w-[150px] truncate py-3 text-xs text-muted-foreground">
                {t.notes || "—"}
              </td>
              <td className="py-3 text-center">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    t.approved
                      ? "bg-green-50 text-green-700"
                      : "bg-yellow-50 text-yellow-700"
                  )}
                >
                  {t.approved ? "Approved" : "Pending"}
                </span>
              </td>
              {isAdmin && (
                <td className="py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {!t.approved && (
                      <button
                        onClick={() => onApprove(t.id)}
                        className="rounded p-1.5 text-green-600 transition hover:bg-green-50"
                        title="Approve"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(t)}
                        className="rounded p-1.5 text-accent transition hover:bg-brand-50"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(t.id)}
                      className="rounded p-1.5 text-red-400 transition hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
