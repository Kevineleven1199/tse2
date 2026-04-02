import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { requireSession } from "@/src/lib/auth/session";
import { getClientPortalData } from "@/src/lib/client-portal";
import { FeedbackForm } from "./FeedbackForm";

const ClientFeedbackPage = async () => {
  const session = await requireSession({ roles: ["CUSTOMER", "HQ"], redirectTo: "/login" });
  const portal = await getClientPortalData(session.userId);

  return (
    <Card className="bg-white">
      <CardHeader>
        <h1 className="text-2xl font-semibold text-accent">Feedback</h1>
        <p className="text-sm text-muted-foreground">Tell us what went great — or what we should improve — so every visit gets better.</p>
      </CardHeader>
      <CardContent>
        <FeedbackForm cleaner={portal.assignedCleaner} />
      </CardContent>
    </Card>
  );
};

export default ClientFeedbackPage;
