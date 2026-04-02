"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { EyeIcon, EyeOffIcon, BadgeCheck, CalendarDays, BriefcaseBusiness, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/src/lib/animations";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

const ForgotPasswordLink = () => {
  const [show, setShow] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState<"idle" | "loading" | "sent">("idle");

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatus("loading");
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: resetEmail }),
    });
    setResetStatus("sent");
  };

  if (resetStatus === "sent") {
    return (
      <div className="rounded-2xl bg-green-50 px-4 py-3 text-center text-sm text-green-700">
        If an account exists for that email, a reset link has been sent. Check your inbox.
      </div>
    );
  }

  if (show) {
    return (
      <form onSubmit={handleForgotPassword} className="space-y-3 rounded-2xl border border-brand-100 bg-brand-50/30 p-4">
        <p className="text-sm font-medium text-accent">Reset your password</p>
        <input
          type="email"
          value={resetEmail}
          onChange={(e) => setResetEmail(e.target.value)}
          placeholder="Enter your email"
          required
          className="w-full rounded-xl border border-brand-100 bg-white px-4 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={resetStatus === "loading"}
            className="flex-1 rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-brand-700 disabled:opacity-70"
          >
            {resetStatus === "loading" ? "Sending..." : "Send Reset Link"}
          </button>
          <button
            type="button"
            onClick={() => setShow(false)}
            className="rounded-full px-4 py-2 text-xs font-medium text-muted-foreground transition hover:bg-brand-50"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={() => setShow(true)}
        className="text-sm font-medium text-brand-600 transition hover:text-brand-700 hover:underline"
      >
        Forgot your password?
      </button>
    </div>
  );
};

const accessCards = [
  {
    title: "Cleaners",
    body: "Clock in and out of jobs, open the route, check paystubs, and track current-period earnings.",
    icon: CalendarDays,
  },
  {
    title: "Clients",
    body: "Review visits, billing, messages, and rescheduling from the customer portal.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Managers",
    body: "Jump into scheduling, payroll, customers, and operations from the admin side.",
    icon: Wallet,
  },
];

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();

  const rawRedirect = searchParams.get("redirect");

  const safeRedirect = (() => {
    if (!rawRedirect) return null;
    if (!rawRedirect.startsWith("/") || rawRedirect.startsWith("//")) return null;
    return rawRedirect;
  })();

  const cleanerIntent = safeRedirect?.startsWith("/cleaner") ?? false;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Unable to log in.");
        return;
      }

      const data = (await response.json()) as { redirectTo?: string };
      router.replace(safeRedirect ?? data.redirectTo ?? "/");
      router.refresh();
    });
  };

  return (
    <div className="bg-[radial-gradient(circle_at_top_left,_rgba(76,175,80,0.10),_transparent_28%),linear-gradient(180deg,#f5fbf6_0%,#f5f5f5_100%)] py-12 md:py-20">
      <div className="section-wrapper grid gap-8 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
          <motion.div
            variants={fadeUp}
            className="overflow-hidden rounded-[36px] border border-brand-200 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.22),_transparent_35%),linear-gradient(135deg,#143b16_0%,#2e7d32_55%,#7bd17a_100%)] p-6 text-white shadow-[0_30px_90px_-35px_rgba(20,59,22,0.75)] md:p-8"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">Secure Access</p>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
              {cleanerIntent ? "Cleaner sign-in starts here." : "Sign in to the right TriState workspace."}
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-white/80 md:text-base">
              {cleanerIntent
                ? "Cleaners land in the crew hub where they can open the schedule, check paystubs, and clock in or out of jobs."
                : "Your account opens the right portal automatically, whether you’re a cleaner, a client, or managing the operation."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/85">
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">Cleaner route + clock actions</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">Paystubs + deposit visibility</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">Role-based redirect after sign-in</span>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="grid gap-4 md:grid-cols-3">
            {accessCards.map(({ title, body, icon: Icon }) => (
              <div
                key={title}
                className="rounded-[28px] border border-brand-100 bg-white p-5 shadow-sm shadow-brand-100/30"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-accent">{title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="rounded-[32px] border border-brand-100 bg-white p-6 shadow-sm shadow-brand-100/25">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-accent">Need a different account?</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Clients can create an account from registration. Crew candidates should apply first so HQ can
                    activate cleaner access.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/register"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-brand-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent transition hover:bg-brand-50"
                  >
                    Create Client Account
                  </Link>
                  <Link
                    href="/apply"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-brand-700"
                  >
                    Apply to Clean
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <Card className="overflow-hidden border-brand-100 bg-white">
          <CardHeader className="border-b border-brand-100/80 p-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-700">
                {cleanerIntent ? "Crew Hub Login" : "Account Login"}
              </p>
              <h2 className="text-2xl font-semibold text-accent">Enter your email and password</h2>
              <p className="text-sm text-muted-foreground">
                {cleanerIntent
                  ? "Cleaners will be sent straight into the crew hub after sign-in."
                  : "We’ll route you to the correct dashboard based on your role."}
              </p>
            </div>
          </CardHeader>
          <CardContent className="mt-0 p-6 pt-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="flex flex-col text-xs font-semibold uppercase tracking-[0.28em] text-accent">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 min-h-[48px] rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="name@example.com"
                  required
                />
              </label>

              <label className="flex flex-col text-xs font-semibold uppercase tracking-[0.28em] text-accent">
                Password
                <div className="mt-2 flex min-h-[48px] items-center gap-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-brand-200">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="flex-1 border-none bg-transparent text-sm text-foreground focus:outline-none"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-brand-500 transition hover:text-brand-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {error ? (
                <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-full bg-accent px-6 py-4 text-sm font-semibold uppercase tracking-[0.28em] text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:opacity-70"
              >
                {pending ? "Signing in..." : cleanerIntent ? "Enter Crew Hub" : "Sign In"}
              </button>

              <ForgotPasswordLink />
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
