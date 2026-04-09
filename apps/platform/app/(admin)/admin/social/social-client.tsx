"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar as CalendarIcon, Plus, Send, Clock, CheckCircle2, XCircle, Sparkles, ChevronLeft, ChevronRight, Zap, Grid3x3, List, Trash2, Edit2 } from "lucide-react";

const PLATFORM_META: Record<string, { label: string; icon: string; color: string; maxChars: number; postsPerWeek: number }> = {
  FACEBOOK: { label: "Facebook", icon: "\uD83D\uDCD8", color: "bg-blue-100 text-blue-700 border-blue-300", maxChars: 500, postsPerWeek: 5 },
  INSTAGRAM: { label: "Instagram", icon: "\uD83D\uDCF7", color: "bg-pink-100 text-pink-700 border-pink-300", maxChars: 2200, postsPerWeek: 5 },
  TWITTER_X: { label: "X / Twitter", icon: "\u2B1B", color: "bg-gray-100 text-gray-700 border-gray-300", maxChars: 280, postsPerWeek: 25 },
  TIKTOK: { label: "TikTok", icon: "\uD83C\uDFB5", color: "bg-red-100 text-red-700 border-red-300", maxChars: 2200, postsPerWeek: 10 },
  LINKEDIN: { label: "LinkedIn", icon: "\uD83D\uDCBC", color: "bg-sky-100 text-sky-700 border-sky-300", maxChars: 3000, postsPerWeek: 3 },
  GOOGLE_BUSINESS: { label: "Google Business", icon: "\uD83D\uDD35", color: "bg-red-50 text-red-600 border-red-200", maxChars: 1500, postsPerWeek: 3 },
  YOUTUBE: { label: "YouTube", icon: "\u25B6\uFE0F", color: "bg-red-100 text-red-700 border-red-300", maxChars: 5000, postsPerWeek: 2 },
  PINTEREST: { label: "Pinterest", icon: "\uD83D\uDCCC", color: "bg-red-100 text-red-700 border-red-300", maxChars: 500, postsPerWeek: 25 },
  NEXTDOOR: { label: "Nextdoor", icon: "\uD83C\uDFE1", color: "bg-lime-100 text-lime-700 border-lime-300", maxChars: 1000, postsPerWeek: 2 },
  THREADS: { label: "Threads", icon: "\uD83E\uDDF5", color: "bg-gray-100 text-gray-800 border-gray-300", maxChars: 500, postsPerWeek: 10 },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-600" },
  SCHEDULED: { label: "Scheduled", color: "bg-amber-100 text-amber-700" },
  PUBLISHING: { label: "Publishing...", color: "bg-blue-100 text-blue-700" },
  PUBLISHED: { label: "Published", color: "bg-green-100 text-green-700" },
  FAILED: { label: "Failed", color: "bg-red-100 text-red-700" },
};

type SocialPost = {
  id: string;
  platform: string;
  content: string;
  hashtags: string[];
  mediaUrls: string[];
  status: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  aiGenerated: boolean;
  blogPostId: string | null;
  errorMessage: string | null;
  createdAt: string;
};

type ViewMode = "calendar" | "list";

