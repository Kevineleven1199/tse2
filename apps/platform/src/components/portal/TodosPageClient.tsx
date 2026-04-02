"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/src/lib/utils";
import {
  Check,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Search,
  Filter,
  GripVertical,
  Calendar,
  Clock,
  Edit2,
  X,
  ChevronDown,
  ChevronRight,
  Pin,
  StickyNote,
  ListTodo,
  MoreHorizontal,
  Star,
  AlertCircle,
} from "lucide-react";

type Todo = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  completedAt: string | null;
  priority: number;
  dueDate: string | null;
  isShared: boolean;
  assignedTo: string | null;
  category: string | null;
  userId: string;
  createdAt: string;
};

type Note = {
  id: string;
  content: string;
  pinned: boolean;
  isShared: boolean;
  relatedId: string | null;
  relatedType: string | null;
  checklist: { text: string; checked: boolean }[] | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  color?: string;
};

type LocalTodoState = Todo & {
  isAnimatingComplete?: boolean;
  shouldFadeOut?: boolean;
};

export default function TodosPageClient({ userId, userName, role }: { userId: string; userName: string; role: string }) {
  // Todo state
  const [todos, setTodos] = useState<LocalTodoState[]>([]);
  const [completedTodos, setCompletedTodos] = useState<LocalTodoState[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [stats, setStats] = useState<any>(null);

  // UI state
  const [view, setView] = useState<"all" | "personal" | "shared">("all");
  const [showCompleted, setShowCompleted] = useState(false);
  const [tab, setTab] = useState<"todos" | "notes">("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [groupBy, setGroupBy] = useState<"none" | "priority" | "category" | "dueDate">("none");
  const [selectedTodos, setSelectedTodos] = useState<Set<string>>(new Set());
  const [expandedTodo, setExpandedTodo] = useState<string | null>(null);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoTitle, setEditingTodoTitle] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  const [dragOverTodoId, setDragOverTodoId] = useState<string | null>(null);

  // Todo creation state
  const [newTodo, setNewTodo] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState(2);
  const [newTodoShared, setNewTodoShared] = useState(false);
  const [newTodoDue, setNewTodoDue] = useState("");
  const [newTodoCategory, setNewTodoCategory] = useState("");
  const [newTodoDescription, setNewTodoDescription] = useState("");

  // Note creation state
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteShared, setNoteShared] = useState(false);
  const [noteColor, setNoteColor] = useState<string>("yellow");
  const [noteChecklist, setNoteChecklist] = useState<{ text: string; checked: boolean }[]>([]);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [noteSearch, setNoteSearch] = useState("");

  const fadeOutTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTodos = useCallback(async () => {
    const params = new URLSearchParams({
      userId,
      view,
      showCompleted: String(showCompleted),
    });
    const res = await fetch(`/api/todos?${params}`);
    const data = await res.json();
    setTodos(data.todos || []);
    setCompletedTodos(data.completed || []);
    setStats(data.stats || null);
  }, [userId, view, showCompleted]);

  const fetchNotes = useCallback(async () => {
    const params = new URLSearchParams({
      userId,
      view: view === "all" ? "all" : view,
    });
    const res = await fetch(`/api/notes?${params}`);
    const data = await res.json();
    setNotes(data.notes || []);
  }, [userId, view]);

  useEffect(() => {
    if (tab === "todos") fetchTodos();
    else fetchNotes();
  }, [tab, fetchTodos, fetchNotes]);

  // ─── TODO HANDLERS ─────────────────────────────────────────

  const addTodo = async () => {
    if (!newTodo.trim()) return;
    await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        userId,
        tenantId: "default",
        title: newTodo,
        description: newTodoDescription || null,
        priority: newTodoPriority,
        isShared: newTodoShared,
        dueDate: newTodoDue || null,
        category: newTodoCategory || null,
      }),
    });
    setNewTodo("");
    setNewTodoDue("");
    setNewTodoCategory("");
    setNewTodoDescription("");
    fetchTodos();
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    // Optimistic UI update - mark as completing with animation
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, completed: !t.completed, isAnimatingComplete: true }
          : t
      )
    );

    // Server update
    await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", id }),
    });

    // If completing, show strikethrough + green check for 1.5s, then fade out
    if (!todo.completed) {
      // Schedule fade out after 1.5s
      const timer = setTimeout(() => {
        setTodos((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, shouldFadeOut: true } : t
          )
        );
        // Remove from view after fade animation (300ms)
        const removeTimer = setTimeout(() => {
          setTodos((prev) => prev.filter((t) => t.id !== id));
          fetchTodos();
        }, 300);
        fadeOutTimerRef.current = removeTimer;
      }, 1500);
      fadeOutTimerRef.current = timer;
    } else {
      // If uncompleting, just refresh
      fetchTodos();
    }
  };

  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        id,
        ...updates,
      }),
    });
    setEditingTodoId(null);
    fetchTodos();
  };

  const deleteTodo = async (id: string) => {
    await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    setShowDeleteConfirm(null);
    fetchTodos();
  };

  const bulkMarkComplete = async () => {
    const promises = Array.from(selectedTodos).map((id) =>
      fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", id }),
      })
    );
    await Promise.all(promises);
    setSelectedTodos(new Set());
    fetchTodos();
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedTodos.size} todos?`)) return;
    const promises = Array.from(selectedTodos).map((id) =>
      fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      })
    );
    await Promise.all(promises);
    setSelectedTodos(new Set());
    fetchTodos();
  };

  // ─── NOTE HANDLERS ────────────────────────────────────────

  const addNote = async () => {
    if (!noteContent.trim() && noteChecklist.length === 0) return;
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        userId,
        tenantId: "default",
        content: noteContent,
        isShared: noteShared,
        color: noteColor,
        checklist: noteChecklist.length > 0 ? noteChecklist : null,
      }),
    });
    setNoteContent("");
    setNoteChecklist([]);
    setNoteColor("yellow");
    setShowAddNote(false);
    fetchNotes();
  };

  const updateNote = async (noteId: string, updates: Partial<Note>) => {
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id: noteId, ...updates }),
    });
    fetchNotes();
  };

  const toggleCheckItem = async (noteId: string, checkIndex: number) => {
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_check", id: noteId, checkIndex }),
    });
    fetchNotes();
  };

  const pinNote = async (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    await updateNote(noteId, { pinned: !note.pinned });
  };

  const deleteNote = async (noteId: string) => {
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: noteId }),
    });
    fetchNotes();
  };

  // ─── UTILITY FUNCTIONS ────────────────────────────────────

  const getPriorityBadge = (priority: number) => {
    if (priority === 1) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (priority === 2) return <Clock className="h-4 w-4 text-amber-500" />;
    return <Circle className="h-4 w-4 text-blue-500" />;
  };

  const getDueDateStatus = (dueDate: string | null) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const diffTime = dueDay.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "overdue";
    if (diffDays === 0) return "today";
    if (diffDays <= 3) return "soon";
    return "upcoming";
  };

  const getDueDateColor = (status: string | null) => {
    if (status === "overdue") return "bg-red-100 text-red-700";
    if (status === "today") return "bg-amber-100 text-amber-700";
    if (status === "soon") return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-600";
  };

  const categoryLabel = (c: string | null) => {
    const map: Record<string, string> = {
      follow_up: "Follow Up",
      scheduling: "Scheduling",
      billing: "Billing",
      general: "General",
    };
    return c ? map[c] || c : "";
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  const formatDateTime = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  // ─── FILTERING & GROUPING ─────────────────────────────────

  const filteredTodos = todos.filter((todo) =>
    todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (todo.description &&
      todo.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupedTodos = (() => {
    if (groupBy === "none") return { ungrouped: filteredTodos };
    if (groupBy === "priority") {
      return {
        "Urgent": filteredTodos.filter((t) => t.priority === 1),
        "Normal": filteredTodos.filter((t) => t.priority === 2),
        "Low": filteredTodos.filter((t) => t.priority === 3),
      };
    }
    if (groupBy === "category") {
      const groups: Record<string, LocalTodoState[]> = {};
      filteredTodos.forEach((todo) => {
        const cat = categoryLabel(todo.category) || "Uncategorized";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(todo);
      });
      return groups;
    }
    if (groupBy === "dueDate") {
      const groups: Record<string, LocalTodoState[]> = {
        "Overdue": [],
        "Today": [],
        "This Week": [],
        "Later": [],
      };
      filteredTodos.forEach((todo) => {
        const status = getDueDateStatus(todo.dueDate);
        if (status === "overdue") groups["Overdue"].push(todo);
        else if (status === "today") groups["Today"].push(todo);
        else if (status === "soon") groups["This Week"].push(todo);
        else groups["Later"].push(todo);
      });
      return groups;
    }
    return { ungrouped: filteredTodos };
  })();

  const filteredNotes = notes.filter(
    (note) =>
      note.content.toLowerCase().includes(noteSearch.toLowerCase()) ||
      note.tags.some((tag) =>
        tag.toLowerCase().includes(noteSearch.toLowerCase())
      )
  );

  const pinnedNotes = filteredNotes.filter((n) => n.pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.pinned);

  const getNoteColorBg = (color: string) => {
    const colors: Record<string, string> = {
      yellow: "bg-yellow-50 border-yellow-200",
      green: "bg-green-50 border-green-200",
      blue: "bg-blue-50 border-blue-200",
      purple: "bg-purple-50 border-purple-200",
      pink: "bg-pink-50 border-pink-200",
      gray: "bg-gray-50 border-gray-200",
    };
    return colors[color] || colors.yellow;
  };

  const completionPercentage =
    stats && stats.total > 0
      ? Math.round((stats.completed / stats.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(-20px);
            opacity: 0;
          }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes checkScale {
          0% { transform: scale(0.8); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes greenFlash {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(34, 197, 94, 0.1); }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out forwards;
        }
        .animate-fade-out {
          animation: fadeOut 0.3s ease-out forwards;
        }
        .animate-check-scale {
          animation: checkScale 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        }
        .animate-green-flash {
          animation: greenFlash 0.6s ease-out;
        }
      `}</style>

      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-purple-700 p-8 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-violet-200">Workspace</p>
        <div className="flex items-end justify-between mt-2">
          <div>
            <h1 className="text-3xl font-bold">To-Dos & Notes</h1>
            <p className="mt-1 text-sm text-violet-100">
              Smart task management for {userName}
            </p>
          </div>
          {stats && (
            <div className="text-right">
              <p className="text-3xl font-bold">{completionPercentage}%</p>
              <p className="text-xs text-violet-200">Complete</p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {stats && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full bg-green-400 transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        )}
      </div>

      {/* Tab Switch */}
      <div className="flex items-center gap-4">
        <div className="flex rounded-2xl bg-white border border-brand-100 p-1 shadow-sm">
          <button
            onClick={() => setTab("todos")}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-all",
              tab === "todos"
                ? "bg-violet-600 text-white shadow"
                : "text-muted-foreground hover:bg-violet-50"
            )}
          >
            <ListTodo className="inline h-4 w-4 mr-1.5" />
            To-Dos
            {stats && (
              <span className="ml-2 inline-block bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold">
                {stats.completed > 0 ? `${stats.completed}` : stats.total}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("notes")}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-all",
              tab === "notes"
                ? "bg-violet-600 text-white shadow"
                : "text-muted-foreground hover:bg-violet-50"
            )}
          >
            <StickyNote className="inline h-4 w-4 mr-1.5" />
            Notes ({notes.length})
          </button>
        </div>

        {/* View Filters */}
        <div className="ml-auto flex gap-2">
          {(["all", "personal", "shared"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                view === v
                  ? "bg-violet-600 text-white shadow"
                  : "bg-white border border-brand-200 text-brand-700 hover:border-violet-300"
              )}
            >
              {v === "all" ? "All" : v === "personal" ? "My Items" : "Shared"}
            </button>
          ))}
        </div>
      </div>

      {/* ─── TODOS TAB ─── */}
      {tab === "todos" && (
        <div className="space-y-6">
          {/* Quick Add Bar */}
          <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                placeholder="Add a new task..."
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTodo()}
                className="flex-1 rounded-lg border border-brand-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition"
              />
              <select
                value={newTodoPriority}
                onChange={(e) => setNewTodoPriority(parseInt(e.target.value))}
                className="rounded-lg border border-brand-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <option value={1}>Urgent</option>
                <option value={2}>Normal</option>
                <option value={3}>Low</option>
              </select>
              <button
                onClick={addTodo}
                className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-700 active:scale-95 transition"
              >
                <Plus className="inline h-4 w-4 mr-1.5" />
                Add
              </button>
            </div>

            {/* Secondary controls */}
            <div className="flex flex-wrap gap-2">
              <input
                type="date"
                value={newTodoDue}
                onChange={(e) => setNewTodoDue(e.target.value)}
                className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <select
                value={newTodoCategory}
                onChange={(e) => setNewTodoCategory(e.target.value)}
                className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <option value="">Category</option>
                <option value="follow_up">Follow Up</option>
                <option value="scheduling">Scheduling</option>
                <option value="billing">Billing</option>
                <option value="general">General</option>
              </select>
              <label className="flex items-center gap-2 text-xs text-muted-foreground hover:text-accent cursor-pointer">
                <input
                  type="checkbox"
                  checked={newTodoShared}
                  onChange={(e) => setNewTodoShared(e.target.checked)}
                  className="rounded"
                />
                Share
              </label>
              <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground hover:text-accent cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                  className="rounded"
                />
                Show completed
              </label>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Open",
                  value: stats.total - stats.completed,
                  icon: ListTodo,
                  color: "text-violet-600",
                  bg: "bg-violet-50",
                },
                {
                  label: "Completed",
                  value: stats.completed,
                  icon: CheckCircle2,
                  color: "text-green-600",
                  bg: "bg-green-50",
                },
                {
                  label: "Overdue",
                  value: stats.overdue,
                  icon: AlertCircle,
                  color: "text-red-600",
                  bg: "bg-red-50",
                },
                {
                  label: "Urgent",
                  value: stats.urgent,
                  icon: Star,
                  color: "text-orange-600",
                  bg: "bg-orange-50",
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className={cn(
                      "rounded-xl border border-brand-100 p-4 transition hover:shadow-md",
                      stat.bg
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-2xl font-bold ${stat.color}`}>
                          {stat.value}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {stat.label}
                        </p>
                      </div>
                      <Icon className={`h-5 w-5 ${stat.color} opacity-50`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search todos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-brand-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <select
              value={groupBy}
              onChange={(e) =>
                setGroupBy(e.target.value as "none" | "priority" | "category" | "dueDate")
              }
              className="rounded-lg border border-brand-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="none">No grouping</option>
              <option value="priority">Group by Priority</option>
              <option value="category">Group by Category</option>
              <option value="dueDate">Group by Due Date</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedTodos.size > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
              <span className="text-sm font-medium text-blue-900">
                {selectedTodos.size} selected
              </span>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={bulkMarkComplete}
                  className="text-sm px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
                >
                  Mark Complete
                </button>
                <button
                  onClick={bulkDelete}
                  className="text-sm px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedTodos(new Set())}
                  className="text-sm px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Todo Lists by Group */}
          {filteredTodos.length === 0 ? (
            <div className="text-center py-12">
              <ListTodo className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "No todos match your search"
                  : "No tasks yet. Add one above!"}
              </p>
            </div>
          ) : (
            Object.entries(groupedTodos).map(([groupName, groupTodos]) => (
              <div key={groupName} className="space-y-2">
                {groupBy !== "none" && (
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground px-2">
                    {groupName} ({groupTodos.length})
                  </h3>
                )}

                <div className="rounded-2xl border border-brand-100 bg-white divide-y divide-brand-50 overflow-hidden shadow-sm">
                  {groupTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className={cn(
                        "transition-all duration-300",
                        todo.shouldFadeOut && "animate-fade-out",
                        todo.isAnimatingComplete && "animate-green-flash"
                      )}
                    >
                      <div
                        draggable
                        onDragStart={() => setDraggedTodoId(todo.id)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverTodoId(todo.id);
                        }}
                        onDragLeave={() => setDragOverTodoId(null)}
                        onDrop={() => {
                          // Reordering logic would go here
                          setDragOverTodoId(null);
                          setDraggedTodoId(null);
                        }}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3.5 hover:bg-violet-50 transition cursor-grab active:cursor-grabbing group",
                          todo.completed && "bg-gray-50",
                          dragOverTodoId === todo.id && "bg-blue-50 border-l-2 border-blue-400"
                        )}
                      >
                        {/* Drag Handle */}
                        <div className="opacity-0 group-hover:opacity-100 transition">
                          <GripVertical className="h-4 w-4 text-gray-400 mt-0.5" />
                        </div>

                        {/* Checkbox */}
                        <button
                          onClick={() => toggleTodo(todo.id)}
                          className={cn(
                            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all",
                            todo.completed
                              ? "border-green-500 bg-green-500 text-white animate-check-scale"
                              : "border-brand-300 hover:border-violet-500 hover:bg-violet-50"
                          )}
                        >
                          {todo.completed && (
                            <Check className="h-4 w-4" />
                          )}
                          {selectedTodos.has(todo.id) && !todo.completed && (
                            <div className="h-2 w-2 rounded-full bg-violet-600" />
                          )}
                        </button>

                        {/* Multiple selection checkbox */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newSelected = new Set(selectedTodos);
                            if (newSelected.has(todo.id)) {
                              newSelected.delete(todo.id);
                            } else {
                              newSelected.add(todo.id);
                            }
                            setSelectedTodos(newSelected);
                          }}
                          className="hidden"
                        />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {editingTodoId === todo.id ? (
                            <input
                              autoFocus
                              value={editingTodoTitle}
                              onChange={(e) =>
                                setEditingTodoTitle(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  updateTodo(todo.id, {
                                    title: editingTodoTitle,
                                  });
                                } else if (e.key === "Escape") {
                                  setEditingTodoId(null);
                                }
                              }}
                              onBlur={() => {
                                if (editingTodoTitle !== todo.title) {
                                  updateTodo(todo.id, {
                                    title: editingTodoTitle,
                                  });
                                } else {
                                  setEditingTodoId(null);
                                }
                              }}
                              className="w-full border-b-2 border-violet-400 bg-transparent px-1 py-0.5 text-sm focus:outline-none"
                            />
                          ) : (
                            <>
                              <div className="flex items-center gap-2.5">
                                <span className="shrink-0">
                                  {getPriorityBadge(todo.priority)}
                                </span>
                                <p
                                  onClick={() => {
                                    setEditingTodoId(todo.id);
                                    setEditingTodoTitle(todo.title);
                                  }}
                                  className={cn(
                                    "text-sm font-medium cursor-text hover:bg-violet-50 px-1 rounded transition",
                                    todo.completed &&
                                      "line-through text-muted-foreground"
                                  )}
                                >
                                  {todo.title}
                                </p>
                              </div>

                              {/* Todo metadata */}
                              <div className="mt-2 flex flex-wrap gap-2">
                                {todo.isShared && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
                                    <Star className="h-3 w-3" />
                                    Shared
                                  </span>
                                )}
                                {todo.category && (
                                  <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700">
                                    {categoryLabel(todo.category)}
                                  </span>
                                )}
                                {todo.dueDate && (
                                  <span
                                    className={cn(
                                      "rounded-full px-2.5 py-1 text-xs font-medium inline-flex items-center gap-1",
                                      getDueDateColor(
                                        getDueDateStatus(todo.dueDate)
                                      )
                                    )}
                                  >
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(todo.dueDate)}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Expand/Edit Controls */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() =>
                              setExpandedTodo(
                                expandedTodo === todo.id ? null : todo.id
                              )
                            }
                            className="p-1 hover:bg-violet-100 rounded transition"
                            title="Expand details"
                          >
                            {expandedTodo === todo.id ? (
                              <ChevronDown className="h-4 w-4 text-gray-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingTodoId(todo.id);
                              setEditingTodoTitle(todo.title);
                            }}
                            className="p-1 hover:bg-violet-100 rounded transition"
                            title="Edit todo"
                          >
                            <Edit2 className="h-4 w-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(todo.id)}
                            className="p-1 hover:bg-red-100 rounded transition"
                            title="Delete todo"
                          >
                            <Trash2 className="h-4 w-4 text-gray-600 hover:text-red-600" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedTodo === todo.id && (
                        <div className="px-4 py-3 bg-violet-50 border-t border-brand-100 space-y-2 text-sm">
                          {todo.description && (
                            <div>
                              <p className="font-medium text-muted-foreground">
                                Description
                              </p>
                              <p className="text-accent whitespace-pre-wrap">
                                {todo.description}
                              </p>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="font-medium text-muted-foreground">
                                Created
                              </p>
                              <p className="text-accent">
                                {formatDateTime(todo.createdAt)}
                              </p>
                            </div>
                            {todo.completedAt && (
                              <div>
                                <p className="font-medium text-muted-foreground">
                                  Completed
                                </p>
                                <p className="text-green-600">
                                  {formatDateTime(todo.completedAt)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Delete Confirmation */}
                      {showDeleteConfirm === todo.id && (
                        <div className="px-4 py-3 bg-red-50 border-t border-red-200 flex items-center justify-between">
                          <p className="text-sm font-medium text-red-900">
                            Delete this todo?
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                setShowDeleteConfirm(null)
                              }
                              className="text-xs px-3 py-1 rounded bg-white border border-red-200 hover:bg-gray-50 transition"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() =>
                                deleteTodo(todo.id)
                              }
                              className="text-xs px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── NOTES TAB ─── */}
      {tab === "notes" && (
        <div className="space-y-6">
          {/* Add Note Button */}
          <button
            onClick={() => setShowAddNote(true)}
            className="w-full rounded-2xl border-2 border-dashed border-brand-200 bg-white p-6 text-sm text-muted-foreground hover:border-violet-300 hover:bg-violet-50 transition flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add a new note or checklist
          </button>

          {/* Add Note Modal */}
          {showAddNote && (
            <div className="rounded-2xl border border-violet-200 bg-white p-6 shadow-lg space-y-4">
              <textarea
                placeholder="Write your note..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="w-full rounded-lg border border-brand-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                rows={4}
              />

              {/* Checklist Builder */}
              {(
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Checklist Items
                  </p>
                  {noteChecklist.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Circle className="h-4 w-4 text-gray-300" />
                      <span className="text-sm flex-1">{item.text}</span>
                      <button
                        onClick={() =>
                          setNoteChecklist((cl) =>
                            cl.filter((_, idx) => idx !== i)
                          )
                        }
                        className="text-xs text-red-500 hover:text-red-700 transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      placeholder="Add checklist item..."
                      value={newCheckItem}
                      onChange={(e) => setNewCheckItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newCheckItem.trim()) {
                          setNoteChecklist((cl) => [
                            ...cl,
                            { text: newCheckItem.trim(), checked: false },
                          ]);
                          setNewCheckItem("");
                        }
                      }}
                      className="flex-1 rounded border border-brand-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                    <button
                      onClick={() => {
                        if (newCheckItem.trim()) {
                          setNoteChecklist((cl) => [
                            ...cl,
                            {
                              text: newCheckItem.trim(),
                              checked: false,
                            },
                          ]);
                          setNewCheckItem("");
                        }
                      }}
                      className="text-xs px-3 py-1.5 rounded bg-violet-100 text-violet-700 hover:bg-violet-200 transition"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Color picker */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Color
                </p>
                <div className="flex gap-2">
                  {(["yellow", "green", "blue", "purple", "pink", "gray"] as const).map(
                    (color) => (
                      <button
                        key={color}
                        onClick={() => setNoteColor(color)}
                        className={cn(
                          "h-6 w-6 rounded-full border-2 transition",
                          getNoteColorBg(color).split(" ")[0],
                          noteColor === color
                            ? "border-gray-900 scale-110"
                            : "border-transparent hover:scale-110"
                        )}
                      />
                    )
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3 pt-2 border-t border-brand-100">
                <label className="flex items-center gap-2 text-xs text-muted-foreground hover:text-accent cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noteShared}
                    onChange={(e) => setNoteShared(e.target.checked)}
                    className="rounded"
                  />
                  Share with team
                </label>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => setShowAddNote(false)}
                    className="text-xs px-4 py-1.5 rounded-lg border border-brand-200 text-muted-foreground hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addNote}
                    className="text-xs px-4 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search Notes */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notes..."
              value={noteSearch}
              onChange={(e) => setNoteSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-brand-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          {/* Notes Display */}
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <StickyNote className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-muted-foreground">
                {noteSearch
                  ? "No notes match your search"
                  : "No notes yet. Add one above!"}
              </p>
            </div>
          ) : (
            <>
              {/* Pinned Notes */}
              {pinnedNotes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground px-2">
                    Pinned
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {pinnedNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onPin={pinNote}
                        onDelete={deleteNote}
                        onUpdateCheckItem={toggleCheckItem}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Unpinned Notes */}
              {unpinnedNotes.length > 0 && (
                <div className="space-y-2">
                  {pinnedNotes.length > 0 && (
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground px-2">
                      All Notes
                    </h3>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {unpinnedNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        onPin={pinNote}
                        onDelete={deleteNote}
                        onUpdateCheckItem={toggleCheckItem}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── NOTE CARD COMPONENT ──────────────────────────────────

interface NoteCardProps {
  note: Note;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateCheckItem: (noteId: string, checkIndex: number) => void;
}

function NoteCard({
  note,
  onPin,
  onDelete,
  onUpdateCheckItem,
}: NoteCardProps) {
  const getNoteColorBg = (color: string) => {
    const colors: Record<string, string> = {
      yellow: "bg-yellow-50 border-yellow-200",
      green: "bg-green-50 border-green-200",
      blue: "bg-blue-50 border-blue-200",
      purple: "bg-purple-50 border-purple-200",
      pink: "bg-pink-50 border-pink-200",
      gray: "bg-gray-50 border-gray-200",
    };
    return colors[note.color || "yellow"] || colors.yellow;
  };

  const getNoteColorDot = (color: string) => {
    const colors: Record<string, string> = {
      yellow: "bg-yellow-400",
      green: "bg-green-400",
      blue: "bg-blue-400",
      purple: "bg-purple-400",
      pink: "bg-pink-400",
      gray: "bg-gray-400",
    };
    return colors[note.color || "yellow"] || colors.yellow;
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition hover:shadow-md group",
        getNoteColorBg(note.color || "gray")
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn("h-2 w-2 rounded-full", getNoteColorDot(note.color || "gray"))}
          />
          {note.isShared && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600">
              Shared
            </span>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={() => onPin(note.id)}
            className="p-1 hover:bg-white/50 rounded transition"
            title={note.pinned ? "Unpin" : "Pin"}
          >
            <Pin
              className={cn(
                "h-4 w-4 transition",
                note.pinned
                  ? "fill-current text-violet-600"
                  : "text-gray-400"
              )}
            />
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="p-1 hover:bg-white/50 rounded transition"
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
          </button>
        </div>
      </div>

      {note.content && (
        <p className="text-sm text-accent whitespace-pre-wrap line-clamp-4">
          {note.content}
        </p>
      )}

      {note.checklist && note.checklist.length > 0 && (
        <div className="mt-3 space-y-1">
          {note.checklist.map((item, i) => (
            <button
              key={i}
              onClick={() => onUpdateCheckItem(note.id, i)}
              className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-sm hover:bg-white/30 transition"
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
                  item.checked
                    ? "border-green-500 bg-green-500 text-white text-[10px]"
                    : "border-gray-300"
                )}
              >
                {item.checked && <Check className="h-3 w-3" />}
              </span>
              <span
                className={cn(
                  "text-xs",
                  item.checked && "line-through text-muted-foreground"
                )}
              >
                {item.text}
              </span>
            </button>
          ))}
          <p className="text-xs text-muted-foreground mt-2">
            {note.checklist.filter((i) => i.checked).length}/
            {note.checklist.length} done
          </p>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        {new Date(note.updatedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}
