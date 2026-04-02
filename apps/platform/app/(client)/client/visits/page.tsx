import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { getSession } from "@/src/lib/auth/session";
import { getClientPortalData } from "@/src/lib/client-portal";
import { prisma } from "@/lib/prisma";
import { Camera } from "lucide-react";

export const dynamic = "force-dynamic";

const ClientVisitsPage = async () => {
  const session = await getSession();
  if (!session) return null;

  const portal = await getClientPortalData(session.userId);

  // Get job tickets for completed visits (for photo links)
  const completedJobIds = portal.upcomingVisits
    .filter((v) => v.status === "COMPLETED")
    .map((v) => v.jobId);

  const tickets = completedJobIds.length > 0
    ? await prisma.jobTicket.findMany({
        where: { jobId: { in: completedJobIds } },
        select: { jobId: true, accessToken: true },
      })
    : [];

  const ticketMap = new Map(tickets.map((t) => [t.jobId, t.accessToken]));

  return (
    <Card className="bg-white">
      <CardHeader>
        <h1 className="text-2xl font-semibold text-accent">Upcoming Visits</h1>
        <p className="text-sm text-muted-foreground">Track every scheduled clean, arrival window, and location from one place.</p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        {portal.upcomingVisits.length === 0 ? (
          <EmptyState
            variant="inline"
            title="No upcoming visits"
            description="Once HQ locks in your visit, the details will appear here instantly."
            action={
              portal.quotes.length > 0
                ? { label: "View quotes", href: "/client/quotes" }
                : { label: "Request a quote", href: "/request" }
            }
          />
        ) : (
          <div className="space-y-3">
            {portal.upcomingVisits.map((visit) => {
              const token = ticketMap.get(visit.jobId);
              const isCompleted = visit.status === "COMPLETED";

              return (
                <div key={visit.jobId} className="rounded-3xl border border-brand-100 bg-brand-50/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-brand-600">{visit.service}</p>
                      <p className="text-lg font-semibold text-accent">
                        {visit.dateLabel} • {visit.window}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${
                      isCompleted
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-brand-100 text-accent"
                    }`}>
                      {visit.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{visit.address}</p>

                  {/* Photo link for completed visits */}
                  {isCompleted && token && (
                    <a
                      href={`/job-ticket/${visit.jobId}?token=${token}`}
                      className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-brand-700 active:scale-[0.97]"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      View Before / After Photos
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientVisitsPage;
