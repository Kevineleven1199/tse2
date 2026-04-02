"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

type Message = {
  id: string;
  content: string;
  senderUserId: string;
  createdAt: string;
  isOwn: boolean;
};

type Props = {
  initialMessages: Message[];
  currentUserId: string;
};

export const MessageThread = ({ initialMessages, currentUserId }: Props) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Poll for new messages every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/client/messages");
        if (res.ok) {
          const data = await res.json();
          const formatted = data.messages.map((m: any) => ({
            id: m.id,
            content: m.content,
            senderUserId: m.senderUserId,
            createdAt: m.createdAt,
            isOwn: m.senderUserId === currentUserId,
          }));
          setMessages(formatted);
        }
      } catch {
        // Silently fail polling
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [currentUserId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const content = input.trim();
    setInput("");
    setSending(true);

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      senderUserId: currentUserId,
      createdAt: new Date().toISOString(),
      isOwn: true,
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const res = await fetch("/api/client/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticMessage.id ? { ...data.message, isOwn: true } : m
          )
        );
      }
    } catch {
      // Keep optimistic message
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white">
      {/* Messages area */}
      <div className="flex max-h-[500px] min-h-[300px] flex-col gap-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            No messages yet. Send one to start the conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  msg.isOwn
                    ? "bg-accent text-white"
                    : "bg-brand-50 text-accent"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p
                  className={`mt-1 text-xs ${
                    msg.isOwn ? "text-white/60" : "text-muted-foreground"
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-brand-100 px-4 py-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border border-brand-100 bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};
