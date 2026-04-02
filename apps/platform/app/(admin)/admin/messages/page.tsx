import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import MessagesClient from "./messages-client";

export default async function MessagesPage() {
  await requireSession({ roles: ["HQ"], redirectTo: "/login" });

  try {
    const messages = await prisma.smsMessage.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });

    // Group messages and serialize dates
    const serializedMessages = messages.map((msg) => ({
      id: msg.id,
      phoneNumber: msg.fromNumber,
      content: msg.content,
      direction: msg.direction,
      createdAt: msg.createdAt.toISOString(),
    }));

    const groupedByPhone = serializedMessages.reduce(
      (acc, msg) => {
        const phone = msg.phoneNumber || "Unknown";
        if (!acc[phone]) {
          acc[phone] = [];
        }
        acc[phone].push(msg);
        return acc;
      },
      {} as Record<string, any[]>
    );

    const conversations = Object.entries(groupedByPhone).map(([phone, msgs]) => ({
      phone,
      messages: msgs.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
      lastMessage: msgs[0],
    }));

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
            COMMUNICATION
          </p>
          <h1 className="text-2xl font-semibold">Messages</h1>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm text-muted-foreground">Conversations</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{conversations.length}</p>
            </CardContent>
          </Card>
        </div>

        <MessagesClient initialConversations={conversations} />
      </div>
    );
  } catch (error) {
    console.error("Failed to load Messages:", error);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Messages</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load data. Please try refreshing the page.
        </div>
      </div>
    );
  }
}
