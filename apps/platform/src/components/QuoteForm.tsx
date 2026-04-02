"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/src/components/ui/input";
import type { QuoteAddOn, QuoteFrequency, QuoteServiceType, QuoteLocationTier } from "@/src/lib/pricing";
import { AddressAutocomplete } from "@/src/components/AddressAutocomplete";

type QuoteAction = "preview" | "accept" | "decline";

type QuoteResponse = {
  quoteId: string;
  action: QuoteAction;
  pricing: {
    basePrice: number;
    bedroomAdjustment: number;
    bathroomAdjustment: number;
    squareFootageAdjustment: number;
    addOnTotal: number;
    travelFee: number;
    firstTimeFee: number;
    frequencyDiscount: number;
    totalBeforeDiscount: number;
    total: number;
    cleanerPay: number;
    companyMargin: number;
    companyMarginRate: number;
    estimatedDurationHours: number;
    recommendedDeposit: number;
  };
  monthlyValue: number;
  message: string;
  schedulingUrl: string;
  summary: {
    serviceLabel: string;
    frequencyLabel: string;
    locationLabel: string;
  };
};

const SERVICE_OPTIONS: { value: QuoteServiceType; label: string }[] = [
  { value: "healthy_home", label: "Healthy Home Cleaning" },
  { value: "deep_refresh", label: "Deep Refresh & Detox" },
  { value: "move_in_out", label: "Move-In / Move-Out Detail" },
  { value: "commercial", label: "Eco Commercial Care" }
];

const FREQUENCY_OPTIONS: { value: QuoteFrequency; label: string; helper: string }[] = [
  { value: "one_time", label: "One-time", helper: "Perfect for seasonal or special event cleans." },
  { value: "weekly", label: "Weekly (22% savings)", helper: "Best results + biggest discount." },
  { value: "biweekly", label: "Bi-weekly (15% savings)", helper: "Our most popular cadence." },
  { value: "monthly", label: "Monthly (8% savings)", helper: "Ideal for lower-traffic homes." }
];

const LOCATION_OPTIONS: { value: QuoteLocationTier; label: string }[] = [
  { value: "sarasota", label: "Flatwoods County" },
  { value: "manatee", label: "Manatee County" },
  { value: "pinellas", label: "Pinellas County" },
  { value: "hillsborough", label: "Hillsborough County" },
  { value: "pasco", label: "Pasco County" },
  { value: "out_of_area", label: "Outside service area (travel added)" }
];

const ADD_ON_OPTIONS: { value: QuoteAddOn; label: string; helper: string }[] = [
  { value: "deep_clean_oven", label: "Deep Clean Oven", helper: "+$45" },
  { value: "deep_scrub_shower", label: "Deep Scrub Shower / Tub", helper: "+$35" },
  { value: "inside_fridge", label: "Inside Fridge Cleaning", helper: "+$30" },
  { value: "interior_windows", label: "Interior Windows & Tracks", helper: "+$55" },
  { value: "laundry_fold_iron", label: "Laundry, Fold & Iron", helper: "+$60" },
  { value: "bed_making", label: "Bed Making & Linen Change", helper: "+$25" },
  { value: "curtain_steam", label: "Curtain Steaming", helper: "+$40" },
  { value: "carpet_steaming", label: "Carpet Steaming", helper: "+$75" },
  { value: "couch_steaming", label: "Couch & Upholstery Steaming", helper: "+$65" },
  { value: "pressure_washing", label: "Driveway / Patio Pressure Wash", helper: "+$125" },
  { value: "car_detailing", label: "On-site Car Detailing", helper: "+$95" },
  { value: "eco_disinfection", label: "Eco Disinfection Fogging", helper: "+$60" }
];

const BEDROOM_OPTIONS = ["1", "2", "3", "4", "5+"];
const BATHROOM_OPTIONS = ["1", "2", "3", "4", "5+"];

const initialForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  serviceType: "healthy_home" as QuoteServiceType,
  frequency: "one_time" as QuoteFrequency,
  locationTier: "sarasota" as QuoteLocationTier,
  bedrooms: "3",
  bathrooms: "2",
  squareFootage: "1800",
  addOns: [] as QuoteAddOn[],
  preferredDate: "",
  notes: "",
  isFirstTimeClient: true
};

const defaultSchedulingSlots = [
  { date: "", start: "", end: "" },
  { date: "", start: "", end: "" },
  { date: "", start: "", end: "" }
] as const;

const countFromSelect = (value: string) => {
  if (value.endsWith("+")) {
    const numeric = parseInt(value.replace("+", ""), 10);
    return Number.isNaN(numeric) ? 5 : numeric + 1;
  }
  return parseInt(value, 10);
};

export const QuoteForm = () => {
  const router = useRouter();
  const [formValues, setFormValues] = useState(initialForm);
  const [quoteResult, setQuoteResult] = useState<QuoteResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "pricing" | "priced" | "accepted" | "declined">("idle");
  const [decisionLoading, setDecisionLoading] = useState<QuoteAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scheduleSlots, setScheduleSlots] = useState(defaultSchedulingSlots.map((slot) => ({ ...slot })));
  const [scheduleStatus, setScheduleStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [redirecting, setRedirecting] = useState(false);

  const updateField = <Key extends keyof typeof initialForm>(field: Key, value: (typeof initialForm)[Key]) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleAddOn = (addOn: QuoteAddOn) => {
    setFormValues((prev) => {
      const exists = prev.addOns.includes(addOn);
      return {
        ...prev,
        addOns: exists ? prev.addOns.filter((item) => item !== addOn) : [...prev.addOns, addOn]
      };
    });
  };

  const buildPayload = (action: QuoteAction): Record<string, unknown> => ({
    ...formValues,
    bedrooms: countFromSelect(formValues.bedrooms),
    bathrooms: countFromSelect(formValues.bathrooms),
    squareFootage: Number(formValues.squareFootage),
    action,
    quoteId: quoteResult?.quoteId
  });

  const requestQuote = async (action: QuoteAction) => {
    setError(null);
    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(buildPayload(action))
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Unable to process quote");
      }

      const data = (await response.json()) as QuoteResponse;
      setQuoteResult(data);
      return data;
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unexpected error generating quote");
      return null;
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("pricing");
    setRedirecting(true);
    const result = await requestQuote("preview");
    if (!result) {
      setStatus("idle");
      setRedirecting(false);
      return;
    }

    setStatus("priced");
    setScheduleSlots(defaultSchedulingSlots.map((slot) => ({ ...slot })));
    setScheduleStatus("idle");

    if (typeof window !== "undefined") {
      const payload = {
        ...result,
        form: {
          name: formValues.name,
          email: formValues.email,
          phone: formValues.phone,
          address: `${formValues.address}${formValues.city ? `, ${formValues.city}` : ""}`,
          serviceType: formValues.serviceType
        }
      };
      window.sessionStorage.setItem("quote:last", JSON.stringify(payload));
      window.sessionStorage.setItem(`quote:${result.quoteId}`, JSON.stringify(payload));
    }

    router.push(`/quote/confirmation?quoteId=${encodeURIComponent(result.quoteId)}`);
  };

  const handleDecision = async (action: QuoteAction) => {
    if (!quoteResult) return;
    setDecisionLoading(action);
    const result = await requestQuote(action);
    setDecisionLoading(null);
    if (result) {
      setStatus(action === "accept" ? "accepted" : "declined");
    }
  };

  const updateScheduleSlot = (index: number, field: "date" | "start" | "end", value: string) => {
    setScheduleSlots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const submitScheduleSlots = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!quoteResult) return;

    const preparedSlots = scheduleSlots
      .filter((slot) => slot.date && slot.start && slot.end)
      .map((slot, index) => ({
        start: new Date(`${slot.date}T${slot.start}`).toISOString(),
        end: new Date(`${slot.date}T${slot.end}`).toISOString(),
        priority: index + 1
      }));

    if (!preparedSlots.length) {
      setError("Please provide at least one preferred time window.");
      return;
    }

    setScheduleStatus("saving");
    try {
      const response = await fetch("/api/scheduling/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          quoteId: quoteResult.quoteId,
          slots: preparedSlots
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Unable to save scheduling preferences.");
      }

      setScheduleStatus("saved");
    } catch (err) {
      console.error(err);
      setScheduleStatus("error");
      setError(err instanceof Error ? err.message : "Unable to save scheduling preferences.");
    }
  };

  useEffect(() => {
    if (status !== "accepted") {
      setScheduleStatus("idle");
    }
  }, [status]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-brand-100 bg-white p-8 shadow-lg shadow-brand-100/40">
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          name="name"
          placeholder="Full Name"
          aria-label="Full Name"
          required
          value={formValues.name}
          onChange={(event) => updateField("name", event.target.value)}
        />
        <Input
          type="email"
          name="email"
          placeholder="Email Address"
          aria-label="Email Address"
          required
          value={formValues.email}
          onChange={(event) => updateField("email", event.target.value)}
        />
        <Input
          type="tel"
          name="phone"
          placeholder="Phone Number"
          aria-label="Phone Number"
          required
          value={formValues.phone}
          onChange={(event) => updateField("phone", event.target.value)}
        />
        <AddressAutocomplete
          value={formValues.address}
          onChange={(val) => updateField("address", val)}
          required
          label="Service address"
          placeholder="Start typing your street address"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          name="city"
          placeholder="City / Neighborhood"
          aria-label="City"
          value={formValues.city}
          onChange={(event) => updateField("city", event.target.value)}
        />
        <label className="flex flex-col text-sm font-semibold text-accent">
          Service Location
          <select
            className="mt-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
            value={formValues.locationTier}
            onChange={(event) => updateField("locationTier", event.target.value as QuoteLocationTier)}
          >
            {LOCATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col text-sm font-semibold text-accent">
          Service Type
          <select
            className="mt-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
            value={formValues.serviceType}
            onChange={(event) => updateField("serviceType", event.target.value as QuoteServiceType)}
          >
            {SERVICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm font-semibold text-accent">
          Recurring Frequency
          <select
            className="mt-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
            value={formValues.frequency}
            onChange={(event) => updateField("frequency", event.target.value as QuoteFrequency)}
          >
            {FREQUENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="mt-1 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {FREQUENCY_OPTIONS.find((option) => option.value === formValues.frequency)?.helper}
          </span>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col text-sm font-semibold text-accent">
          Bedrooms
          <select
            className="mt-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
            value={formValues.bedrooms}
            onChange={(event) => updateField("bedrooms", event.target.value)}
          >
            {BEDROOM_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm font-semibold text-accent">
          Bathrooms
          <select
            className="mt-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-base text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
            value={formValues.bathrooms}
            onChange={(event) => updateField("bathrooms", event.target.value)}
          >
            {BATHROOM_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm font-semibold text-accent">
          Square Footage
          <Input
            type="number"
            min={400}
            max={8500}
            name="squareFootage"
            placeholder="Approx. square footage"
            aria-label="Square Footage"
            className="mt-2"
            required
            value={formValues.squareFootage}
            onChange={(event) => updateField("squareFootage", event.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col text-sm font-semibold text-accent md:col-span-2">
          Preferred Date
          <Input
            type="date"
            name="preferredDate"
            aria-label="Preferred cleaning date"
            className="mt-2"
            value={formValues.preferredDate}
            onChange={(event) => updateField("preferredDate", event.target.value)}
          />
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-brand-100/80 bg-brand-50/30 px-4 py-3 text-sm font-semibold text-accent">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-brand-200 text-accent focus:ring-brand-200"
            checked={formValues.isFirstTimeClient}
            onChange={(event) => updateField("isFirstTimeClient", event.target.checked)}
          />
          First time booking with Tri State?
        </label>
      </div>

      <fieldset className="space-y-3 rounded-3xl border border-brand-100/70 bg-brand-50/40 p-4">
        <legend className="px-2 text-sm font-semibold uppercase tracking-[0.25em] text-accent/70">Add-on Services</legend>
        <p className="text-sm text-muted-foreground">
          Build a bundle that fits your property. Add-ons are priced per visit and available on recurring schedules too.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {ADD_ON_OPTIONS.map((addOn) => {
            const checked = formValues.addOns.includes(addOn.value);
            return (
              <label
                key={addOn.value}
                className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-accent shadow-sm transition hover:border-accent/40 hover:shadow-brand"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-brand-200 text-accent focus:ring-brand-200"
                  checked={checked}
                  onChange={() => toggleAddOn(addOn.value)}
                />
                <span>
                  <span className="block font-semibold">{addOn.label}</span>
                  <span className="text-xs text-muted-foreground">{addOn.helper}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="flex flex-col text-sm font-semibold text-accent">
        Notes or special instructions
        <textarea
          name="notes"
          rows={4}
          className="mt-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
          placeholder="Allergies, gate codes, pets, or anything else we should know."
          value={formValues.notes}
          onChange={(event) => updateField("notes", event.target.value)}
        />
      </label>

      <button
        type="submit"
        className="inline-flex w-full min-h-[48px] items-center justify-center rounded-full bg-accent px-8 py-3 text-base font-semibold uppercase tracking-[0.18em] text-white shadow-brand transition hover:bg-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:opacity-70"
        disabled={status === "pricing"}
      >
        {status === "pricing" ? "Calculating your quote..." : "See Instant Quote"}
      </button>

      {redirecting ? (
        <p className="text-sm font-semibold text-accent">Hang tight—loading your confirmation screen…</p>
      ) : error ? (
        <p className="text-sm font-semibold text-red-600">{error}</p>
      ) : null}

      {quoteResult ? (
        <div className="space-y-5 rounded-3xl border border-brand-100 bg-brand-50/50 p-6">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">Quote #{quoteResult.quoteId}</span>
            <h3 className="font-display text-2xl font-semibold text-accent">{quoteResult.summary.serviceLabel}</h3>
            <p className="text-sm text-muted-foreground">
              {quoteResult.summary.frequencyLabel} • {quoteResult.summary.locationLabel} • Estimated {quoteResult.pricing.estimatedDurationHours} hrs on-site
            </p>
          </div>

          <dl className="space-y-2 text-sm text-accent">
            <div className="flex items-center justify-between">
              <dt>Base clean</dt>
              <dd>${quoteResult.pricing.basePrice.toFixed(2)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Bedrooms & bathrooms</dt>
              <dd>${(quoteResult.pricing.bedroomAdjustment + quoteResult.pricing.bathroomAdjustment).toFixed(2)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Square footage adjustment</dt>
              <dd>${quoteResult.pricing.squareFootageAdjustment.toFixed(2)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Add-ons</dt>
              <dd>${quoteResult.pricing.addOnTotal.toFixed(2)}</dd>
            </div>
            {quoteResult.pricing.firstTimeFee ? (
              <div className="flex items-center justify-between">
                <dt>First visit detail boost</dt>
                <dd>${quoteResult.pricing.firstTimeFee.toFixed(2)}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-brand-700">
              <dt>Recurring savings</dt>
              <dd>- ${quoteResult.pricing.frequencyDiscount.toFixed(2)}</dd>
            </div>
            {quoteResult.pricing.travelFee ? (
              <div className="flex items-center justify-between">
                <dt>Travel & logistics</dt>
                <dd>${quoteResult.pricing.travelFee.toFixed(2)}</dd>
              </div>
            ) : null}
          </dl>

          <div className="rounded-2xl bg-white px-4 py-3 shadow-sm shadow-brand-100/50">
            <div className="flex items-center justify-between text-lg font-semibold text-accent">
              <span>Total per visit</span>
              <span>${quoteResult.pricing.total.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Cleaner pay: ${quoteResult.pricing.cleanerPay.toFixed(2)} • Company margin: ${quoteResult.pricing.companyMargin.toFixed(2)} ({quoteResult.pricing.companyMarginRate}%)
            </p>
            <p className="text-xs text-muted-foreground">
              Recurring value ≈ ${quoteResult.monthlyValue.toFixed(2)} / month. Deposit to reserve: ${quoteResult.pricing.recommendedDeposit.toFixed(2)}.
            </p>
          </div>

          {status === "priced" ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-brand transition hover:bg-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:opacity-70"
                onClick={() => handleDecision("accept")}
                disabled={decisionLoading === "accept"}
              >
                {decisionLoading === "accept" ? "Securing your clean..." : "Accept & Pick Time"}
              </button>
              <button
                type="button"
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-accent bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-accent transition hover:bg-brand-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:opacity-70"
                onClick={() => handleDecision("decline")}
                disabled={decisionLoading === "decline"}
              >
                {decisionLoading === "decline" ? "Saving your feedback..." : "Decline Quote"}
              </button>
            </div>
          ) : null}

          {status === "accepted" ? (
            <div className="space-y-4 rounded-2xl border border-brand-100 bg-white px-4 py-4 text-sm text-accent shadow-sm shadow-brand-100/40">
              <div>
                <p className="font-semibold text-accent">
                  Thank you! Your quote has been accepted. Share a few windows that work and we’ll confirm once a cleaner claims the job.
                </p>
                <p className="text-muted-foreground">
                  Pick up to three preferred windows. We’ll alert the first available cleaner and text you back once locked in.
                </p>
              </div>

              <form className="space-y-3" onSubmit={submitScheduleSlots}>
                {scheduleSlots.map((slot, index) => (
                  <div key={`slot-${index}`} className="grid gap-3 rounded-2xl border border-brand-100/80 bg-brand-50/40 p-3 sm:grid-cols-3">
                    <label className="flex flex-col text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                      Date
                      <input
                        type="date"
                        className="mt-2 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
                        value={slot.date}
                        onChange={(event) => updateScheduleSlot(index, "date", event.target.value)}
                      />
                    </label>
                    <label className="flex flex-col text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                      Start
                      <input
                        type="time"
                        className="mt-2 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
                        value={slot.start}
                        onChange={(event) => updateScheduleSlot(index, "start", event.target.value)}
                      />
                    </label>
                    <label className="flex flex-col text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                      End
                      <input
                        type="time"
                        className="mt-2 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
                        value={slot.end}
                        onChange={(event) => updateScheduleSlot(index, "end", event.target.value)}
                      />
                    </label>
                  </div>
                ))}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-brand transition hover:bg-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:opacity-70"
                    disabled={scheduleStatus === "saving"}
                  >
                    {scheduleStatus === "saving" ? "Saving availability..." : "Send Availability"}
                  </button>
                  <a
                    href={quoteResult.schedulingUrl || "tel:+16065550100"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-full border border-accent bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent transition hover:bg-brand-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
                  >
                    Use Full Scheduler
                  </a>
                </div>
              </form>

              {scheduleStatus === "saved" ? (
                <p className="text-xs font-semibold text-accent">Availability received! We’ll confirm once a pro is locked in.</p>
              ) : null}
              {scheduleStatus === "error" ? (
                <p className="text-xs font-semibold text-red-600">
                  We couldn’t save your availability. Please try again or text us at (606) 555-0100.
                </p>
              ) : null}
            </div>
          ) : null}

          {status === "declined" ? (
            <div className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-muted-foreground">
              We appreciate the opportunity to quote. Let us know if anything changes or if you’d like a revised estimate.
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Pricing factors in square footage, bedrooms/bathrooms, location logistics, and your chosen add-ons. Submit for an instant, AI-assisted quote that balances cleaner pay and competitive value.
        </p>
      )}
    </form>
  );
};
