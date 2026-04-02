"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/src/lib/animations";

export const NewsletterSignup = () => {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim() || undefined,
          neighborhood: "Flatwoods",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "You're subscribed!");
        setEmail("");
        setFirstName("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Unable to connect. Please try again later.");
    }
  };

  return (
    <section className="bg-gradient-to-r from-accent to-brand-700" id="newsletter">
      <div className="section-wrapper py-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={staggerContainer}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.span
            variants={fadeUp}
            className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-200"
          >
            Daily Newsletter
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="mt-4 font-display text-3xl font-semibold leading-tight text-white md:text-4xl"
          >
            Free cleaning tips & exclusive deals, daily
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-4 text-base leading-relaxed text-white/80"
          >
            Join Flatwoods families who get a daily dose of eco-friendly cleaning tips,
            seasonal home care advice, and members-only offers delivered straight to their inbox.
          </motion.p>

          {status === "success" ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 rounded-2xl bg-white/10 px-6 py-5 backdrop-blur"
            >
              <p className="text-lg font-semibold text-white">Welcome aboard!</p>
              <p className="mt-1 text-sm text-white/80">{message}</p>
            </motion.div>
          ) : (
            <motion.form
              variants={fadeUp}
              onSubmit={handleSubmit}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3"
            >
              <div className="flex-1">
                <label htmlFor="nl-name" className="sr-only">
                  First Name
                </label>
                <input
                  id="nl-name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name (optional)"
                  className="w-full rounded-full bg-white/10 px-5 py-3 text-sm text-white placeholder:text-white/50 backdrop-blur focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              <div className="flex-[2]">
                <label htmlFor="nl-email" className="sr-only">
                  Email Address
                </label>
                <input
                  id="nl-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full rounded-full bg-white/10 px-5 py-3 text-sm text-white placeholder:text-white/50 backdrop-blur focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              <button
                type="submit"
                disabled={status === "loading"}
                className="whitespace-nowrap rounded-full bg-white px-8 py-3 text-sm font-semibold text-accent transition hover:bg-brand-50 disabled:opacity-60"
              >
                {status === "loading" ? "Subscribing..." : "Subscribe Free"}
              </button>
            </motion.form>
          )}

          {status === "error" && (
            <p className="mt-3 text-sm text-red-300" role="alert">{message}</p>
          )}

          <motion.p
            variants={fadeUp}
            className="mt-4 text-xs text-white/70"
          >
            No spam, ever. Unsubscribe anytime with one click.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
};
