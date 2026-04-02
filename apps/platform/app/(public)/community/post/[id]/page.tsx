"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  POST_CATEGORIES,
  REACTION_TYPES,
  formatRelativeTime,
  getTotalReactions,
  getAuthorBadgeStyle,
  getPostComments,
  type CommunityPost,
  type Comment,
  type ReactionType,
} from "@/src/lib/community";

const PostDetailPage = () => {
  const params = useParams();
  const postId = params.id as string;

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReactions, setShowReactions] = useState(false);
  const [userReactions, setUserReactions] = useState<ReactionType[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        await fetch(`/api/community/posts/${postId}/view`, { method: "POST" });
        const response = await fetch(`/api/community/posts/${postId}`, {
          cache: "no-store",
        });
        const data = await response.json();

        if (!cancelled) {
          setPost(data.post ?? null);
          setComments(data.comments ?? []);
          setUserReactions(data.viewer?.reactions ?? []);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [postId]);

  const handleReaction = async (type: ReactionType) => {
    if (!post) return;
    const response = await fetch(`/api/community/posts/${post.id}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reaction: type }),
    });
    const data = await response.json();
    if (!response.ok || !data.post) {
      return;
    }

    setPost(data.post);
    setUserReactions(data.userReactions ?? []);
    setShowReactions(false);
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !commentAuthor.trim()) return;

    const response = await fetch(`/api/community/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: newComment.trim(),
        authorName: commentAuthor.trim(),
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.comment) {
      return;
    }

    setComments((prev) => [...prev, data.comment]);
    setPost((prev) =>
      prev
        ? {
            ...prev,
            commentCount: prev.commentCount + 1,
          }
        : prev
    );
    setNewComment("");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-white">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-white">
        <p className="text-4xl">🔍</p>
        <h2 className="mt-4 text-xl font-semibold text-accent">
          Post Not Found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This post may have been removed or doesn&apos;t exist.
        </p>
        <Link
          href="/community"
          className="mt-6 rounded-full bg-brand-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          Back to Community
        </Link>
      </div>
    );
  }

  const category = POST_CATEGORIES[post.category];
  const totalReactions = getTotalReactions(post.reactions);
  const allComments = comments;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      {/* Header */}
      <div className="border-b border-brand-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <Link
            href="/community"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-brand-50"
          >
            ←
          </Link>
          <h1 className="text-lg font-semibold text-accent">Post</h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Post Content */}
        <div className="rounded-2xl border border-brand-100 bg-white p-6">
          {/* Author */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-600">
                {post.authorName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-accent">
                    {post.authorName}
                  </span>
                  {post.authorBadge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${getAuthorBadgeStyle(post.authorRole)}`}
                    >
                      {post.authorBadge}
                    </span>
                  )}
                  {post.isVerified && <span className="text-sm">✓</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{post.neighborhood}</span>
                  <span>•</span>
                  <span>{formatRelativeTime(post.createdAt)}</span>
                </div>
              </div>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${category.color}`}
            >
              {category.icon} {category.label}
            </span>
          </div>

          {post.isPinned && (
            <div className="mt-2 flex items-center gap-1 text-xs text-brand-600">
              <span>📌</span>
              <span className="font-medium">Pinned</span>
            </div>
          )}

          {/* Content */}
          <h2 className="mt-4 text-xl font-bold text-accent">{post.title}</h2>
          <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">
            {post.body}
          </p>

          {/* Reactions Bar */}
          <div className="mt-6 flex items-center justify-between border-t border-brand-50 pt-4">
            <div className="flex items-center gap-2">
              {post.reactions
                .filter((r) => r.count > 0)
                .map((r) => (
                  <span
                    key={r.type}
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      userReactions.includes(r.type)
                        ? "bg-brand-100 font-semibold text-brand-700"
                        : "bg-gray-50 text-muted-foreground"
                    }`}
                  >
                    {REACTION_TYPES[r.type].icon} {r.count}
                  </span>
                ))}
              {totalReactions > 0 && (
                <span className="text-xs text-muted-foreground">
                  {totalReactions} reactions
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {allComments.length} comments
            </span>
          </div>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-1 border-t border-brand-50 pt-3">
            <div className="relative">
              <button
                onClick={() => setShowReactions(!showReactions)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm transition ${
                  userReactions.length > 0
                    ? "bg-brand-50 font-semibold text-brand-700"
                    : "text-muted-foreground hover:bg-brand-50 hover:text-accent"
                }`}
              >
                <span>
                  {userReactions.length > 0
                    ? REACTION_TYPES[userReactions[userReactions.length - 1]]
                        .icon
                    : "👍"}
                </span>
                <span>
                  {userReactions.length > 0
                    ? REACTION_TYPES[userReactions[userReactions.length - 1]]
                        .label
                    : "React"}
                </span>
              </button>
              {showReactions && (
                <div className="absolute bottom-full left-0 z-10 mb-1 flex gap-1 rounded-full bg-white p-1.5 shadow-lg ring-1 ring-brand-100">
                  {Object.entries(REACTION_TYPES).map(
                    ([type, { icon, label }]) => (
                      <button
                        key={type}
                        onClick={() => handleReaction(type as ReactionType)}
                        className={`rounded-full p-2 text-xl transition hover:scale-125 ${
                          userReactions.includes(type as ReactionType)
                            ? "bg-brand-100"
                            : "hover:bg-brand-50"
                        }`}
                        title={label}
                      >
                        {icon}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() =>
                document.getElementById("comment-input")?.focus()
              }
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm text-muted-foreground transition hover:bg-brand-50 hover:text-accent"
            >
              <span>💬</span>
              <span>Comment</span>
            </button>
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-semibold text-accent">
            Comments ({allComments.length})
          </h3>

          {/* Comment Form */}
          <form
            onSubmit={handleComment}
            className="rounded-2xl border border-brand-100 bg-white p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-600">
                {commentAuthor ? commentAuthor.charAt(0).toUpperCase() : "?"}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-brand-100 bg-brand-50/50 px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:border-brand-300 focus:outline-none"
                />
                <textarea
                  id="comment-input"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-brand-100 bg-brand-50/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-brand-300 focus:outline-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!newComment.trim() || !commentAuthor.trim()}
                    className="rounded-full bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
                  >
                    Post Comment
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Comments List */}
          {allComments.length === 0 ? (
            <div className="rounded-2xl border border-brand-100 bg-white p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No comments yet. Be the first to share your thoughts!
              </p>
            </div>
          ) : (
            allComments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-2xl border border-brand-100 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-600">
                    {comment.authorName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-accent">
                        {comment.authorName}
                      </span>
                      {comment.authorRole === "cleaner" && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Cleaner
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {comment.body}
                    </p>
                    {comment.reactions.length > 0 && (
                      <div className="mt-2 flex gap-1">
                        {comment.reactions.map((r) => (
                          <span
                            key={r.type}
                            className="rounded-full bg-gray-50 px-1.5 py-0.5 text-xs"
                          >
                            {REACTION_TYPES[r.type].icon} {r.count}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Replies */}
                    {comment.replies.length > 0 && (
                      <div className="mt-3 space-y-2 border-l-2 border-brand-100 pl-3">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="flex items-start gap-2">
                            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600">
                              {reply.authorName.charAt(0)}
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-accent">
                                {reply.authorName}
                              </span>
                              <span className="ml-2 text-xs text-muted-foreground">
                                {formatRelativeTime(reply.createdAt)}
                              </span>
                              <p className="text-sm text-muted-foreground">
                                {reply.body}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PostDetailPage;
