"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

interface SmsMessage {
  id: string;
  phoneNumber: string;
  content: string;
  direction: string;
  createdAt: string;
}

interface Conversation {
  phone: string;
  messages: SmsMessage[];
  lastMessage: SmsMessage;
}

export default function MessagesClient({
  initialConversations,
}: {
  initialConversations: Conversation[];
}) {
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(
    conversations[0]?.phone || null
  );
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedConversation = conversations.find(
    (c) => c.phone === selectedPhone
  );

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhone || !replyText.trim() || !selectedConversation) return;

    // Validation
    if (replyText.trim().length === 0) {
      setError("Message cannot be empty");
      return;
    }
    if (replyText.length > 500) {
      setError("Message must be less than 500 characters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: selectedPhone,
          content: replyText,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const newMessage = await response.json();

      setConversations(
        conversations.map((conv) =>
          conv.phone === selectedPhone
            ? {
                ...conv,
                messages: [...conv.messages, newMessage],
              }
            : conv
        )
      );

      setReplyText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4 h-[600px]">
      <Card className="col-span-1 overflow-hidden flex flex-col">
        <CardHeader className="pb-2">
          <h3 className="font-semibold">Conversations</h3>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-1">
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conversations.</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.phone}
                onClick={() => setSelectedPhone(conv.phone)}
                className={`w-full text-left p-2 rounded text-sm ${
                  selectedPhone === conv.phone
                    ? "bg-brand-100 border border-brand-600"
                    : "hover:bg-gray-100"
                }`}
              >
                <p className="font-mono text-xs">{conv.phone}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {conv.lastMessage.content}
                </p>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="col-span-2 overflow-hidden flex flex-col">
        {selectedConversation ? (
          <>
            <CardHeader className="pb-2">
              <h3 className="font-semibold font-mono">
                {selectedConversation.phone}
              </h3>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-2 mb-4">
              {selectedConversation.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.direction === "outbound"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      msg.direction === "outbound"
                        ? "bg-brand-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>

            <form onSubmit={handleSendReply} className="border-t p-4 space-y-2">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700">
                  {error}
                </div>
              )}
              <div>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm resize-none"
                  rows={2}
                  placeholder="Type message..."
                  disabled={loading}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {replyText.length}/500
                </p>
              </div>
              <button
                type="submit"
                disabled={loading || !replyText.trim()}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send"}
              </button>
            </form>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">
              Select a conversation to view messages
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
