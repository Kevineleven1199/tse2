"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, Send, Clock, CheckCircle2, XCircle, Sparkles, Filter } from "lucide-react";

const PLATFORM_META: Record<string, { label: string; icon: string; color: string; maxChars: number }> = {
  FACEBOOK: { label: "Facebook", icon: "\uD83D\uDFE6", color: "bg-blue-100 text-blue-700", maxChars: 500 },
  INSTAGRAM: { label: "Instagram", icon: "\uD83D\uDFEA", color: "bg-pink-100 text-pink-700", maxChars: 2200 },
  TWITTER_X: { label: "X / Twitter", icon: "\u2B1B", color: "bg-gray-100 text-gray-700", maxChars: 280 },
  TIKTOK: { label: "TikTok", icon: "\uD83C\uDFB5", color: "bg-red-100 text-red-700", maxChars: 150 },
};

const STATUS_META: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-600", icon: Clock },
  SCHEDULED: { label: "Scheduled", color: "bg-amber-100 text-amber-700", icon: Clock },
  PUBLISHING: { label: "Publishing...", color: "bg-blue-100 text-blue-700", icon: Send },
  PUBLISHED: { label: "Published", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  FAILED: { label: "Failed", color: "bg-red-100 text-red-700", icon: XCircle },
};

type SocialPost = {
  id: string;
  platform: string;
  content: string;
  hashtags: string[];
  status: string;
  scheduledFor: string | null;
  publishedAt: string | null;
  aiGenerated: boolean;
  blogPostId: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export function SocialClient() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showComposer, setShowComposer] = useState(false);
  const [newPost, setNewPost] = useState({ platform: "FACEBOOK", content: "", scheduledFor: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [filter]);

  const fetchPosts = async () => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    const res = await fetch(`/api/admin/social-posts?${params}`);
    if (res.ok) {
      const data = await res.json();
      setPosts(data.posts || []);
    }
    setLoading(false);
  };

  const createPost = async () => {
    if (!newPost.content.trim() || saving) return;
    setSaving(true);
    const res = await fetch("/api/admin/social-posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: newPost.platform,
        content: newPost.content,
        scheduledFor: newPost.scheduledFor || null,
      }),
    });
    if (res.ok) {
      setShowComposer(false);
      setNewPost({ platform: "FACEBOOK", content: "", scheduledFor: "" });
      fetchPosts();
    }
    setSaving(false);
  };

  const platformMeta = PLATFORM_META[newPost.platform] || PLATFORM_META.FACEBOOK;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-accent flex items-center gap-2">
            <Calendar className="h-6 w-6" /> Social Media Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Schedule and manage posts across Facebook, Instagram, and X/Twitter. AI auto-generates content from your blog posts.
          </p>
        </div>
        <button
          onClick={() => setShowComposer(!showComposer)}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> Create Post
        </button>
      </div>

      {/* Composer */}
      {showComposer && (
        <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-accent">New Social Post</h3>
          <div className="flex gap-2">
            {Object.entries(PLATFORM_META).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => setNewPost({ ...newPost, platform: key })}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  newPost.platform === key ? meta.color + " ring-2 ring-accent/30" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >
                {meta.icon} {meta.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <textarea
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              placeholder={`Write your ${PLATFORM_META[newPost.platform]?.label} post...`}
              rows={4}
              maxLength={platformMeta.maxChars}
              className="w-full rounded-xl border border-brand-100 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
            />
            <span className={`absolute bottom-3 right-3 text-xs ${
              newPost.content.length > platformMeta.maxChars * 0.9 ? "text-red-500" : "text-muted-foreground"
            }`}>
              {newPost.content.length}/{platformMeta.maxChars}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Schedule for</label>
              <input
                type="datetime-local"
                value={newPost.scheduledFor}
                onChange={(e) => setNewPost({ ...newPost, scheduledFor: e.target.value })}
                className="mt-1 block rounded-lg border border-brand-100 px-3 py-1.5 text-sm"
              />
            </div>
            <div className="ml-auto flex gap-2">
              <button onClick={() => setShowComposer(false)} className="rounded-full px-4 py-2 text-sm border border-brand-100 hover:bg-brand-50">
                Cancel
              </button>
              <button
                onClick={createPost}
                disabled={!newPost.content.trim() || saving}
                className="rounded-full bg-accent px-6 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {newPost.scheduledFor ? "Schedule" : "Save Draft"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {["all", "DRAFT", "SCHEDULED", "PUBLISHED", "FAILED"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === f ? "bg-accent text-white" : "bg-brand-50 text-muted-foreground hover:bg-brand-100"
            }`}
          >
            {f === "all" ? "All" : STATUS_META[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Post list */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Calendar className="h-12 w-12 mx-auto text-brand-200" />
            <p className="text-muted-foreground">No social posts yet</p>
            <p className="text-xs text-muted-foreground">Create a post above or let the AI auto-generate from your blog content</p>
          </div>
        ) : (
          posts.map((post) => {
            const pMeta = PLATFORM_META[post.platform] || PLATFORM_META.FACEBOOK;
            const sMeta = STATUS_META[post.status] || STATUS_META.DRAFT;
            return (
              <div key={post.id} className="rounded-2xl border border-brand-100 bg-white p-5 hover:shadow-sm transition">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${pMeta.color}`}>
                      {pMeta.icon} {pMeta.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${sMeta.color}`}>
                      {sMeta.label}
                    </span>
                    {post.aiGenerated && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 text-purple-600 px-2 py-0.5 text-[10px] font-medium">
                        <Sparkles className="h-3 w-3" /> AI Generated
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {post.scheduledFor
                      ? `Scheduled: ${new Date(post.scheduledFor).toLocaleString()}`
                      : post.publishedAt
                        ? `Published: ${new Date(post.publishedAt).toLocaleString()}`
                        : `Created: ${new Date(post.createdAt).toLocaleDateString()}`}
                  </span>
                </div>
                <p className="mt-3 text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
                {post.hashtags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {post.hashtags.map((tag) => (
                      <span key={tag} className="text-xs text-accent">{tag}</span>
                    ))}
                  </div>
                )}
                {post.errorMessage && (
                  <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1">{post.errorMessage}</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
