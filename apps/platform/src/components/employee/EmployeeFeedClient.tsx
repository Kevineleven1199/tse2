"use client";

import { useState } from "react";
import Link from "next/link";
import {
  type CommunityPost,
  type ReactionType,
  POST_CATEGORIES,
  REACTION_TYPES,
  formatRelativeTime,
  getTotalReactions,
  getAuthorBadgeStyle,
} from "@/src/lib/community";

type EmployeeFeedClientProps = {
  seedPosts: CommunityPost[];
  userName: string;
  userRole: string;
};

const EmployeePostCard = ({
  post,
  initialUserReactions,
}: {
  post: CommunityPost;
  initialUserReactions: ReactionType[];
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const [userReacted, setUserReacted] = useState<ReactionType[]>(initialUserReactions);
  const [reactions, setReactions] = useState(post.reactions);
  const [submitting, setSubmitting] = useState(false);

  const category = POST_CATEGORIES[post.category];
  const totalReactions = getTotalReactions(reactions);

  const handleReaction = async (type: ReactionType) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/community/posts/${post.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: type }),
      });
      const data = await response.json();
      if (!response.ok || !data.post) {
        throw new Error(data.error ?? "Unable to react to post");
      }

      setReactions(data.post.reactions);
      setUserReacted(data.userReactions ?? []);
      setShowReactions(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/employee-hub`;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, url });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div
      className={`rounded-2xl border border-brand-100 bg-white transition hover:shadow-md ${
        post.isPinned ? "ring-2 ring-brand-200" : ""
      }`}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-600">
                {post.authorName.charAt(0)}
              </div>
              {post.isVerified && (
                <span className="absolute -bottom-1 -right-1 text-sm">✓</span>
              )}
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
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{post.neighborhood}</span>
                <span>•</span>
                <span>{formatRelativeTime(post.createdAt)}</span>
              </div>
            </div>
          </div>
          {category && (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${category.color}`}
            >
              {category.icon} {category.label}
            </span>
          )}
        </div>

        {post.isPinned && (
          <div className="mt-2 flex items-center gap-1 text-xs text-brand-600">
            <span>📌</span>
            <span className="font-medium">Pinned</span>
          </div>
        )}

        {/* Content */}
        <div className="mt-3">
          <h3 className="text-lg font-semibold text-accent">{post.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">
            {post.body}
          </p>
        </div>

        {/* Stats Bar */}
        <div className="mt-4 flex items-center justify-between border-t border-brand-50 pt-3">
          <div className="flex items-center gap-1.5">
            {reactions
              .filter((r) => r.count > 0)
              .slice(0, 3)
              .map((r) => (
                <span
                  key={r.type}
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    userReacted.includes(r.type)
                      ? "bg-brand-100 font-medium text-brand-700"
                      : ""
                  }`}
                >
                  {REACTION_TYPES[r.type].icon}
                  {r.count > 0 && (
                    <span className="ml-0.5 text-muted-foreground">
                      {r.count}
                    </span>
                  )}
                </span>
              ))}
            {totalReactions > 0 && (
              <span className="text-xs text-muted-foreground">
                {totalReactions}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{post.commentCount} comments</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-3 flex items-center gap-1 border-t border-brand-50 pt-3">
          <div className="relative">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
                userReacted.length > 0
                  ? "bg-brand-50 font-medium text-brand-700"
                  : "text-muted-foreground hover:bg-brand-50 hover:text-accent"
              }`}
            >
              <span>
                {userReacted.length > 0
                  ? REACTION_TYPES[userReacted[userReacted.length - 1]].icon
                  : "👍"}
              </span>
              <span>
                {userReacted.length > 0
                  ? REACTION_TYPES[userReacted[userReacted.length - 1]].label
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
                      className={`rounded-full p-2 text-lg transition hover:scale-125 ${
                        userReacted.includes(type as ReactionType)
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

          <span className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground">
            <span>💬</span>
            <span>{post.commentCount} comments</span>
          </span>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-brand-50 hover:text-accent"
          >
            <span>↗️</span>
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const EmployeeFeedClient = ({
  seedPosts,
  userName,
  userRole,
}: EmployeeFeedClientProps) => {
  const allPosts = seedPosts;

  return (
    <div className="space-y-4">
      {/* Create Post CTA */}
      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-600">
            {userName.charAt(0)}
          </div>
          <Link
            href="/employee-hub/new"
            className="flex-1 rounded-full bg-brand-50 px-4 py-2.5 text-sm text-muted-foreground hover:bg-brand-100 transition"
          >
            Share an update, tip, or photo with the team...
          </Link>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-brand-50 pt-3">
          <Link
            href="/employee-hub/new"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-brand-50"
          >
            💡 Tip
          </Link>
          <Link
            href="/employee-hub/new"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-brand-50"
          >
            ⭐ Shoutout
          </Link>
          <Link
            href="/employee-hub/new"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-brand-50"
          >
            📸 Photo
          </Link>
        </div>
      </div>

      {/* Posts Feed */}
      {allPosts.length === 0 ? (
        <div className="rounded-2xl border border-brand-100 bg-white p-8 text-center">
          <p className="text-4xl">🌿</p>
          <p className="mt-2 font-semibold text-accent">
            No posts yet — be the first!
          </p>
          <p className="text-sm text-muted-foreground">
            Share an update, cleaning tip, or job photo with the team.
          </p>
          <Link
            href="/employee-hub/new"
            className="mt-4 inline-block rounded-full bg-brand-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Create First Post
          </Link>
        </div>
      ) : (
        allPosts.map((post) => (
          <EmployeePostCard
            key={post.id}
            post={post}
            initialUserReactions={post.reactions.filter((item) => item.userReacted).map((item) => item.type)}
          />
        ))
      )}
    </div>
  );
};
