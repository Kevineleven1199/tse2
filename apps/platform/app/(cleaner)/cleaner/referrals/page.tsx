import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { CleanerReferralCard } from "./CleanerReferralCard";

function generateReferralCode(email: string): string {
  const hash = email.split("").reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  return `TRISTATE${Math.abs(hash).toString(36).toUpperCase().slice(0, 6)}`;
}

const CleanerReferralsPage = async () => {
  const session = await requireSession({ roles: ["CLEANER", "HQ"], redirectTo: "/login" });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, firstName: true, lastName: true }
  });

  const email = user?.email ?? session.email;
  const referralCode = generateReferralCode(email);

  // Query referral stats from the database
  let referralCount = 0;
  let referralCredits = 0;
  let pendingCount = 0;

  try {
    const [rewarded, qualified, pending] = await Promise.all([
      prisma.referral.findMany({
        where: { referrerEmail: email, status: "REWARDED" },
        select: { rewardAmount: true }
      }),
      prisma.referral.count({
        where: { referrerEmail: email, status: "QUALIFIED" }
      }),
      prisma.referral.count({
        where: { referrerEmail: email, status: "PENDING" }
      })
    ]);

    referralCount = rewarded.length + qualified;
    referralCredits = rewarded.reduce((sum, r) => sum + (r.rewardAmount ?? 0), 0);
    pendingCount = pending;
  } catch (err) {
    console.warn("[cleaner/referrals] Could not query referrals:", err);
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <h1 className="text-2xl font-semibold text-accent">Referrals</h1>
          <p className="text-sm text-muted-foreground">
            Earn credits by referring new customers to Tri State Enterprise.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Share your personal referral code with friends, family, and clients.
            When they book their first clean using your code, you earn $25 credit!
          </p>
        </CardContent>
      </Card>

      <CleanerReferralCard
        referralCode={referralCode}
        referralCount={referralCount}
        referralCredits={referralCredits}
        pendingCount={pendingCount}
      />
    </div>
  );
};

export default CleanerReferralsPage;
