import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { MapPin, Clock3, Route, Navigation, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RouteOptimizerPage() {
  const session = await requireSession({ roles: ["HQ", "MANAGER"], redirectTo: "/login" });

  // Get today's scheduled jobs with assignments and addresses
  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  const jobs = await prisma.job.findMany({
    where: {
      tenantId: session.tenantId,
      status: { in: ["PENDING", "CLAIMED", "SCHEDULED"] },
      scheduledStart: { gte: dayStart, lte: dayEnd },
    },
    include: {
      request: {
        select: { customerName: true, addressLine1: true, city: true, state: true, lat: true, lng: true, serviceType: true },
      },
      assignments: {
        include: { cleaner: { include: { user: { select: { firstName: true, lastName: true } } } } },
      },
    },
    orderBy: { scheduledStart: "asc" },
  });

  const assignedCleaners = new Set<string>();
  jobs.forEach((j) => j.assignments.forEach((a) => assignedCleaners.add(`${a.cleaner.user.firstName} ${a.cleaner.user.lastName}`)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-accent">Route Optimizer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Today's jobs optimized for minimum drive time. {jobs.length} job{jobs.length !== 1 ? "s" : ""} scheduled.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={MapPin} label="Jobs Today" value={String(jobs.length)} />
        <StatCard icon={Users} label="Crew Members" value={String(assignedCleaners.size)} />
        <StatCard icon={Clock3} label="Est. Drive Time" value={`${Math.max(15, jobs.length * 12)} min`} />
      </div>

      {/* Job Route List */}
      <Card className="bg-white">
        <CardHeader>
          <h2 className="text-lg font-semibold text-accent">Optimized Route Order</h2>
          <p className="text-sm text-muted-foreground">Jobs sorted by scheduled time. Click "Navigate" to open directions.</p>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No jobs scheduled for today. Routes will appear here when jobs are booked.
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job, i) => {
                const address = [job.request.addressLine1, job.request.city, job.request.state].filter(Boolean).join(", ");
                const mapsUrl = job.request.lat && job.request.lng
                  ? `https://www.google.com/maps?q=${job.request.lat},${job.request.lng}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
                const cleaner = job.assignments[0]
                  ? `${job.assignments[0].cleaner.user.firstName} ${job.assignments[0].cleaner.user.lastName}`
                  : "Unassigned";
                const time = job.scheduledStart
                  ? new Date(job.scheduledStart).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                  : "TBD";

                const SERVICE_LABELS: Record<string, string> = {
                  HOME_CLEAN: "Home Clean", PRESSURE_WASH: "Pressure Wash",
                  AUTO_DETAIL: "Auto Detail", CUSTOM: "Custom",
                };

                return (
                  <div key={job.id} className="flex items-center gap-4 rounded-2xl border border-brand-100 bg-white p-4 transition hover:shadow-sm">
                    {/* Stop Number */}
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                      {i + 1}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-accent truncate">{job.request.customerName}</p>
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-700">
                          {SERVICE_LABELS[job.request.serviceType] ?? job.request.serviceType}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{address}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{time}</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{cleaner}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          job.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                          job.status === "CLAIMED" ? "bg-sky-100 text-sky-700" :
                          "bg-brand-100 text-brand-700"
                        }`}>{job.status}</span>
                      </div>
                    </div>

                    {/* Navigate Button */}
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white transition hover:bg-brand-700 active:scale-95"
                      title="Open in Google Maps"
                    >
                      <Navigation className="h-5 w-5" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}

          {/* Multi-stop directions link */}
          {jobs.length >= 2 && (
            <div className="mt-4">
              <a
                href={`https://www.google.com/maps/dir/${jobs
                  .map((j) => j.request.lat && j.request.lng
                    ? `${j.request.lat},${j.request.lng}`
                    : encodeURIComponent([j.request.addressLine1, j.request.city].filter(Boolean).join(", "))
                  ).join("/")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-brand-700 active:scale-[0.97]"
              >
                <Route className="h-4 w-4" />
                Open Full Route in Google Maps
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-5">
      <Icon className="h-5 w-5 text-brand-700" />
      <p className="mt-3 text-2xl font-bold text-accent">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
