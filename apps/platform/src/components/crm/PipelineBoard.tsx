"use client";

import { useState, useCallback } from "react";
import { ChevronDown, Phone, MessageSquare, Mail, ArrowRight } from "lucide-react";
import type { CustomerLifecycleStage } from "@prisma/client";

export type PipelineCard = {
  id: string;
  businessName: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  score: number;
  leadTemperature: string;
  lifecycleStage: CustomerLifecycleStage;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  daysInStage: number;
};

export type PipelineColumn = {
  stage: CustomerLifecycleStage;
  title: string;
  subtitle: string;
  count: number;
  cards: PipelineCard[];
  color: string;
  bgColor: string;
};

export type PipelineBoardProps = {
  columns: PipelineColumn[];
};

const STAGE_COLORS: Record<string, { color: string; bgColor: string; textColor: string }> = {
  COLD_LEAD: { color: "bg-blue-500", bgColor: "bg-blue-50", textColor: "text-blue-700" },
  WARM_LEAD: { color: "bg-amber-500", bgColor: "bg-amber-50", textColor: "text-amber-700" },
  PROSPECT: { color: "bg-orange-500", bgColor: "bg-orange-50", textColor: "text-orange-700" },
  FIRST_TIME_CUSTOMER: { color: "bg-emerald-500", bgColor: "bg-emerald-50", textColor: "text-emerald-700" },
  REPEAT_CUSTOMER: { color: "bg-green-500", bgColor: "bg-green-50", textColor: "text-green-700" },
  LOYAL_CUSTOMER: { color: "bg-teal-500", bgColor: "bg-teal-50", textColor: "text-teal-700" },
  REFERRER: { color: "bg-purple-500", bgColor: "bg-purple-50", textColor: "text-purple-700" },
  CHAMPION: { color: "bg-pink-500", bgColor: "bg-pink-50", textColor: "text-pink-700" },
};

function formatDaysInStage(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}m`;
}

function formatLastContact(date: string | null): string {
  if (!date) return "Never";
  const d = new Date(date);
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}m ago`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-700 bg-green-50";
  if (score >= 60) return "text-amber-700 bg-amber-50";
  if (score >= 40) return "text-orange-700 bg-orange-50";
  return "text-red-700 bg-red-50";
}

