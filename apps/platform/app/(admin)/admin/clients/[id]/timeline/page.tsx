import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";
import { redirect } from "next/navigation";
import TimelineClient from "./timeline-client";

interface ClientTimelinePageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientTimelinePage({
  params,
}: ClientTimelinePageProps) {
  const session = await requireSession({
    roles: ["HQ", "MANAGER"],
    redirectTo: "/login",
  });
  const { id } = await params;

  try {
    const client = await prisma.user.findFirst({
      where: { id, tenantId: session.tenantId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    if (!client) {
      redirect("/admin/contacts");
    }

    return (
      <TimelineClient
        client={{
          id: client.id,
          name: `${client.firstName || ""} ${client.lastName || ""}`.trim() ||
            client.email,
          email: client.email,
          phone: client.phone || "",
          memberSince: client.createdAt.toISOString(),
        }}
      />
    );
  } catch (error) {
    console.error("Failed to load client timeline:", error);
    redirect("/admin/contacts");
  }
}
