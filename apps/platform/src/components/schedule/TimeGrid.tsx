"use client";

import type { CalendarJob } from "./types";
import { JobBlock } from "./JobBlock";

type Props = {
  startHour?: number;
  endHour?: number;
  jobs: CalendarJob[];
  onSlotClick?: (hour: number) => void;
  onJobClick?: (job: CalendarJob) => void;
};

const HOUR_HEIGHT = 60; // px per hour
const HALF_HOUR_HEIGHT = HOUR_HEIGHT / 2;

function getJobPosition(job: CalendarJob, startHour: number): { top: number; height: number } {
  const start = new Date(job.scheduledStartISO);
  const end = new Date(job.scheduledEndISO);

  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const gridStartMinutes = startHour * 60;

  const top = ((startMinutes - gridStartMinutes) / 60) * HOUR_HEIGHT;
  const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, 35);

  return { top, height };
}

export const TimeGrid = ({
  startHour = 7,
  endHour = 19,
  jobs,
  onSlotClick,
  onJobClick,
}: Props) => {
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const totalHeight = hours.length * HOUR_HEIGHT;

  // Current time indicator
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const gridStartMinutes = startHour * 60;
  const gridEndMinutes = endHour * 60;
  const showNowLine = nowMinutes >= gridStartMinutes && nowMinutes <= gridEndMinutes;
  const nowTop = ((nowMinutes - gridStartMinutes) / 60) * HOUR_HEIGHT;

  return (
    <div className="relative select-none" style={{ height: totalHeight }}>
      {/* Grid lines - hour and half-hour intervals */}
      {hours.map((hour) => {
        const hourTop = (hour - startHour) * HOUR_HEIGHT;
        const halfHourTop = hourTop + HALF_HOUR_HEIGHT;

        return (
          <div key={hour}>
            {/* Hour line - stronger */}
            <div
              className="absolute left-0 right-0 border-t border-brand-200"
              style={{ top: hourTop }}
            />

            {/* Half-hour line - subtle */}
            <div
              className="absolute left-0 right-0 border-t border-brand-50"
              style={{ top: halfHourTop }}
            />

            {/* Hour slots - clickable */}
            <button
              type="button"
              className="absolute left-0 right-0 hover:bg-brand-100/40 transition-colors"
              style={{ top: hourTop, height: HOUR_HEIGHT }}
              onClick={() => onSlotClick?.(hour)}
              title={`Click to create job at ${hour}:00`}
            />
          </div>
        );
      })}

      {/* Now indicator - red line with dot */}
      {showNowLine && (
        <div
          className="absolute left-0 right-0 z-30 pointer-events-none"
          style={{ top: nowTop - 1 }}
        >
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500 shadow-lg -ml-1.5" />
            <div className="flex-1 h-1 bg-red-500 shadow-sm" />
          </div>
        </div>
      )}

      {/* Job blocks */}
      {jobs.map((job) => {
        const { top, height } = getJobPosition(job, startHour);

        return (
          <div
            key={job.id}
            className="absolute left-1.5 right-1.5 z-20"
            style={{ top, height }}
          >
            <JobBlock job={job} onClick={onJobClick} />
          </div>
        );
      })}
    </div>
  );
};
