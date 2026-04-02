import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  MapPin, Clock, DollarSign, Users, CheckCircle2, AlertTriangle,
  ArrowRight, Phone, CalendarDays, UserCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

function confirmBadge(cleanerConfirmed: boolean, customerConfirmed: boolean) {
  if (cleanerConfirmed && customerConfirmed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-700" title="Double confirmed">
        <CheckCircle2 className="h-3 w-3" /><CheckCircle2 className="h-3 w-3" /> Locked
      </span>
    );
  }
  if (cleanerConfirmed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700" title="Cleaner confirmed, awaiting customer">
        <CheckCircle2 className="h-3 w-3" /> Cleaner ✓
      </span>
    );
  }
  if (customerConfirmed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-700" title="Customer confirmed, awaiting cleaner">
        <CheckCircle2 className="h-3 w-3" /> Customer ✓
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700" title="Unconfirmed">
      <AlertTriangle className="h-3 w-3" /> Unconfirmed
    </span>
  );
}

export default async function UnassignedJobsPage() {
  const session = await requireSession({ roles: ["HQ", "MANAGER"], redirectTo: "/login" });

  const unassignedJobs = await prisma.job.findMany({
    where: {
      tenantId: session.tenantId,
      status: { in: ["PENDING", "CLAIMED"] },
      assignments: { none: {} },
    },
    include: {
      request: {
        select: { customerName: true, customerPhone: true, customerEmail: true, addressLine1: true, city: true, serviceType: true, notes: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const allPendingJobs = await prisma.job.findMany({
    where: {
      tenantId: session.tenantId,
      status: { in: ["PENDING", "CLAIMED", "SCHEDULED"] },
    },
    include: {
      request: {
        select: { customerName: true, customerPhone: true, addressLine1: true, city: true, serviceType: true },
      },
      assignments: {
        include: { cleaner: { include: { user: { select: { firstName: true, lastName: true } } } } },
      },
    },
    orderBy: { scheduledStart: "asc" },
    take: 50,
  });

  const assignedJobs = allPendingJobs.filter(j => j.assignments.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-orange-700 via-brand-700 to-emerald-700 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-orange-200/80">Dispatch Center</p>
            <h1 className="mt-1 text-2xl font-bold">Job Assignment</h1>
            <p className="text-sm text-orange-100/80">{unassignedJobs.length} unassigned • {assignedJobs.length} assigned (pending confirmation)</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl bg-red-500/20 ring-1 ring-red-300/30 px-4 py-2"><p className="text-[9px] font-bold uppercase text-white/50">Unassigned</p><p className="text-lg font-bold">{unassignedJobs.length}</p></div>
            <div className="rounded-xl bg-white/10 px-4 py-2"><p className="text-[9px] font-bold uppercase text-white/50">Assigned</p><p className="text-lg font-bold">{assignedJobs.length}</p></div>
          </div>
        </div>
      </div>

      {/* Unassigned Jobs */}
      <div className="rounded-3xl border border-red-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-red-100 bg-red-50/30 px-6 py-4">
          <h2 className="font-bold text-accent flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Unassigned Jobs — Need Cleaners</h2>
        </div>
        <div className="divide-y divide-brand-50">
          {unassignedJobs.map((job) => (
            <div key={job.id} className="flex items-center gap-4 px-6 py-4 transition hover:bg-red-50/20">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-accent">{job.request.customerName}</span>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold uppercase text-red-700">Needs cleaner</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.request.city || job.request.addressLine1}</span>
                  <span>{job.request.serviceType.replace(/_/g, " ")}</span>
                  {job.estimatedHours && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ~{job.estimatedHours}h</span>}
                </div>
              </div>
              {job.payoutAmount && (
                <span className="text-sm font-bold text-accent">${job.payoutAmount.toFixed(0)}</span>
              )}
              {job.request.customerPhone && (
                <a href={`tel:${job.request.customerPhone}`} className="rounded-lg p-2 text-muted-foreground hover:bg-brand-50 hover:text-accent"><Phone className="h-4 w-4" /></a>
              )}
              <Link href="/admin/schedule" className="rounded-full bg-accent px-4 py-2 text-xs font-bold uppercase text-white hover:bg-brand-700">
                Assign
              </Link>
            </div>
          ))}
          {unassignedJobs.length === 0 && (
            <div className="px-6 py-12 text-center text-muted-foreground">All jobs are assigned. Great work!</div>
          )}
        </div>
      </div>

      {/* Assigned but pending confirmation */}
      <div className="rounded-3xl border border-brand-100 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-brand-100 bg-brand-50/30 px-6 py-4">
          <h2 className="font-bold text-accent flex items-center gap-2"><UserCheck className="h-4 w-4 text-brand-600" /> Assigned Jobs — Confirmation Status</h2>
          <p className="text-xs text-muted-foreground mt-1">Double checkmark = confirmed by both cleaner AND customer. Single = one side only.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-brand-100 bg-brand-50/20">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Service</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cleaner</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Scheduled</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Confirmation</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {assignedJobs.map((job) => {
                const cleaner = job.assignments[0]?.cleaner;
                const cleanerName = cleaner ? `${cleaner.user.firstName} ${cleaner.user.lastName}`.trim() : "—";
                return (
                  <tr key={job.id} className="transition hover:bg-brand-50/30">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-accent">{job.request.customerName}</p>
                      <p className="text-xs text-muted-foreground">{job.request.city}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{job.request.serviceType.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 font-medium text-accent">{cleanerName}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {job.scheduledStart ? new Date(job.scheduledStart).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "TBD"}
                    </td>
                    <td className="px-4 py-3">{confirmBadge(job.cleanerConfirmed, job.customerConfirmed)}</td>
                    <td className="px-4 py-3 text-right font-bold text-accent">{job.payoutAmount ? `$${job.payoutAmount.toFixed(0)}` : "—"}</td>
                  </tr>
                );
              })}
              {assignedJobs.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No assigned jobs pending.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
