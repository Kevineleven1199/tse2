import { getSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import CampaignsClient from "./campaigns-client";

export default async function CampaignsPage() {
  const session = await getSession();
  const tenantId = session?.tenantId || process.env.DEFAULT_TENANT_ID || "ten_tse";

  if (!session) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-semibold text-red-700">Authentication Required</p>
      </div>
    );
  }

  const campaigns = await prisma.emailCampaign.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      _count: { select: { recipients: true } }
    },
  });

  const stats = {
    total: campaigns.length,
    drafts: campaigns.filter(c => c.status === "DRAFT").length,
    sent: campaigns.filter(c => c.status === "SENT").length,
    scheduled: campaigns.filter(c => c.status === "SCHEDULED").length,
  };

  return (
    <CampaignsClient
      initialCampaigns={JSON.parse(JSON.stringify(campaigns))}
      stats={stats}
    />
  );
}
