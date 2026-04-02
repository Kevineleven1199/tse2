import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  FileText, Clock, CheckCircle2, XCircle, Send, Eye, Trash2,
  ArrowRight, AlertTriangle, DollarSign, Phone, Mail,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EstimatesPage() {
  const session = await requireSession({ roles: ["HQ", "MANAGER"], redirectTo: "/login" });

  const estimates = await prisma.draftEstimate.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const statusCounts = {
    draft: estimates.filter(e => e.status === "draft").length,
    sent: estimates.filter(e => e.status === "sent").length,
    confirmed: estimates.filter(e => e.status === "customer_confirmed").length,
    expired: estimates.filter(e => e.status === "expired").length,
  };

  const totalValue = estimates.filter(e => e.status !== "expired").reduce((s, e) => s + (e.estimatedCost ?? 0), 0);

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
      draft: { label: "Draft", cls: "bg-slate-100 text-slate-700", icon: FileText },
      sent: { label: "Sent", cls: "bg-blue-100 text-blue-700", icon: Send },
      customer_confirmed: { label: "Accepted", cls: "bg-green-100 text-green-700", icon: CheckCircle2 },
      expired: { label: "Expired", cls: "bg-red-100 text-red-700", icon: XCircle },
    };
    const s = map[status] || map.draft;
    const Icon = s.icon;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${s.cls}`}>
        <Icon className="h-3 w-3" /> {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-700 via-brand-700 to-emerald-700 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.4em] text-amber-200/80">Estimates</p>
            <h1 className="mt-1 text-2xl font-bold">{estimates.length} Estimates</h1>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl bg-white/10 px-4 py-2"><p className="text-[9px] font-bold uppercase text-white/50">Draft</p><p className="text-lg font-bold">{statusCounts.draft}</p></div>
            <div className="rounded-xl bg-white/10 px-4 py-2"><p className="text-[9px] font-bold uppercase text-white/50">Sent</p><p className="text-lg font-bold">{statusCounts.sent}</p></div>
            <div className="rounded-xl bg-green-500/20 ring-1 ring-green-300/30 px-4 py-2"><p className="text-[9px] font-bold uppercase text-white/50">Accepted</p><p className="text-lg font-bold">{statusCounts.confirmed}</p></div>
            <div className="rounded-xl bg-white/10 px-4 py-2"><p className="text-[9px] font-bold uppercase text-white/50">Pipeline Value</p><p className="text-lg font-bold">${totalValue.toLocaleString()}</p></div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-brand-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-brand-100 bg-brand-50/30">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Service</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Created</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {estimates.map((est) => (
                <tr key={est.id} className="transition hover:bg-brand-50/40">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-accent">{est.customerName || "—"}</p>
                    <p className="text-xs text-muted-foreground">{est.customerEmail || est.customerPhone || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{est.serviceType?.replace(/_/g, " ") || "—"}</td>
                  <td className="px-4 py-3 text-right font-bold text-accent">{est.estimatedCost ? `$${est.estimatedCost.toFixed(0)}` : "—"}</td>
                  <td className="px-4 py-3">{statusBadge(est.status)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{est.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {est.accessToken && (
                        <Link href={`/estimate/${est.id}?token=${est.accessToken}`} target="_blank" className="rounded-lg p-1.5 text-muted-foreground hover:bg-brand-50 hover:text-accent" title="View estimate page">
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      )}
                      {est.customerPhone && (
                        <a href={`tel:${est.customerPhone}`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-brand-50 hover:text-accent" title="Call customer">
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {est.customerEmail && (
                        <a href={`mailto:${est.customerEmail}`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-brand-50 hover:text-accent" title="Email customer">
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {estimates.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No estimates yet. They appear here when customers request quotes or calls come in via OpenPhone.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
