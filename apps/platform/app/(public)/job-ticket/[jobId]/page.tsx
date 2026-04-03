import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/src/lib/auth/session";
import { Camera, CalendarDays, Clock3, MapPin, CheckCircle2, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function JobTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { jobId } = await params;
  const { token } = await searchParams;
  const session = await getSession();

  // ── Access Control ──
  // 1. Token-based access (customer link)
  // 2. Assigned cleaner (logged in)
  // 3. HQ / MANAGER (logged in, same tenant)
  let hasAccess = false;
  let viewerLabel = "Guest";

  if (token) {
    const ticket = await prisma.jobTicket.findUnique({
      where: { accessToken: token, jobId },
    });
    if (ticket) {
      hasAccess = true;
      viewerLabel = "Customer";
    }
  }

  if (!hasAccess && session) {
    if (session.role === "HQ" || session.role === "MANAGER") {
      hasAccess = true;
      viewerLabel = "Manager";
    } else if (session.role === "CLEANER") {
      const assignment = await prisma.jobAssignment.findFirst({
        where: { jobId, cleaner: { userId: session.userId } },
      });
      if (assignment) {
        hasAccess = true;
        viewerLabel = "Crew Member";
      }
    }
  }

  if (!hasAccess) {
    return (
      <div className="section-wrapper py-16">
        <div className="mx-auto max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <Shield className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h1 className="text-xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-sm text-gray-500">
            This job ticket is only visible to the assigned crew member, the customer, and management.
          </p>
          <a
            href="/login"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-brand-700"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  // ── Load Job Data ──
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      request: { select: { customerName: true, addressLine1: true, city: true, state: true, serviceType: true } },
      assignments: {
        include: { cleaner: { include: { user: { select: { firstName: true, lastName: true } } } } },
      },
    },
  });

  if (!job) notFound();

  const photos = await prisma.jobPhoto.findMany({
    where: { jobId },
    orderBy: { uploadedAt: "asc" },
  });

  const beforePhotos = photos.filter((p) => p.type === "BEFORE");
  const afterPhotos = photos.filter((p) => p.type === "AFTER");
  const address = [job.request.addressLine1, job.request.city, job.request.state].filter(Boolean).join(", ");
  const cleanerName = job.assignments[0]
    ? `${job.assignments[0].cleaner.user.firstName} ${job.assignments[0].cleaner.user.lastName}`
    : "Unassigned";
  const completedAt = job.assignments[0]?.clockOutAt;

  const SERVICE_LABELS: Record<string, string> = {
    HOME_CLEAN: "Healthy Home Clean",
    PRESSURE_WASH: "Pressure Washing",
    AUTO_DETAIL: "Eco Auto Detail",
    CUSTOM: "Custom Service",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      {/* Header */}
      <div className="bg-accent text-white">
        <div className="section-wrapper py-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/60">Job Ticket</p>
          <h1 className="mt-1 text-xl font-bold">Tri State Enterprise</h1>
          <p className="mt-1 text-sm text-white/80">Visit report for {job.request.customerName}</p>
        </div>
      </div>

      <div className="section-wrapper py-6 space-y-5">
        {/* Job Summary */}
        <div className="rounded-[24px] border border-brand-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
              job.status === "COMPLETED"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              {job.status}
            </span>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-700">
              {SERVICE_LABELS[job.request.serviceType] ?? job.request.serviceType}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow icon={CalendarDays} label="Date" value={
              job.scheduledStart
                ? new Date(job.scheduledStart).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
                : "Not scheduled"
            } />
            <InfoRow icon={Clock3} label="Time" value={
              job.scheduledStart
                ? new Date(job.scheduledStart).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                : "TBD"
            } />
            <InfoRow icon={MapPin} label="Address" value={address} />
            <InfoRow icon={CheckCircle2} label="Crew Member" value={cleanerName} />
          </div>

          {completedAt && (
            <div className="mt-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-green-700">Completed</p>
              <p className="text-sm text-green-800 mt-1">
                {new Date(completedAt).toLocaleString("en-US", {
                  weekday: "short", month: "short", day: "numeric",
                  hour: "numeric", minute: "2-digit",
                })}
              </p>
            </div>
          )}
        </div>

        {/* Before Photos */}
        {beforePhotos.length > 0 && (
          <div className="rounded-[24px] border border-brand-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold text-accent">Before</h2>
              <span className="ml-auto rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600">
                {beforePhotos.length}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {beforePhotos.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-2xl bg-gray-100">
                  <img
                    src={p.driveFileUrl ?? p.imageData ?? ""}
                    alt="Before"
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                  />
                  <div className="px-3 py-2">
                    <p className="text-[10px] text-gray-500">
                      {new Date(p.uploadedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* After Photos */}
        {afterPhotos.length > 0 && (
          <div className="rounded-[24px] border border-brand-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-bold text-accent">After</h2>
              <span className="ml-auto rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-600">
                {afterPhotos.length}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {afterPhotos.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-2xl bg-gray-100">
                  <img
                    src={p.driveFileUrl ?? p.imageData ?? ""}
                    alt="After"
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                  />
                  <div className="px-3 py-2">
                    <p className="text-[10px] text-gray-500">
                      {new Date(p.uploadedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {beforePhotos.length === 0 && afterPhotos.length === 0 && (
          <div className="rounded-[24px] border border-brand-100 bg-white p-8 text-center shadow-sm">
            <Camera className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No photos have been uploaded for this visit yet.</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pt-4">
          <p>Tri State Enterprise · Flatwoods, KY · (606) 836-2534</p>
          <p className="mt-1">Viewing as: {viewerLabel}</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-brand-50/50 px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-brand-700" />
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-700">{label}</span>
      </div>
      <p className="mt-1 text-sm font-medium text-accent">{value}</p>
    </div>
  );
}
