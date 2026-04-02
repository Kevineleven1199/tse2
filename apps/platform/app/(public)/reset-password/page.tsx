"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/src/components/ui/input";
import { Check, AlertCircle, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      setStatus("error");
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    setStatus("loading");
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error || "Failed to reset password.");
        return;
      }

      setStatus("success");
      setMessage("Password reset successfully! Redirecting to login...");
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="mx-auto max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 font-display text-2xl font-semibold text-accent">Invalid Reset Link</h1>
          <p className="mt-2 text-muted-foreground">
            This link is missing or invalid. Please request a new password reset.
          </p>
          <a
            href="/login"
            className="mt-6 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent/90"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-brand-100 bg-white p-8 shadow-lg shadow-brand-100/40">
          <div className="text-center">
            <h1 className="font-display text-2xl font-semibold text-accent">Create New Password</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your new password below.
            </p>
          </div>

          {status === "success" ? (
            <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl bg-green-50 p-6 text-center">
              <Check className="h-10 w-10 text-green-600" />
              <p className="font-medium text-green-800">{message}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-accent">New Password</label>
                <Input
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-accent">Confirm Password</label>
                <Input
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              {status === "error" && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-brand-700 disabled:opacity-70"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
