import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock3, DollarSign, MapPin, Phone, Route, StickyNote, Camera } from "lucide-react";
import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/src/lib/utils";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { JobActions } from "@/src/components/cleaner/JobActions";
import { JobPhotos } from "@/src/components/cleaner/JobPhotos";

const SERVICE_CHECKLIST: Record<string, string[]> = {
  HOME_CLEAN: ["Kitchen surfaces", "Bathrooms", "Floors (vacuum & mop)", "Dusting", "Windows (interior)"],
  PRESSURE_WASH: ["Driveway", "Sidewalks", "Patio/Lanai", "Exterior walls", "Pool deck"],
  AUTO_DETAIL: ["Exterior wash", "Interior vacuum", "Dashboard & console", "Windows", "Tire dressing"],
  CUSTOM: ["Area assessment", "Surface cleaning", "Detail work", "Final inspection", "Client walkthrough"],
};

const SERVICE_LABELS: Record<string, string> = {
  HOME_CLEAN: "Healthy Home Clean",
  PRESSURE_WASH: "Pressure Washing",
  AUTO_DETAIL: "Eco Auto Detail",
  CUSTOM: "Custom Service",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  CLAIMED: "bg-sky-100 text-sky-800 border-sky-200",
  SCHEDULED: "bg-brand-100 text-brand-800 border-brand-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELED: "bg-slate-100 text-slate-700 border-slate-200",
};

