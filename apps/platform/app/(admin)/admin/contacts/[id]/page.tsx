import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ContactDetail } from "@/src/components/admin/ContactDetail";

interface ContactDetailPageProps {
  params: Promise<{ id: string }>;
}

const ContactDetailPage = async ({ params }: ContactDetailPageProps) => {
  const session = await requireSession({ roles: ["HQ", "MANAGER"] });

  const viewer = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { tenantId: true },
  });

  if (!viewer) {
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-semibold text-red-700">Error loading contact</p>
        <p className="mt-1 text-sm text-red-600">Please try refreshing the page.</p>
      </div>
    );
  }

  const { id } = await params;

  const lead = await prisma.crmLead.findUnique({
    where: { id },
  });

  if (!lead || lead.tenantId !== viewer.tenantId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-accent">Contact Not Found</h1>
        </div>
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-semibold text-red-700">This contact does not exist</p>
          <p className="mt-1 text-sm text-red-600">Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  // Build OR conditions for service requests
  const orConditions: Array<{ customerEmail?: string } | { customerPhone?: string }> = [];
  if (lead.contactEmail) {
    orConditions.push({ customerEmail: lead.contactEmail });
  }
  if (lead.contactPhone) {
    orConditions.push({ customerPhone: lead.contactPhone });
  }

  // Fetch related activity
  const [serviceRequests, todos, callTranscripts] = await Promise.all([
    prisma.serviceRequest.findMany({
      where: {
        tenantId: lead.tenantId,
        ...(orConditions.length > 0 ? { OR: orConditions } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.todoItem.findMany({
      where: {
        tenantId: lead.tenantId,
        relatedId: lead.id,
        relatedType: "crm_lead",
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.callTranscript.findMany({
      where: {
        tenantId: lead.tenantId,
        ...(lead.contactPhone ? { customerPhone: lead.contactPhone } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <ContactDetail
      lead={lead}
      activity={{
        serviceRequests,
        todos,
        callTranscripts,
      }}
    />
  );
};

export default ContactDetailPage;
