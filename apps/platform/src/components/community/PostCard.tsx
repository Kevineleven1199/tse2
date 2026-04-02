"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/src/components/ui/card";
import type { CommunityPost } from "@/src/lib/community";
import { 
  POST_CATEGORIES, 
  REACTION_TYPES, 
  formatRelativeTime, 
  getTotalReactions,
  getAuthorBadgeStyle 
} from "@/src/lib/community";

type PostCardProps = {
  post: CommunityPost;
  onReact?: (postId: string, reactionType: string) => void;
  compact?: boolean;
};

export const PostCard = ({ post, onReact, compact = false }: PostCardProps) => {
  const [showAllReactions, setShowAllReactions] = useState(false);
  const category = POST_CATEGORIES[post.category];
  const totalReactions = getTotalReactions(post.reactions);

  const handleReaction = (type: string) => {
    onReact?.(post.id, type);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/community/post/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, url });
      } catch {
        return;
      }
      return;
    }

    await navigator.clipboard.writeText(url);
  };

  return (
    <Card className={`bg-white transition hover:shadow-md ${post.isPinned ? "ring-2 ring-brand-200" : ""}`}>
      <CardContent className={compact ? "p-4" : "p-5"}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-lg font-semibold text-brand-600">
                {post.authorAvatar ? (
                  <Image
                    src={post.authorAvatar}
                    alt={post.authorName}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  post.authorName.charAt(0)
                )}
              </div>
              {post.isVerified && (
                <span className="absolute -bottom-1 -right-1 text-sm">✓</span>
              )}
            </div>
            
            {/* Author Info */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-accent">{post.authorName}</span>
                {post.authorBadge && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getAuthorBadgeStyle(post.authorRole)}`}>
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

          {/* Category Badge */}
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${category.color}`}>
            {category.icon} {category.label}
          </span>
        </div>

        {/* Pinned indicator */}
        {post.isPinned && (
          <div className="mt-2 flex items-center gap-1 text-xs text-brand-600">
            <span>📌</span>
            <span className="font-medium">Pinned</span>
          </div>
        )}

        {/* Content */}
        <div className="mt-3">
          <Link href={`/community/post/${post.id}`}>
            <h3 className="text-lg font-semibold text-accent hover:text-brand-600 transition">
              {post.title}
            </h3>
          </Link>
          <p className={`mt-2 text-sm text-muted-foreground ${compact ? "line-clamp-2" : "line-clamp-4"}`}>
            {post.body}
          </p>
        </div>

        {/* Media Preview */}
        {post.mediaUrls.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {post.mediaUrls.slice(0, 3).map((url, i) => (
              <div 
                key={i}
                className="relative h-32 w-32 flex-shrink-0 rounded-xl bg-gray-100 overflow-hidden"
              >
                <Image
                  src={url}
                  alt={`Media ${i + 1}`}
                  fill
                  sizes="128px"
                  className="object-cover"
                />
                {i === 2 && post.mediaUrls.length > 3 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold">
                    +{post.mediaUrls.length - 3}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Stats Bar */}
        <div className="mt-4 flex items-center justify-between border-t border-brand-50 pt-3">
          {/* Reactions Summary */}
          <div className="flex items-center gap-2">
            {post.reactions.slice(0, 3).map((reaction) => (
              reaction.count > 0 && (
                <span key={reaction.type} className="text-sm">
                  {REACTION_TYPES[reaction.type].icon}
                </span>
              )
            ))}
            {totalReactions > 0 && (
              <span className="text-sm text-muted-foreground">{totalReactions}</span>
            )}
          </div>

          {/* Comments & Views */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{post.commentCount} comments</span>
            <span>•</span>
            <span>{post.viewCount} views</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-3 flex items-center gap-1 border-t border-brand-50 pt-3">
          {/* Reaction Button with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAllReactions(!showAllReactions)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-brand-50 hover:text-accent"
            >
              <span>👍</span>
              <span>React</span>
            </button>
            
            {showAllReactions && (
              <div className="absolute bottom-full left-0 mb-1 flex gap-1 rounded-full bg-white p-1 shadow-lg border border-brand-100">
                {Object.entries(REACTION_TYPES).map(([type, { icon, label }]) => (
                  <button
                    key={type}
                    onClick={() => {
                      handleReaction(type);
                      setShowAllReactions(false);
                    }}
                    className="rounded-full p-2 text-lg transition hover:bg-brand-50 hover:scale-125"
                    title={label}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link
            href={`/community/post/${post.id}`}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-brand-50 hover:text-accent"
          >
            <span>💬</span>
            <span>Comment</span>
          </Link>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-brand-50 hover:text-accent"
          >
            <span>↗️</span>
            <span>Share</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
};