function PipelineCard({
  card,
  onMove,
  onCall,
  onEmail,
  onText,
}: {
  card: PipelineCard;
  onMove: (cardId: string) => void;
  onCall: (cardId: string, phone: string) => void;
  onEmail: (cardId: string, email: string) => void;
  onText: (cardId: string, phone: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const colors = STAGE_COLORS[card.lifecycleStage];

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("cardId", card.id);
      }}
      className="mb-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow cursor-move"
    >
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate text-sm">
              {card.contactName || card.businessName}
            </h3>
            <p className="text-xs text-gray-500 truncate">{card.businessName}</p>
          </div>
          <div className={`ml-2 flex-shrink-0 h-6 w-6 rounded-full ${colors.color} flex items-center justify-center text-white text-xs font-bold`}>
            {card.score}
          </div>
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-1 rounded-full font-medium ${
            card.leadTemperature === "hot" ? "bg-red-100 text-red-700" :
            card.leadTemperature === "warm" ? "bg-amber-100 text-amber-700" :
            "bg-blue-100 text-blue-700"
          }`}>
            {card.leadTemperature === "hot" ? "🔥 Hot" : card.leadTemperature === "warm" ? "🟡 Warm" : "🔵 Cold"}
          </span>
          <span className="text-gray-600">
            {formatDaysInStage(card.daysInStage)}
          </span>
        </div>

        {/* Contact Info */}
        {card.contactPhone && (
          <div className="text-xs text-gray-600 truncate">
            📱 {card.contactPhone}
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-1 border-t pt-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Last contact: {formatLastContact(card.lastContactedAt)}</span>
          </div>
          {card.nextFollowUpAt && (
            <div className="text-xs text-orange-600 font-medium">
              Follow up: {new Date(card.nextFollowUpAt).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="w-full flex items-center justify-between rounded border border-gray-300 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            Quick actions
            <ChevronDown size={14} className={`transition-transform ${showActions ? "rotate-180" : ""}`} />
          </button>

          {showActions && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-gray-200 bg-white shadow-lg p-2 space-y-1">
              {card.contactPhone && (
                <button
                  onClick={() => {
                    onCall(card.id, card.contactPhone!);
                    setShowActions(false);
                  }}
                  className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-700 hover:bg-blue-50"
                >
                  <Phone size={14} />
                  Call
                </button>
              )}
              {card.contactPhone && (
                <button
                  onClick={() => {
                    onText(card.id, card.contactPhone!);
                    setShowActions(false);
                  }}
                  className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-700 hover:bg-green-50"
                >
                  <MessageSquare size={14} />
                  Text
                </button>
              )}
              {card.contactEmail && (
                <button
                  onClick={() => {
                    onEmail(card.id, card.contactEmail!);
                    setShowActions(false);
                  }}
                  className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-700 hover:bg-purple-50"
                >
                  <Mail size={14} />
                  Email
                </button>
              )}
              <button
                onClick={() => {
                  onMove(card.id);
                  setShowActions(false);
                }}
                className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-xs text-gray-700 hover:bg-amber-50"
              >
                <ArrowRight size={14} />
                Move stage
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PipelineColumn({
  column,
  onCardMove,
  onCardAction,
}: {
  column: PipelineColumn;
  onCardMove: (cardId: string, targetStage: CustomerLifecycleStage) => void;
  onCardAction: (cardId: string, action: string, data?: any) => void;
}) {
  const colors = STAGE_COLORS[column.stage];

  return (
    <div
      onDrop={(e) => {
        e.preventDefault();
        const cardId = e.dataTransfer.getData("cardId");
        onCardMove(cardId, column.stage);
      }}
      onDragOver={(e) => e.preventDefault()}
      className={`rounded-lg ${colors.bgColor} border-2 border-dashed border-gray-300 min-h-96 flex flex-col p-4`}
    >
      {/* Column Header */}
      <div className="mb-4 pb-3 border-b">
        <div className={`inline-block px-3 py-1 rounded-full font-bold text-white text-sm ${colors.color}`}>
          {column.count}
        </div>
        <h2 className="mt-2 font-bold text-gray-900">{column.title}</h2>
        <p className="text-sm text-gray-600">{column.subtitle}</p>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {column.cards.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            No leads in this stage
          </div>
        ) : (
          column.cards.map((card) => (
            <PipelineCard
              key={card.id}
              card={card}
              onMove={() => onCardAction(card.id, "move")}
              onCall={(id, phone) => onCardAction(id, "call", { phone })}
              onEmail={(id, email) => onCardAction(id, "email", { email })}
              onText={(id, phone) => onCardAction(id, "text", { phone })}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function PipelineBoard({ columns }: PipelineBoardProps) {
  const [isMoving, setIsMoving] = useState(false);

  const handleCardMove = useCallback(async (cardId: string, targetStage: CustomerLifecycleStage) => {
    setIsMoving(true);
    try {
      const res = await fetch("/api/crm/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: cardId, stage: targetStage }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to move card:", error);
    } finally {
      setIsMoving(false);
    }
  }, []);

  const handleCardAction = useCallback((cardId: string, action: string, data?: any) => {
    switch (action) {
      case "call":
        window.location.href = `tel:${data.phone}`;
        break;
      case "email":
        window.location.href = `mailto:${data.email}`;
        break;
      case "text":
        window.location.href = `sms:${data.phone}`;
        break;
      case "move":
        // Modal for selecting stage would go here
        console.log("Move card:", cardId);
        break;
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white p-6">
      <div className="max-w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">CRM Pipeline</h1>
          <p className="mt-2 text-gray-600">Manage your customer journey from cold lead to champion referrer</p>
        </div>

        {/* Pipeline Board */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4 overflow-x-auto">
          {columns.map((column) => (
            <PipelineColumn
              key={column.stage}
              column={column}
              onCardMove={handleCardMove}
              onCardAction={handleCardAction}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
