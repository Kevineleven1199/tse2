"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { JobChecklist } from "./JobChecklist";
import { JobPhotos } from "./JobPhotos";
import { MapPin, CalendarClock, DollarSign } from "lucide-react";
import { formatCurrency } from "@/src/lib/utils";

type TabType = "checklist" | "photos" | "details";

interface JobDetailsProps {
  customerName: string;
  address: string;
  serviceType: string;
  scheduledStart: Date | null;
  payoutAmount: number | null;
  status: string;
  notes: string | null;
  smartNotes: string | null;
}

interface JobDetailTabsProps {
  jobId: string;
  isAssignedCleaner: boolean;
  jobDetails: JobDetailsProps;
}

export const JobDetailTabs = ({
  jobId,
  isAssignedCleaner,
  jobDetails,
}: JobDetailTabsProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("checklist");

  const tabs: Array<{ id: TabType; label: string; icon: string }> = [
    { id: "checklist", label: "Checklist", icon: "✓" },
    { id: "photos", label: "Photos", icon: "📸" },
    { id: "details", label: "Details", icon: "ℹ" },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation - Mobile-Friendly Pill Buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap font-medium text-sm transition-all min-h-[44px] ${
              activeTab === tab.id
                ? "bg-accent text-white shadow-md"
                : "bg-brand-50 text-accent border border-brand-200 hover:bg-brand-100"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {/* Checklist Tab */}
        {activeTab === "checklist" && (
          <JobChecklist jobId={jobId} isAssignedCleaner={isAssignedCleaner} />
        )}

        {/* Photos Tab */}
        {activeTab === "photos" && (
          <JobPhotos jobId={jobId} isAssignedCleaner={isAssignedCleaner} />
        )}

        {/* Details Tab */}
        {activeTab === "details" && (
          <div className="space-y-6">
            {/* Customer Notes */}
            {jobDetails.notes && (
              <Card className="rounded-2xl border-brand-200">
                <CardHeader className="pb-3">
                  <h3 className="font-semibold text-gray-900">Customer Notes</h3>
                </CardHeader>
                <CardContent>
                  <div className="rounded-2xl bg-brand-50/60 px-4 py-3 border border-brand-200">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {jobDetails.notes}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Notes */}
            {jobDetails.smartNotes && (
              <Card className="rounded-2xl border-brand-200">
                <CardHeader className="pb-3">
                  <h3 className="font-semibold text-gray-900">AI Notes</h3>
                </CardHeader>
                <CardContent>
                  <div className="rounded-2xl bg-blue-50/60 px-4 py-3 border border-blue-200">
                    <p className="text-sm text-blue-900 leading-relaxed">
                      {jobDetails.smartNotes}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scheduling Information */}
            <Card className="rounded-2xl border-brand-200">
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-gray-900">Scheduling Information</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Scheduled Date */}
                  {jobDetails.scheduledStart && (
                    <div className="flex gap-3">
                      <CalendarClock className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Scheduled Date & Time
                        </p>
                        <p className="mt-1 font-medium text-gray-900">
                          {new Date(jobDetails.scheduledStart).toLocaleDateString(
                            [],
                            {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(jobDetails.scheduledStart).toLocaleTimeString(
                            [],
                            {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div className="flex gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">📋</span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Job Status
                      </p>
                      <p className="mt-1 font-medium text-gray-900 capitalize">
                        {jobDetails.status.replace(/_/g, " ").toLowerCase()}
                      </p>
                    </div>
                  </div>

                  {/* Service Type */}
                  <div className="flex gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">🧹</span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Service Type
                      </p>
                      <p className="mt-1 font-medium text-gray-900">
                        {jobDetails.serviceType === "HOME_CLEAN"
                          ? "Home Clean"
                          : jobDetails.serviceType === "PRESSURE_WASH"
                            ? "Pressure Wash"
                            : jobDetails.serviceType === "AUTO_DETAIL"
                              ? "Auto Detail"
                              : "Custom Service"}
                      </p>
                    </div>
                  </div>

                  {/* Payout */}
                  <div className="flex gap-3">
                    <DollarSign className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Payout Amount
                      </p>
                      <p className="mt-1 text-lg font-bold text-green-600">
                        {jobDetails.payoutAmount
                          ? formatCurrency(jobDetails.payoutAmount)
                          : "TBD"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location Details */}
            <Card className="rounded-2xl border-brand-200">
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-gray-900">Location</h3>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <MapPin className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{jobDetails.address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
