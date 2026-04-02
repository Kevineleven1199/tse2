import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { ReferralCard } from "@/src/components/client/ReferralCard";
import { requireSession } from "@/src/lib/auth/session";
import { getClientPortalData } from "@/src/lib/client-portal";

const ClientReferralsPage = async () => {
  const session = await requireSession({ roles: ["CUSTOMER", "HQ"], redirectTo: "/login" });
  const portal = await getClientPortalData(session.userId);

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <h1 className="text-2xl font-semibold text-accent">Referrals</h1>
          <p className="text-sm text-muted-foreground">Share your link with friends and earn credits toward future cleans.</p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Your referral code is unique to your account. When someone books with it, HQ will apply your credit automatically.</p>
        </CardContent>
      </Card>

      <ReferralCard
        referralCode={portal.loyalty.referralCode}
        referralCount={portal.loyalty.referralCount}
        referralCredits={portal.loyalty.referralCredits}
      />
    </div>
  );
};

export default ClientReferralsPage;
