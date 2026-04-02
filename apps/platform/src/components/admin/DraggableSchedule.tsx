'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Card } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';

interface Job {
  id: string;
  serviceRequestId: string;
  scheduledDate?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  customerName: string;
  serviceType: string;
  cleanerName?: string;
  assignments: Array<{
    cleaner: {
      user: {
        firstName: string;
        lastName: string;
      };
    };
  }>;
}

interface DraggableScheduleProps {
  jobs: Job[];
  onReschedule?: (jobId: string, newDate: string, newStart?: string, newEnd?: string) => Promise<void>;
  weeksAhead?: number;
}

const DraggableSchedule: React.FC<DraggableScheduleProps> = ({
  jobs,
  onReschedule,
  weeksAhead = 4,
}) => {
  const [draggedJob, setDraggedJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate week dates
  const weeks = useMemo(() => {
    const weeks = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < weeksAhead; i++) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start on Sunday
      weekStart.setDate(weekStart.getDate() + i * 7);

      const week = [];
      for (let j = 0; j < 7; j++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + j);
        week.push(new Date(date));
      }
      weeks.push(week);
    }
    return weeks;
  }, [weeksAhead]);

  // Organize jobs by date
  const jobsByDate = useMemo(() => {
    const organized: Record<string, Job[]> = {};
    jobs.forEach((job) => {
      if (job.scheduledDate) {
        const dateKey = new Date(job.scheduledDate).toISOString().split('T')[0];
        if (!organized[dateKey]) {
          organized[dateKey] = [];
        }
        organized[dateKey].push(job);
      }
    });
    return organized;
  }, [jobs]);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const formatTime = (date?: string) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getCleanerName = (job: Job): string => {
    if (job.assignments && job.assignments.length > 0) {
      const first = job.assignments[0].cleaner.user;
      return `${first.firstName} ${first.lastName}`;
    }
    return 'Unassigned';
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, job: Job) => {
    setDraggedJob(job);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, date: Date) => {
    e.preventDefault();
    if (!draggedJob || !onReschedule) return;

    const newDate = formatDate(date);
    const oldDate = draggedJob.scheduledDate
      ? formatDate(new Date(draggedJob.scheduledDate))
      : null;

    if (newDate === oldDate) {
      setDraggedJob(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await onReschedule(
        draggedJob.serviceRequestId,
        new Date(date).toISOString(),
        draggedJob.scheduledStartTime,
        draggedJob.scheduledEndTime
      );
    } catch (error) {
      console.error('Failed to reschedule job:', error);
      setError('Failed to reschedule job. Please try again.');
    } finally {
      setIsLoading(false);
      setDraggedJob(null);
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="w-full space-y-6">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
      
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">
            Week of {new Date(week[0]).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </h3>

          <div className="grid grid-cols-7 gap-2">
            {week.map((date, dayIndex) => {
              const dateKey = formatDate(date);
              const dayJobs = jobsByDate[dateKey] || [];
              const isToday = new Date().toISOString().split('T')[0] === dateKey;

              return (
                <div
                  key={dayIndex}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, date)}
                  className={`min-h-32 rounded-lg border-2 border-dashed p-2 ${
                    isToday
                      ? 'border-brand-600 bg-brand-50'
                      : draggedJob
                        ? 'border-gray-400 bg-gray-50 hover:bg-gray-100'
                        : 'border-gray-200 bg-white'
                  } transition-colors`}
                >
                  <div className="mb-2 text-center">
                    <p className="text-xs font-semibold text-gray-900">
                      {dayNames[date.getDay()]}
                    </p>
                    <p className="text-sm text-gray-600">{date.getDate()}</p>
                  </div>

                  <div className="space-y-1">
                    {dayJobs.map((job) => (
                      <div
                        key={job.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, job)}
                        className="cursor-move rounded bg-brand-600 p-2 text-xs text-white shadow hover:shadow-md hover:opacity-90 transition-all"
                      >
                        <p className="font-semibold line-clamp-1">
                          {job.customerName}
                        </p>
                        <p className="text-xs opacity-90 line-clamp-1">
                          {job.serviceType.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs opacity-75 line-clamp-1">
                          {getCleanerName(job)}
                        </p>
                        {job.scheduledStartTime && (
                          <p className="text-xs opacity-75">
                            {formatTime(job.scheduledStartTime)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <Card className="p-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"></div>
              <p className="text-sm font-medium text-gray-900">
                Rescheduling job...
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DraggableSchedule;
