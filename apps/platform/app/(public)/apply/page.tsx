"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/src/lib/animations";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

const ApplyPage = () => {
  const [formValues, setFormValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    state: "FL",
    experience: "",
    transportation: "no",
    motivation: "",
    availability: [] as string[]
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setFormValues((prev) => ({
      ...prev,
      availability: checked
        ? [...prev.availability, name]
        : prev.availability.filter((item) => item !== name)
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/auth/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues)
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Unable to submit application.");
        return;
      }

      setSuccess(true);
      setFormValues({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        city: "",
        state: "FL",
        experience: "",
        transportation: "no",
        motivation: "",
        availability: []
      });
    });
  };

  if (success) {
    return (
      <div className="bg-surface py-20">
        <div className="section-wrapper max-w-2xl mx-auto">
          <Card className="bg-white text-center">
            <CardContent className="py-12 px-8">
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-green-100 p-4">
                  <svg className="h-8 w-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-accent mb-3">Application submitted!</h2>
              <p className="text-muted-foreground mb-6">
                Thanks for applying to join the Tri State team! We'll review your application and get back to you within 48 hours.
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-brand-700"
              >
                Back to home
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface py-20">
      <div className="section-wrapper grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
          <motion.div variants={fadeUp}>
            <h1 className="text-3xl font-semibold text-accent md:text-4xl">Join the Tri State team</h1>
            <p className="mt-4 text-base text-muted-foreground">
              We're looking for experienced, reliable cleaners who are passionate about delivering exceptional service to our clients. If you're ready to earn competitive rates, work flexible hours, and be part of something meaningful, apply now.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="rounded-3xl border border-brand-100 bg-white/70 p-6 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-brand-500 font-bold flex-shrink-0">✓</span>
              <p className="text-sm font-semibold text-accent">Flexible scheduling — work when you want</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-brand-500 font-bold flex-shrink-0">✓</span>
              <p className="text-sm font-semibold text-accent">Competitive pay and performance bonuses</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-brand-500 font-bold flex-shrink-0">✓</span>
              <p className="text-sm font-semibold text-accent">Support from a professional platform and community</p>
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-brand-600">
                Sign in here
              </Link>
              .
            </p>
          </motion.div>
        </motion.div>

        <Card className="bg-white">
          <CardHeader>
            <h2 className="text-2xl font-semibold text-accent">Application form</h2>
            <p className="text-sm text-muted-foreground">Tell us about yourself and your cleaning experience.</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                  First name
                  <input
                    name="firstName"
                    value={formValues.firstName}
                    onChange={handleChange}
                    className="mt-2 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
                    required
                  />
                </label>
                <label className="flex flex-col text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                  Last name
                  <input
                    name="lastName"
                    value={formValues.lastName}
                    onChange={handleChange}
                    className="mt-2 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
                    required
                  />
                </label>
              </div>

              <label className="flex flex-col text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                Email
                <input
                  type="email"
                  name="email"
                  value={formValues.email}
                  onChange={handleChange}
                  className="mt-2 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
                  required
                />
              </label>

              <label className="flex flex-col text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                Phone
                <input
                  type="tel"
                  name="phone"
                  value={formValues.phone}
                  onChange={handleChange}
                  placeholder="(941) 555-0123"
                  className="mt-2 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
                  required
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                  City
                  <input
                    name="city"
                    value={formValues.city}
                    onChange={handleChange}
                    className="mt-2 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
                    required
                  />
                </label>
                <label className="flex flex-col text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                  State
                  <select
                    name="state"
                    value={formValues.state}
                    onChange={handleChange}
                    className="mt-2 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
                  >
                    <option value="FL">Kentucky</option>
                    <option value="AL">Alabama</option>
                    <option value="GA">Georgia</option>
                    <option value="SC">South Carolina</option>
                  </select>
                </label>
              </div>

              <label className="flex flex-col text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                Years of cleaning experience
                <select
                  name="experience"
                  value={formValues.experience}
                  onChange={handleChange}
                  className="mt-2 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
                  required
                >
                  <option value="">Select...</option>
                  <option value="less_than_1">Less than 1 year</option>
                  <option value="1_to_2">1-2 years</option>
                  <option value="3_to_5">3-5 years</option>
                  <option value="5_plus">5+ years</option>
                </select>
              </label>

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={formValues.transportation === "yes"}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, transportation: e.target.checked ? "yes" : "no" }))}
                  className="h-4 w-4 rounded border-brand-100 text-accent focus:ring-2 focus:ring-brand-200"
                />
                <span className="font-semibold text-accent">I have my own transportation</span>
              </label>

              <label className="flex flex-col text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                Why do you want to join Tri State?
                <textarea
                  name="motivation"
                  value={formValues.motivation}
                  onChange={handleChange}
                  placeholder="Tell us about your motivation..."
                  className="mt-2 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
                  rows={4}
                  required
                />
              </label>

              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Availability</label>
                <div className="space-y-2">
                  {["weekday_mornings", "weekday_afternoons", "weekends"].map((slot) => (
                    <label key={slot} className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        name={slot}
                        checked={formValues.availability.includes(slot)}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 rounded border-brand-100 text-accent focus:ring-2 focus:ring-brand-200"
                      />
                      <span className="text-foreground">
                        {slot === "weekday_mornings" && "Weekday mornings"}
                        {slot === "weekday_afternoons" && "Weekday afternoons"}
                        {slot === "weekends" && "Weekends"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {error ? <p role="alert" className="text-sm text-red-500">{error}</p> : null}

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:opacity-70"
              >
                {pending ? "Submitting..." : "Submit Application"}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApplyPage;