function formatTime(value: Date | null) {
  if (!value) return "TBD";
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDate(value: Date | null) {
  if (!value) return "Not yet scheduled";
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const JobDetailPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const session = await requireSession({ roles: ["CLEANER", "HQ"], redirectTo: "/login" });

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      request: { include: { quote: true } },
      assignments: {
        include: { cleaner: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } } },
      },
    },
  });

  if (!job) notFound();

  if (session.role === "CLEANER") {
    const isAssigned = job.assignments.some((a) => a.cleaner.user.id === session.userId);
    if (!isAssigned) notFound();
  }

  const myAssignment = session.role === "CLEANER"
    ? job.assignments.find((a) => a.cleaner.user.id === session.userId)
    : job.assignments[0];

  // Get photo counts for the PhotoGate logic
  const photoCounts = await prisma.jobPhoto.groupBy({
    by: ["type"],
    where: { jobId: id },
    _count: { id: true },
  });
  const beforePhotoCount = photoCounts.find((c) => c.type === "BEFORE")?._count.id ?? 0;
  const afterPhotoCount = photoCounts.find((c) => c.type === "AFTER")?._count.id ?? 0;

  const isAssignedCleaner = session.role === "CLEANER" && !!myAssignment;

  const payoutAmount = job.payoutAmount ?? (job.request.quote?.total ?? 0) * 0.62;
  const serviceLabel = SERVICE_LABELS[job.request.serviceType] ?? job.request.serviceType.replace(/_/g, " ");
  const address = [job.request.addressLine1, job.request.city, job.request.state].filter(Boolean).join(", ");
  const notes = job.request.notes || job.request.quote?.smartNotes || null;
  const estimatedDuration = job.scheduledStart && job.scheduledEnd
    ? `${((new Date(job.scheduledEnd).getTime() - new Date(job.scheduledStart).getTime()) / 3600000).toFixed(1)} hrs`
    : "TBD";
  const maskedPhone = job.request.customerPhone
    ? job.request.customerPhone.slice(0, -4) + "••••"
    : "Not provided";
  const mapsUrl = job.request.lat && job.request.lng
    ? `https://www.google.com/maps?q=${job.request.lat},${job.request.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  const checklistItems = (SERVICE_CHECKLIST[job.request.serviceType] || SERVICE_CHECKLIST.CUSTOM).map((label, index) => ({
    id: index + 1,
    label,
  }));

  return (
    <div className="space-y-5 pb-28 md:pb-6">
      {/* Back Link */}
      <Link
        href="/cleaner"
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 transition hover:text-brand-900 active:scale-[0.97]"
      >
        <span aria-hidden>&larr;</span>
        Back
      </Link>

      {/* ── Status + Customer Header ── */}
      <div className="rounded-[24px] border border-brand-100 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest ${STATUS_STYLES[job.status] ?? STATUS_STYLES.SCHEDULED}`}>
            {job.status}
          </span>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-700">
            {serviceLabel}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-accent md:text-3xl">{job.request.customerName}</h1>

        {/* Quick Stats — scrollable on mobile */}
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          <Chip icon={CalendarDays} label={formatDate(job.scheduledStart)} />
          <Chip icon={Clock3} label={
            job.scheduledStart && job.scheduledEnd
              ? `${formatTime(job.scheduledStart)} – ${formatTime(job.scheduledEnd)}`
              : formatTime(job.scheduledStart)
          } />
          <Chip icon={Clock3} label={estimatedDuration} />
          <Chip icon={DollarSign} label={formatCurrency(payoutAmount)} accent />
        </div>
      </div>

      {/* ── Where to Go (full-width on mobile) ── */}
      <div className="rounded-[24px] border border-brand-100 bg-gradient-to-br from-brand-50/60 to-white p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-700">Where to go</p>
            <p className="text-base font-bold text-accent">{address || "Address not provided"}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-accent text-sm font-bold uppercase tracking-widest text-white transition active:scale-[0.97] hover:bg-brand-700"
          >
            <Route className="h-4 w-4" />
            Directions
          </a>
          {job.request.customerPhone && (
            <a
              href={`tel:${job.request.customerPhone}`}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-brand-200 bg-white px-5 text-sm font-bold uppercase tracking-widest text-accent transition active:scale-[0.97] hover:bg-brand-50"
            >
              <Phone className="h-4 w-4" />
              Call
            </a>
          )}
        </div>
      </div>

      {/* ── Client Notes ── */}
      {notes && (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <StickyNote className="h-4 w-4 text-amber-600" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-700">Client Notes</p>
          </div>
          <p className="text-sm text-amber-900">{notes}</p>
        </div>
      )}

      {/* ── Live Stream (if set by admin) ── */}
      {job.liveStreamUrl && (
        <div className="rounded-[24px] border border-purple-200 bg-purple-50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="h-4 w-4 text-purple-600" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-700">Live Stream Active</p>
          </div>
          <p className="text-xs text-purple-700 mb-2">This job is being live-streamed for the property owner.</p>
          <a
            href={job.liveStreamUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-purple-700"
          >
            View Stream
          </a>
        </div>
      )}

      {/* ── Shift Actions (sticky on mobile) ── */}
      {myAssignment && (
        <div className="rounded-[24px] border border-brand-100 bg-white p-5">
          <h2 className="text-lg font-bold text-accent mb-4">Shift Actions</h2>
          <JobActions
            jobId={job.id}
            jobStatus={job.status}
            enRouteAt={myAssignment.enRouteAt?.toISOString() ?? null}
            clockInAt={myAssignment.clockInAt?.toISOString() ?? null}
            clockOutAt={myAssignment.clockOutAt?.toISOString() ?? null}
            beforePhotoCount={beforePhotoCount}
            afterPhotoCount={afterPhotoCount}
          />
        </div>
      )}

      {/* ── Service Checklist ── */}
      <div className="rounded-[24px] border border-brand-100 bg-white p-5">
        <h2 className="text-lg font-bold text-accent mb-3">Service Checklist</h2>
        <div className="space-y-2">
          {checklistItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/30 px-4 py-3.5 active:scale-[0.98] transition">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-brand-800 shadow-sm">
                {item.id}
              </div>
              <p className="text-sm font-medium text-accent">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Before / After Photos ── */}
      <div className="rounded-[24px] border border-brand-100 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="h-5 w-5 text-brand-700" />
          <h2 className="text-lg font-bold text-accent">Job Photos</h2>
          <span className="ml-auto rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">
            {beforePhotoCount + afterPhotoCount} total
          </span>
        </div>
        <JobPhotos jobId={job.id} isAssignedCleaner={isAssignedCleaner} />
      </div>

      {/* ── Contact Info ── */}
      <div className="rounded-[24px] border border-brand-100 bg-white p-5">
        <h2 className="text-lg font-bold text-accent mb-3">Client Contact</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium text-accent">{job.request.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phone</span>
            <span className="font-medium text-accent">{maskedPhone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Job ID</span>
            <span className="font-mono text-xs text-muted-foreground">{job.id.slice(0, 12)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

function Chip({
  icon: Icon,
  label,
  accent,
}: {
  icon: typeof CalendarDays;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className={`flex flex-shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 ${
      accent ? "border-green-200 bg-green-50" : "border-brand-100 bg-brand-50/50"
    }`}>
      <Icon className={`h-3.5 w-3.5 ${accent ? "text-green-600" : "text-brand-700"}`} />
      <span className={`text-xs font-semibold whitespace-nowrap ${accent ? "text-green-700" : "text-accent"}`}>{label}</span>
    </div>
  );
}

export default JobDetailPage;
