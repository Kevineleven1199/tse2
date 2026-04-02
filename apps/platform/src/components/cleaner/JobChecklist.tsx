"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

type ChecklistItem = {
  id: string;
  room: string;
  task: string;
  completed: boolean;
};

type ChecklistData = {
  items: ChecklistItem[];
  notes?: string;
  completedAt?: string;
};

const ROOM_ICONS: Record<string, string> = {
  Kitchen: "🍳",
  Bathrooms: "🚿",
  Bedrooms: "🛏️",
  "Living Areas": "🛋️",
  General: "✨",
};

const getRoomIcon = (room: string): string => {
  return ROOM_ICONS[room] || "📋";
};

interface JobChecklistProps {
  jobId: string;
  isAssignedCleaner: boolean;
}

export const JobChecklist = ({ jobId, isAssignedCleaner }: JobChecklistProps) => {
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch checklist on mount
  useEffect(() => {
    const fetchChecklist = async () => {
      try {
        const res = await fetch(`/api/checklist/${jobId}`);
        if (!res.ok) throw new Error("Failed to fetch checklist");
        const data = await res.json();
        setChecklist(data);
        setNotes(data.notes || "");
        // Expand first room by default
        if (data.items?.length > 0) {
          const firstRoom = data.items[0].room;
          setExpandedRooms(new Set([firstRoom]));
        }
      } catch (error) {
        console.error("Error fetching checklist:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChecklist();
  }, [jobId]);

  // Toggle room expansion
  const toggleRoom = (room: string) => {
    setExpandedRooms((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(room)) {
        newSet.delete(room);
      } else {
        newSet.add(room);
      }
      return newSet;
    });
  };

  // Handle task checkbox change
  const handleTaskToggle = async (itemId: string, completed: boolean) => {
    if (!checklist || !isAssignedCleaner) return;

    const newItems = checklist.items.map((item) =>
      item.id === itemId ? { ...item, completed } : item
    );

    setChecklist({ ...checklist, items: newItems });

    setSaving(true);
    try {
      const res = await fetch(`/api/checklist/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: newItems }),
      });

      if (!res.ok) {
        throw new Error("Failed to update checklist");
      }

      const updated = await res.json();
      setChecklist(updated);
    } catch (error) {
      console.error("Error updating checklist:", error);
      // Revert on error
      setChecklist({
        ...checklist,
        items: checklist.items.map((item) =>
          item.id === itemId ? { ...item, completed: !completed } : item
        ),
      });
    } finally {
      setSaving(false);
    }
  };

  // Auto-save notes on blur
  const handleNotesBlur = async () => {
    if (!checklist) return;

    // Clear previous timeout
    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
    }

    setNotesSaving(true);
    try {
      const res = await fetch(`/api/checklist/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: checklist.items, notes }),
      });

      if (!res.ok) {
        throw new Error("Failed to update notes");
      }

      const updated = await res.json();
      setChecklist(updated);
    } catch (error) {
      console.error("Error saving notes:", error);
    } finally {
      setNotesSaving(false);
    }
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);

    // Clear previous timeout
    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
    }

    // Set new timeout for auto-save on blur
    notesTimeoutRef.current = setTimeout(() => {
      handleNotesBlur();
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading checklist...
      </div>
    );
  }

  if (!checklist) {
    return (
      <Card className="rounded-2xl border-brand-200">
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">No checklist available</p>
        </CardContent>
      </Card>
    );
  }

  // Group items by room
  const itemsByRoom = new Map<string, ChecklistItem[]>();
  checklist.items.forEach((item) => {
    if (!itemsByRoom.has(item.room)) {
      itemsByRoom.set(item.room, []);
    }
    itemsByRoom.get(item.room)!.push(item);
  });

  // Calculate overall progress
  const totalTasks = checklist.items.length;
  const completedTasks = checklist.items.filter((item) => item.completed).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isAllComplete = totalTasks > 0 && completedTasks === totalTasks;

  // Sort rooms alphabetically
  const sortedRooms = Array.from(itemsByRoom.keys()).sort();

  return (
    <div className="space-y-6">
      {/* Celebration banner */}
      {isAllComplete && (
        <div className="rounded-2xl bg-gradient-to-r from-[#2E7D32]/10 to-[#2E7D32]/5 border border-[#2E7D32]/20 p-4">
          <p className="text-center font-semibold text-[#2E7D32] text-lg">
            🎉 All tasks complete! Great work!
          </p>
          {checklist.completedAt && (
            <p className="text-center text-sm text-[#2E7D32]/70 mt-1">
              Completed on {new Date(checklist.completedAt).toLocaleDateString()} at{" "}
              {new Date(checklist.completedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}

      {/* Overall progress bar */}
      <Card className="rounded-2xl border-brand-200">
        <CardHeader className="pb-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Overall Progress</h3>
              <span className="text-sm font-semibold text-accent">
                {completedTasks}/{totalTasks} tasks ({progressPercent}%)
              </span>
            </div>

            {/* Room summary line */}
            <div className="flex flex-wrap gap-2">
              {sortedRooms.map((room) => {
                const roomItems = itemsByRoom.get(room) || [];
                const roomCompleted = roomItems.filter((item) => item.completed).length;
                const isRoomDone = roomCompleted === roomItems.length && roomItems.length > 0;
                return (
                  <div
                    key={room}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                      isRoomDone
                        ? "bg-[#2E7D32]/10 text-[#2E7D32]"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {room}
                    {isRoomDone && " ✓"}
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="w-full bg-brand-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Room sections */}
      <div className="space-y-3">
        {sortedRooms.map((room) => {
          const roomItems = itemsByRoom.get(room) || [];
          const roomCompleted = roomItems.filter((item) => item.completed).length;
          const isExpanded = expandedRooms.has(room);

          return (
            <Card
              key={room}
              className={`rounded-2xl border transition-all ${
                isAllComplete || roomCompleted === roomItems.length
                  ? "border-brand-200 bg-brand-50/30"
                  : "border-brand-200 hover:border-brand-300"
              }`}
            >
              {/* Room header */}
              <button
                onClick={() => toggleRoom(room)}
                disabled={!isAssignedCleaner}
                className={`w-full px-4 py-3 flex items-center justify-between transition-colors min-h-[44px] ${
                  !isAssignedCleaner ? "cursor-default" : "hover:bg-brand-50/50 active:bg-brand-50/70"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 text-left">
                  <span className="text-xl">{getRoomIcon(room)}</span>
                  <div>
                    <h4 className="font-semibold text-gray-900">{room}</h4>
                    <p className="text-xs text-gray-600">
                      {roomCompleted}/{roomItems.length} tasks
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Room progress indicator */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-12 bg-brand-100 rounded-full h-2">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-300"
                        style={{
                          width: `${roomItems.length > 0 ? Math.round((roomCompleted / roomItems.length) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Expand/collapse chevron */}
                  <ChevronDown
                    className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {/* Room tasks */}
              {isExpanded && (
                <CardContent className="border-t border-brand-200 pt-3 pb-4">
                  <div className="space-y-2">
                    {roomItems.map((item) => (
                      <label
                        key={item.id}
                        className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors min-h-[44px] ${
                          isAssignedCleaner
                            ? "hover:bg-brand-50/50"
                            : "cursor-not-allowed opacity-60"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={(e) => handleTaskToggle(item.id, e.target.checked)}
                          disabled={!isAssignedCleaner || saving}
                          className="h-5 w-5 rounded-md border-brand-300 text-accent accent-[#2E7D32] mt-0.5 flex-shrink-0 disabled:opacity-50"
                        />
                        <span
                          className={`text-sm flex-1 ${
                            item.completed
                              ? "line-through text-gray-400"
                              : "text-gray-700"
                          }`}
                        >
                          {item.task}
                        </span>
                        {item.completed && (
                          <span className="text-lg flex-shrink-0">✓</span>
                        )}
                      </label>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Notes section */}
      <Card className="rounded-2xl border-brand-200">
        <CardHeader className="pb-3">
          <h4 className="font-semibold text-gray-900">Notes</h4>
        </CardHeader>
        <CardContent>
          <textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            onBlur={handleNotesBlur}
            disabled={!isAssignedCleaner}
            placeholder={
              isAssignedCleaner
                ? "Add any notes about the job..."
                : "No notes added"
            }
            className={`w-full p-3 border rounded-xl text-sm resize-none min-h-[100px] transition-colors ${
              isAssignedCleaner
                ? "border-brand-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                : "border-brand-100 bg-gray-50 text-gray-500 cursor-not-allowed"
            }`}
          />
          {notesSaving && (
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving notes...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