export function SocialClient() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("calendar");
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay()); // Sunday
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [filter, setFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [showComposer, setShowComposer] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [newPost, setNewPost] = useState({
    platforms: ["FACEBOOK"] as string[],
    content: "",
    scheduledFor: "",
    mediaUrls: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchPosts = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (platformFilter !== "all") params.set("platform", platformFilter);
    const res = await fetch(`/api/admin/social-posts?${params}`);
    if (res.ok) {
      const data = await res.json();
      setPosts(data.posts || []);
    }
    setLoading(false);
  }, [filter, platformFilter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const bulkGenerate = async () => {
    if (generating) return;
    if (!confirm("Generate a full week of content across ALL platforms? This will create 60+ posts using AI.")) return;
    setGenerating(true);
    const res = await fetch("/api/admin/social-posts/bulk-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart: weekStart.toISOString() }),
    });
    if (res.ok) {
      const data = await res.json();
      alert(`Generated ${data.totalGenerated} posts across ${Object.keys(data.byPlatform).length} platforms!`);
      fetchPosts();
    } else {
      alert("Failed to generate content. Check API keys and try again.");
    }
    setGenerating(false);
  };

  const createPost = async () => {
    if (!newPost.content.trim() || saving || newPost.platforms.length === 0) return;
    setSaving(true);

    // Create one post per selected platform
    const promises = newPost.platforms.map((platform) =>
      fetch("/api/admin/social-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          content: newPost.content,
          mediaUrls: newPost.mediaUrls,
          scheduledFor: newPost.scheduledFor || null,
        }),
      })
    );

    await Promise.all(promises);
    setShowComposer(false);
    setNewPost({ platforms: ["FACEBOOK"], content: "", scheduledFor: "", mediaUrls: [] });
    fetchPosts();
    setSaving(false);
  };

  const publishNow = async (id: string) => {
    if (!confirm("Publish this post immediately?")) return;
    const res = await fetch(`/api/admin/social-posts/${id}`, { method: "POST" });
    if (res.ok) fetchPosts();
  };

  const deletePost = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    const res = await fetch(`/api/admin/social-posts/${id}`, { method: "DELETE" });
    if (res.ok) fetchPosts();
  };

  const togglePlatform = (platform: string) => {
    setNewPost((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  // Group posts by day for calendar view
  const postsByDay: Record<string, SocialPost[]> = {};
  for (const post of posts) {
    if (!post.scheduledFor) continue;
    const key = new Date(post.scheduledFor).toISOString().slice(0, 10);
    if (!postsByDay[key]) postsByDay[key] = [];
    postsByDay[key].push(post);
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const totalScheduled = posts.filter((p) => p.status === "SCHEDULED").length;
  const totalPublished = posts.filter((p) => p.status === "PUBLISHED").length;
  const totalFailed = posts.filter((p) => p.status === "FAILED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-accent flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" /> Social Media Content Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage 10 platforms \u00B7 {totalScheduled} scheduled \u00B7 {totalPublished} published \u00B7 {totalFailed} failed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={bulkGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
            title="Generate a full week of AI content across all platforms"
          >
            <Zap className="h-4 w-4" /> {generating ? "Generating..." : "AI Generate Week"}
          </button>
          <button
            onClick={() => setShowComposer(!showComposer)}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> New Post
          </button>
        </div>
      </div>

      {/* Stats grid — recommended posts per week per platform */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {Object.entries(PLATFORM_META).map(([key, meta]) => {
          const platformPosts = posts.filter((p) => p.platform === key);
          const scheduledCount = platformPosts.filter((p) => {
            if (!p.scheduledFor) return false;
            const d = new Date(p.scheduledFor);
            const end = new Date(weekStart);
            end.setDate(end.getDate() + 7);
            return d >= weekStart && d < end;
          }).length;
          const progressPct = Math.min((scheduledCount / meta.postsPerWeek) * 100, 100);

          return (
            <button
              key={key}
              onClick={() => setPlatformFilter(platformFilter === key ? "all" : key)}
              className={`text-left rounded-xl border p-3 transition ${platformFilter === key ? meta.color + " ring-2 ring-accent/30" : "bg-white border-brand-100 hover:border-brand-200"}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg">{meta.icon}</span>
                <span className="text-[10px] font-medium text-muted-foreground">{scheduledCount}/{meta.postsPerWeek}</span>
              </div>
              <p className="text-xs font-semibold truncate">{meta.label}</p>
              <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Composer */}
      {showComposer && (
        <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-accent">New Social Post</h3>
            <button onClick={() => setShowComposer(false)} className="text-muted-foreground hover:text-accent">
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Post to which platforms?</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PLATFORM_META).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => togglePlatform(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                    newPost.platforms.includes(key) ? meta.color + " ring-2 ring-accent/30" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {meta.icon} {meta.label}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <textarea
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              placeholder="Write your post..."
              rows={4}
              className="w-full rounded-xl border border-brand-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
            />
            <span className="absolute bottom-3 right-3 text-xs text-muted-foreground">
              {newPost.content.length} chars
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Schedule for</label>
              <input
                type="datetime-local"
                value={newPost.scheduledFor}
                onChange={(e) => setNewPost({ ...newPost, scheduledFor: e.target.value })}
                className="mt-1 block rounded-lg border border-brand-100 px-3 py-1.5 text-sm"
              />
            </div>
            <div className="flex-1" />
            <button onClick={() => setShowComposer(false)} className="rounded-full px-4 py-2 text-sm border border-brand-100 hover:bg-brand-50">
              Cancel
            </button>
            <button
              onClick={createPost}
              disabled={!newPost.content.trim() || saving || newPost.platforms.length === 0}
              className="rounded-full bg-accent px-6 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {newPost.scheduledFor ? `Schedule for ${newPost.platforms.length} platform${newPost.platforms.length > 1 ? "s" : ""}` : "Save Drafts"}
            </button>
          </div>
        </div>
      )}

      {/* View toggle + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-full border border-brand-100 bg-white p-1">
          <button
            onClick={() => setView("calendar")}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${view === "calendar" ? "bg-accent text-white" : "text-muted-foreground"}`}
          >
            <Grid3x3 className="h-3.5 w-3.5" /> Calendar
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${view === "list" ? "bg-accent text-white" : "text-muted-foreground"}`}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
        </div>
        <div className="flex items-center gap-2">
          {["all", "DRAFT", "SCHEDULED", "PUBLISHED", "FAILED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${filter === f ? "bg-accent text-white" : "bg-brand-50 text-muted-foreground hover:bg-brand-100"}`}
            >
              {f === "all" ? "All" : STATUS_META[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar view */}
      {view === "calendar" && (
        <div className="rounded-2xl border border-brand-100 bg-white overflow-hidden">
          {/* Calendar header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-brand-100 bg-brand-50/50">
            <button
              onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-brand-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="font-semibold text-accent">
              Week of {weekStart.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
            </h3>
            <button
              onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-brand-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 min-h-[500px]">
            {weekDays.map((day, idx) => {
              const dayKey = day.toISOString().slice(0, 10);
              const dayPosts = postsByDay[dayKey] || [];
              const isToday = dayKey === new Date().toISOString().slice(0, 10);

              return (
                <div key={idx} className={`border-r border-brand-50 last:border-r-0 ${isToday ? "bg-brand-50/20" : ""}`}>
                  <div className="px-2 py-2 border-b border-brand-50">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {day.toLocaleDateString(undefined, { weekday: "short" })}
                    </p>
                    <p className={`text-lg font-bold ${isToday ? "text-accent" : "text-foreground"}`}>
                      {day.getDate()}
                    </p>
                  </div>
                  <div className="p-1.5 space-y-1 max-h-[600px] overflow-y-auto">
                    {dayPosts.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground text-center py-4">No posts</p>
                    ) : (
                      dayPosts.map((post) => {
                        const meta = PLATFORM_META[post.platform] || PLATFORM_META.FACEBOOK;
                        const sMeta = STATUS_META[post.status] || STATUS_META.DRAFT;
                        return (
                          <div
                            key={post.id}
                            className={`rounded-lg border p-2 text-[10px] hover:shadow-sm transition cursor-pointer ${meta.color}`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[13px]">{meta.icon}</span>
                              <span className={`rounded-full px-1.5 py-0 text-[8px] font-medium ${sMeta.color}`}>
                                {sMeta.label}
                              </span>
                            </div>
                            <p className="line-clamp-3 text-[10px] leading-tight font-medium">{post.content}</p>
                            {post.scheduledFor && (
                              <p className="text-[9px] text-muted-foreground mt-1">
                                {new Date(post.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            )}
                            <div className="flex gap-1 mt-1">
                              {post.status === "SCHEDULED" && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); publishNow(post.id); }}
                                  className="rounded text-[9px] px-1.5 py-0.5 bg-white hover:bg-brand-50 border border-brand-200"
                                  title="Publish now"
                                >
                                  <Send className="h-2.5 w-2.5 inline" />
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); deletePost(post.id); }}
                                className="rounded text-[9px] px-1.5 py-0.5 bg-white hover:bg-red-50 border border-red-100 text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="h-2.5 w-2.5 inline" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading posts...</div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-brand-100 bg-white p-12 text-center space-y-2">
              <CalendarIcon className="h-12 w-12 mx-auto text-brand-200" />
              <p className="text-muted-foreground">No social posts yet</p>
              <p className="text-xs text-muted-foreground">
                Click "AI Generate Week" above to create 60+ posts automatically
              </p>
            </div>
          ) : (
            posts.map((post) => {
              const pMeta = PLATFORM_META[post.platform] || PLATFORM_META.FACEBOOK;
              const sMeta = STATUS_META[post.status] || STATUS_META.DRAFT;
              return (
                <div key={post.id} className="rounded-xl border border-brand-100 bg-white p-4 hover:shadow-sm transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${pMeta.color}`}>
                          {pMeta.icon} {pMeta.label}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sMeta.color}`}>
                          {sMeta.label}
                        </span>
                        {post.aiGenerated && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 text-purple-600 px-2 py-0.5 text-[10px] font-medium">
                            <Sparkles className="h-3 w-3" /> AI
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {post.scheduledFor
                            ? new Date(post.scheduledFor).toLocaleString()
                            : post.publishedAt
                              ? `Published: ${new Date(post.publishedAt).toLocaleString()}`
                              : ""}
                        </span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-3">{post.content}</p>
                      {post.hashtags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {post.hashtags.slice(0, 8).map((tag) => (
                            <span key={tag} className="text-xs text-accent">{tag}</span>
                          ))}
                        </div>
                      )}
                      {post.errorMessage && (
                        <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5">{post.errorMessage}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {post.status === "SCHEDULED" && (
                        <button
                          onClick={() => publishNow(post.id)}
                          className="h-8 w-8 flex items-center justify-center rounded-full bg-accent text-white hover:bg-brand-700"
                          title="Publish now"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => deletePost(post.id)}
                        className="h-8 w-8 flex items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
