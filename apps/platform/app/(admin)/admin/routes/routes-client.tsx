"use client";

import { useState, useCallback, useMemo } from "react";
import {
  MapPin,
  Navigation,
  Clock,
  User,
  Truck,
  Plus,
  ArrowUpDown,
  Download,
  Route,
  Calendar,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";

interface Job {
  id: string;
  customerName: string;
  address: string;
  addressLine1: string;
  city: string;
  state: string;
  serviceType: string;
  lat: number | null;
  lng: number | null;
  status: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  estimatedDuration: number;
  assignedCleanerId: string | null;
}

interface Cleaner {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  active: boolean;
}

interface RoutesClientProps {
  jobs: Job[];
  cleaners: Cleaner[];
}

interface OptimizedJob {
  id: string;
  sequence: number;
  location: { lat: number; lng: number };
  estimatedDriveTimeMinutes: number;
  cumulativeDistanceMiles: number;
}

export function RoutesClient({ jobs, cleaners }: RoutesClientProps) {
  const [selectedCleanerId, setSelectedCleanerId] = useState<string | null>(
    cleaners.length > 0 ? cleaners[0].id : null
  );
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedJob[] | null>(null);
  const [showUnassigned, setShowUnassigned] = useState(false);

  // Filter jobs for selected cleaner
  const selectedCleanerJobs = useMemo(() => {
    if (!selectedCleanerId) return [];
    return jobs.filter((job) => job.assignedCleanerId === selectedCleanerId);
  }, [jobs, selectedCleanerId]);

  // Get unassigned jobs
  const unassignedJobs = useMemo(() => {
    return jobs.filter((job) => !job.assignedCleanerId);
  }, [jobs]);

  // Calculate route summary
  const routeSummary = useMemo(() => {
    const jobsToSummarize = optimizedRoute
      ? optimizedRoute.map((opt) => jobs.find((j) => j.id === opt.id))
      : selectedCleanerJobs;

    const validJobs = jobsToSummarize.filter(Boolean) as Job[];

    let totalServiceTime = 0;
    let totalDriveTime = 0;
    let totalDistance = 0;

    if (optimizedRoute) {
      totalServiceTime = validJobs.reduce((sum, job) => sum + job.estimatedDuration, 0);
      totalDriveTime = optimizedRoute[optimizedRoute.length - 1]?.estimatedDriveTimeMinutes || 0;
      totalDistance = optimizedRoute[optimizedRoute.length - 1]?.cumulativeDistanceMiles || 0;
    } else {
      totalServiceTime = validJobs.reduce((sum, job) => sum + job.estimatedDuration, 0);
    }

    return {
      stops: validJobs.length,
      serviceTime: totalServiceTime,
      driveTime: totalDriveTime,
      distance: totalDistance,
    };
  }, [selectedCleanerJobs, optimizedRoute, jobs]);

  // Optimize route
  const handleOptimizeRoute = useCallback(async () => {
    if (selectedCleanerJobs.length === 0) {
      alert("No jobs assigned to this cleaner");
      return;
    }

    // Check if all jobs have coordinates
    const jobsWithCoords = selectedCleanerJobs.filter((j) => j.lat && j.lng);
    if (jobsWithCoords.length === 0) {
      alert("No jobs have location coordinates. Please ensure addresses have been geocoded.");
      return;
    }

    if (jobsWithCoords.length < selectedCleanerJobs.length) {
      const response = confirm(
        `Only ${jobsWithCoords.length} of ${selectedCleanerJobs.length} jobs have coordinates. Continue with optimization?`
      );
      if (!response) return;
    }

    setIsOptimizing(true);

    try {
      const response = await fetch("/api/admin/route-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobIds: jobsWithCoords.map((j) => j.id),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to optimize route");
      }

      const data = await response.json();
      setOptimizedRoute(data.optimizedRoute);
    } catch (error) {
      console.error("Route optimization error:", error);
      alert(`Optimization failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsOptimizing(false);
    }
  }, [selectedCleanerJobs]);

  // Export route
  const handleExportRoute = useCallback(() => {
    if (selectedCleanerJobs.length === 0) {
      alert("No jobs to export");
      return;
    }

    const selectedCleaner = cleaners.find((c) => c.id === selectedCleanerId);
    if (!selectedCleaner) return;

    const routeData = {
      cleaner: selectedCleaner.name,
      date: selectedDate,
      jobs: optimizedRoute
        ? optimizedRoute.map((opt) => {
            const job = jobs.find((j) => j.id === opt.id);
            return {
              sequence: opt.sequence,
              customer: job?.customerName,
              address: job?.address,
              service: job?.serviceType,
              duration: job?.estimatedDuration,
              driveTime: opt.estimatedDriveTimeMinutes,
            };
          })
        : selectedCleanerJobs.map((job, idx) => ({
            sequence: idx + 1,
            customer: job.customerName,
            address: job.address,
            service: job.serviceType,
            duration: job.estimatedDuration,
          })),
      summary: routeSummary,
    };

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(JSON.stringify(routeData, null, 2))
    );
    element.setAttribute("download", `route-${selectedCleaner.name}-${selectedDate}.json`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }, [selectedCleanerJobs, selectedCleanerId, selectedDate, optimizedRoute, jobs, cleaners, routeSummary]);

  // Get display jobs (optimized or current order)
  const displayJobs = optimizedRoute
    ? optimizedRoute
        .map((opt) => jobs.find((j) => j.id === opt.id))
        .filter(Boolean)
        .map((job, idx) => ({
          job: job as Job,
          sequence: idx + 1,
        }))
    : selectedCleanerJobs.map((job, idx) => ({
        job,
        sequence: idx + 1,
      }));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-200">
            Optimization & Planning
          </p>
          <h1 className="text-2xl font-semibold">Route Optimization</h1>
          <p className="text-sm text-blue-100">
            Plan and optimize daily cleaning routes for your team
          </p>
        </div>

        {/* Date Selector */}
        <div className="mt-4 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded bg-blue-500 px-3 py-1 text-sm text-white placeholder-blue-200 outline-none focus:bg-blue-400"
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Cleaner Selector & Route List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cleaner Tabs */}
          <Card className="border border-brand-100 bg-white shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Assign Cleaner</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                  {cleaners.map((cleaner) => {
                    const cleanerJobCount = jobs.filter(
                      (j) => j.assignedCleanerId === cleaner.id
                    ).length;
                    return (
                      <button key={cleaner.id} onClick={() => setSelectedCleanerId(cleaner.id)}
                        className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                          selectedCleanerId === cleaner.id
                            ? "bg-blue-600 text-white shadow"
                            : "bg-white border border-brand-200 text-brand-700 hover:bg-blue-50"
                        }`}>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{cleaner.firstName}</span>
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                            selectedCleanerId === cleaner.id
                              ? "bg-blue-400/30 text-white"
                              : "bg-blue-100 text-blue-700"
                          }`}>
                            {cleanerJobCount}
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Route List */}
          <Card className="border border-brand-100 bg-white shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Route for {cleaners.find((c) => c.id === selectedCleanerId)?.name || "Select Cleaner"}
              </CardTitle>
              <span className="text-xs font-semibold text-muted-foreground">
                {displayJobs.length} stop{displayJobs.length !== 1 ? "s" : ""}
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              {displayJobs.length === 0 ? (
                <div className="py-8 text-center">
                  <Truck className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No jobs assigned to this cleaner
                  </p>
                </div>
              ) : (
                displayJobs.map((item, idx) => (
                  <div
                    key={item.job.id}
                    className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 transition-colors"
                  >
                    {/* Sequence Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                          {item.sequence}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">
                            {item.job.customerName}
                          </h3>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {item.job.serviceType}
                          </p>
                        </div>
                      </div>
                      <GripVertical className="h-4 w-4 text-gray-300" />
                    </div>

                    {/* Address */}
                    <div className="mb-3 pl-9 flex gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-700">{item.job.address}</p>
                      </div>
                    </div>

                    {/* Time & Duration */}
                    <div className="mb-0 pl-9 flex gap-4 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{item.job.estimatedDuration} min</span>
                      </div>
                      {optimizedRoute && idx < displayJobs.length - 1 && (
                        <div className="flex items-center gap-1">
                          <Navigation className="h-4 w-4 text-gray-400" />
                          <span>{optimizedRoute[idx]?.estimatedDriveTimeMinutes || 0} min drive</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Summary & Actions */}
        <div className="space-y-6">
          {/* Route Summary */}
          <Card className="border border-brand-100 bg-white shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Route Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Total Stops</p>
                <p className="text-2xl font-bold text-gray-900">{routeSummary.stops}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Service Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.floor(routeSummary.serviceTime / 60)}h{" "}
                  {routeSummary.serviceTime % 60}m
                </p>
              </div>
              {optimizedRoute && (
                <>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Drive Time</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.floor(routeSummary.driveTime / 60)}h{" "}
                      {routeSummary.driveTime % 60}m
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">Total Distance</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {routeSummary.distance.toFixed(1)} mi
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border border-brand-100 bg-white shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={handleOptimizeRoute}
                disabled={isOptimizing || selectedCleanerJobs.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                {isOptimizing ? "Optimizing..." : "Optimize Route"}
              </Button>
              <Button
                onClick={() => {}}
                variant="outline"
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Stop
              </Button>
              <Button
                onClick={handleExportRoute}
                variant="outline"
                className="w-full"
                disabled={selectedCleanerJobs.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Route
              </Button>
            </CardContent>
          </Card>

          {/* Map Placeholder */}
          <Card className="border border-brand-100 bg-gradient-to-br from-gray-50 to-gray-100 shadow-sm rounded-2xl">
            <CardContent className="py-8 px-4 text-center">
              <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="text-xs text-gray-600">
                Map view coming soon — connect Google Maps API
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Unassigned Jobs */}
      {unassignedJobs.length > 0 && (
        <Card className="border border-orange-200 bg-orange-50 shadow-sm rounded-2xl">
          <CardHeader className="cursor-pointer" onClick={() => setShowUnassigned(!showUnassigned)}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Unassigned Jobs
                <span className="text-xs font-semibold bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full">
                  {unassignedJobs.length}
                </span>
              </CardTitle>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  showUnassigned ? "rotate-180" : ""
                }`}
              />
            </div>
          </CardHeader>
          {showUnassigned && (
            <CardContent>
              <div className="space-y-3">
                {unassignedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-lg border border-orange-200 bg-white p-3 text-sm"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{job.customerName}</h4>
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                        {job.serviceType}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 flex items-center gap-1 mb-2">
                      <MapPin className="h-3 w-3" />
                      {job.address}
                    </p>
                    <Button
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {}}
                    >
                      Assign to Cleaner
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
