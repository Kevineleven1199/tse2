"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, User } from "lucide-react";
import type { CalendarJob } from "./types";

type Props = {
  job: CalendarJob;
  onClick?: (job: CalendarJob) => void;
  compact?: boolean;
};

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  PENDING: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-900",
    dot: "bg-amber-500",
  },
  CLAIMED: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-900",
    dot: "bg-blue-500",
  },
  SCHEDULED: {
    bg: "bg-green-50",
    border: "border-green-300",
    text: "text-green-900",
    dot: "bg-green-500",
  },
  COMPLETED: {
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    text: "text-emerald-900",
    dot: "bg-emerald-500",
  },
  CANCELED: {
    bg: "bg-gray-50",
    border: "border-gray-300",
    text: "text-gray-600",
    dot: "bg-gray-400",
  },
};

export const JobBlock = ({ job, onClick, compact }: Props) => {
  const [showHover, setShowHover] = useState(false);
  const colors = STATUS_COLORS[job.status] || STATUS_COLORS.PENDING;

  const handleClick = (e: React.MouseEvent) => {
    if (job.customerId && e.target instanceof HTMLElement && e.target.closest("a")) {
      return;
    }
    onClick?.(job);
  };

  return (
    <div
      onMouseEnter={() => setShowHover(true)}
      onMouseLeave={() => setShowHover(false)}
      onClick={handleClick}
      className={`w-full h-full text-left rounded-lg border-2 px-2.5 py-2 transition-all duration-200 cursor-pointer group relative overflow-hidden ${
        colors.bg
      } ${colors.border} ${colors.text} hover:shadow-lg hover:scale-105`}
    >
      {/* Status dot indicator */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors.dot}`} />

      <div className="ml-0.5">
        {/* Customer name - bold */}
        <div className="font-bold text-[11px] truncate leading-tight">
          {job.customerId ? (
            <Link
              href={`/admin/customers/${job.customerId}`}
              className="underline hover:opacity-75 truncate block w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {job.customer}
            </Link>
          ) : (
            <p className="truncate">{job.customer}</p>
          )}
        </div>

        {!compact && (
          <>
            {/* Service - smaller */}
            <p className="truncate opacity-85 text-[10px] mt-0.5">
              {job.service.replace(/_/g, " ")}
            </p>

            {/* Time */}
            <p className="truncate opacity-75 text-[10px] mt-1 font-medium">
              {job.startTime} - {job.endTime}
            </p>

            {/* Cleaner if assigned */}
            {job.cleaner && job.cleaner !== "Unassigned" && (
              <div className="flex items-center gap-1 mt-1 text-[10px]">
                <User className="h-3 w-3 opacity-60" />
                <span className="truncate opacity-80">{job.cleaner}</span>
              </div>
            )}

            {/* Address if available - shown on hover */}
            {job.address && showHover && (
              <div className="flex items-center gap-1 mt-1 text-[9px] opacity-75">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{job.address}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Hover overlay with action hint */}
      {showHover && (
        <div className="absolute inset-0 flex items-center justify-end pr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ChevronRight className="h-4 w-4 opacity-50" />
        </div>
      )}
    </div>
  );
};
