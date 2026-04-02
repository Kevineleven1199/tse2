import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { requireSession } from "@/src/lib/auth/session";
import { getClientPortalData } from "@/src/lib/client-portal";
import { RescheduleForm } from "./RescheduleForm";

const ClientReschedulePage = async () => {
  const session = await requireSession({ roles: ["CUSTOMER", "HQ"], redirectTo: "/login" });
  const portal = await getClientPortalData(session.userId);

  if (portal.upcomingVisits.length === 0) {
    return (
      <EmptyState
        title="No upcoming visits to reschedule"
        description="Once a visit is on the calendar, you’ll be able to request a time change here."
        action={portal.quotes.length > 0 ? { label: "View quotes", href: "/client/quotes" } : { label: "Request a quote", href: "/request" }}
      />
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <h1 className="text-2xl font-semibold text-accent">Request a Reschedule</h1>
        <p className="text-sm text-muted-foreground">
          Send a few alternative windows. HQ will confirm the best option and update your calendar invite.
        </p>
      </CardHeader>
      <CardContent>
        <RescheduleForm visits={portal.upcomingVisits} />
      </CardContent>
    </Card>
  );
};

export default ClientReschedulePage;
