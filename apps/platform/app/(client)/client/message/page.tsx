import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { MessageThread } from "@/src/components/client/MessageThread";

export default async function MessagesPage() {
  const session = await requireSession({ roles: ["CUSTOMER", "HQ"], redirectTo: "/login" });

  const messages = await prisma.message.findMany({
    where: {
      tenantId: session.tenantId,
      OR: [
        { senderUserId: session.userId },
        { recipientUserId: session.userId },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  const formatted = messages.map((m) => ({
    id: m.id,
    content: m.content,
    senderUserId: m.senderUserId,
    createdAt: m.createdAt.toISOString(),
    isOwn: m.senderUserId === session.userId,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-accent">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">Chat with Tri State HQ</p>
      </div>

      <MessageThread initialMessages={formatted} currentUserId={session.userId} />

      <div className="rounded-2xl border border-brand-100 bg-brand-50/30 p-4 text-center text-sm text-muted-foreground">
        Need immediate help? Call{" "}
        <a href="tel:+16065550100" className="font-semibold text-accent hover:underline">
          (606) 555-0100
        </a>{" "}
        or text us anytime.
      </div>
    </div>
  );
}
