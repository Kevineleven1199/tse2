"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { POST_CATEGORIES, type PostCategory } from "@/src/lib/community";

const EMPLOYEE_CATEGORIES: {
  key: PostCategory;
  label: string;
  icon: string;
}[] = [
  { key: "project_tip", label: "Tip", icon: "💡" },
  { key: "before_after", label: "Photo Update", icon: "📸" },
  { key: "question", label: "Question", icon: "❓" },
  { key: "recommendation", label: "Shoutout", icon: "⭐" },
];

const roleLabel = (role: string) => {
  switch (role) {
    case "HQ":
      return "Admin";
    case "MANAGER":
      return "Manager";
    default:
      return "Cleaner";
  }
};

type EmployeeNewPostFormProps = {
  authorName: string;
  sessionRole: string;
};

export default function EmployeeNewPostForm({
  authorName,
  sessionRole,
}: EmployeeNewPostFormProps) {
  const router = useRouter();
  const [category, setCategory] = useState<PostCategory>("project_tip");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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
          audience: "team",
          category,
          title: title.trim(),
          body: body.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to publish post.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/employee-hub");
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
            ✅
          </div>
          <h2 className="text-xl font-bold text-accent">Post Published!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your post is now live in the employee feed. Redirecting...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/employee-hub"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-brand-50"
          >
            ←
          </Link>
          <h1 className="text-lg font-semibold text-accent">New Post</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            const form = document.querySelector<HTMLFormElement>("form");
            if (form) form.requestSubmit();
          }}
          disabled={submitting || !title.trim() || !body.trim()}
          className="rounded-full bg-brand-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Publishing..." : "Publish"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-accent">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {EMPLOYEE_CATEGORIES.map(({ key, label, icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  category === key
                    ? "bg-brand-500 text-white ring-2 ring-brand-300"
                    : "bg-brand-50 text-accent hover:ring-2 hover:ring-brand-200"
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

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
                ? "What would you like to ask the team?"
                : category === "before_after"
                  ? "Give your photo update a title"
                  : category === "recommendation"
                    ? "Who deserves a shoutout?"
                    : "Give your post a descriptive title"
            }
            className="w-full rounded-xl border border-brand-100 bg-white px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
            maxLength={120}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {title.length}/120 characters
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-accent">
            {category === "question" ? "Details" : "Your Post"}
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              category === "question"
                ? "Share more details so the team can help..."
                : category === "project_tip"
                  ? "Share your project tip with the team..."
                  : category === "before_after"
                    ? "Describe the job and the transformation..."
                    : category === "recommendation"
                      ? "Tell us why they deserve recognition..."
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

        {(title.trim() || body.trim()) && (
          <div className="rounded-2xl border border-brand-100 bg-white p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Preview
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-600">
                {authorName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-accent">{authorName}</p>
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                    {roleLabel(sessionRole)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  TriState Team • Just now
                </p>
              </div>
              {POST_CATEGORIES[category] && (
                <span
                  className={`ml-auto rounded-full px-2.5 py-1 text-xs font-medium ${POST_CATEGORIES[category].color}`}
                >
                  {POST_CATEGORIES[category].icon}{" "}
                  {POST_CATEGORIES[category].label}
                </span>
              )}
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

        <div className="flex items-center justify-between border-t border-brand-100 pt-6">
          <Link
            href="/employee-hub"
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
  );
}
