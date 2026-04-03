"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { POST_CATEGORIES, type PostCategory } from "@/src/lib/community";

const CATEGORY_LIST = Object.entries(POST_CATEGORIES) as [
  PostCategory,
  { label: string; icon: string; color: string }
][];

const NewPostPage = () => {
  const router = useRouter();
  const [category, setCategory] = useState<PostCategory>("cleaning_tip");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!authorName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a title for your post.");
      return;
    }
    if (!body.trim()) {
      setError("Please write something for your post.");
      return;
    }
    if (body.trim().length < 20) {
      setError("Your post should be at least 20 characters long.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience: "public",
          category,
          title: title.trim(),
          body: body.trim(),
          authorName: authorName.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to publish post.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/community");
      }, 1200);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to publish post."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
            ✅
          </div>
          <h2 className="text-xl font-bold text-accent">Post Published!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your post is now live in the community feed. Redirecting...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      {/* Header */}
      <div className="border-b border-brand-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/community"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-brand-50"
            >
              ←
            </Link>
            <h1 className="text-lg font-semibold text-accent">New Post</h1>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !body.trim()}
            className="rounded-full bg-brand-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-3xl px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Author Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-accent">
              Your Name
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="How should we display your name?"
              className="w-full rounded-xl border border-brand-100 bg-white px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              maxLength={50}
            />
          </div>

          {/* Category Selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-accent">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_LIST.filter(
                ([key]) =>
                  key !== "cleaner_spotlight" &&
                  key !== "promotion" &&
                  key !== "announcement"
              ).map(([key, { label, icon, color }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    category === key
                      ? "bg-brand-500 text-white ring-2 ring-brand-300"
                      : `${color} hover:ring-2 hover:ring-brand-200`
                  }`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="mb-2 block text-sm font-medium text-accent">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                category === "question"
                  ? "What would you like to ask the community?"
                  : category === "before_after"
                    ? "Give your transformation a title"
                    : category === "recommendation"
                      ? "What are you recommending?"
                      : "Give your post a descriptive title"
              }
              className="w-full rounded-xl border border-brand-100 bg-white px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              maxLength={120}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {title.length}/120 characters
            </p>
          </div>

          {/* Body */}
          <div>
            <label className="mb-2 block text-sm font-medium text-accent">
              {category === "question" ? "Details" : "Your Post"}
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                category === "question"
                  ? "Share more details about your question so the community can help..."
                  : category === "cleaning_tip"
                    ? "Share your cleaning tip with the community..."
                    : category === "eco_tip"
                      ? "Share your professional tip..."
                      : category === "before_after"
                        ? "Describe the transformation..."
                        : "Write your post here..."
              }
              rows={6}
              className="w-full resize-none rounded-xl border border-brand-100 bg-white px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
              maxLength={2000}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {body.length}/2000 characters
            </p>
          </div>

          {/* Preview */}
          {(title.trim() || body.trim()) && (
            <div className="rounded-2xl border border-brand-100 bg-white p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Preview
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-600">
                  {authorName ? authorName.charAt(0).toUpperCase() : "?"}
                </div>
                <div>
                  <p className="font-semibold text-accent">
                    {authorName || "Your Name"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Community • Just now
                  </p>
                </div>
                <span
                  className={`ml-auto rounded-full px-2.5 py-1 text-xs font-medium ${POST_CATEGORIES[category].color}`}
                >
                  {POST_CATEGORIES[category].icon}{" "}
                  {POST_CATEGORIES[category].label}
                </span>
              </div>
              {title.trim() && (
                <h3 className="mt-3 text-lg font-semibold text-accent">
                  {title}
                </h3>
              )}
              {body.trim() && (
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between border-t border-brand-100 pt-6">
            <Link
              href="/community"
              className="text-sm text-muted-foreground hover:text-accent"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !body.trim()}
              className="rounded-full bg-brand-500 px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Publishing..." : "Publish Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewPostPage;
