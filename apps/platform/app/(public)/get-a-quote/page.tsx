"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Sparkles, ShieldCheck, ArrowRight, Loader2, Gift } from "lucide-react";
import {
  type QuoteServiceType,
  type QuoteFrequency,
  type QuoteLocationTier,
  type QuoteAddOn,
  type FlooringType,
  type ConditionLevel,
  type PetSituation,
  type KitchenType,
  type ClutterLevel,
  type HomeAge,
  BASE_PRICE_MAP,
  FREQUENCY_DISCOUNT,
  LOCATION_MULTIPLIER,
  ADD_ON_FEES,
  ADD_ON_LABELS,
  SERVICE_LABELS,
  FREQUENCY_LABELS,
  LOCATION_LABELS,
  FLOORING_LABELS,
  CONDITION_LABELS,
  PET_LABELS,
  KITCHEN_LABELS,
  CLUTTER_LABELS,
  HOME_AGE_LABELS,
  calculateQuote
} from "@/src/lib/pricing";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIME_SLOTS = [
  { value: "morning", label: "Morning (8am–11am)" },
  { value: "midday", label: "Midday (11am–2pm)" },
  { value: "afternoon", label: "Afternoon (2pm–5pm)" },
  { value: "evening", label: "Evening / Weekend" }
];

const ADD_ON_KEYS = Object.keys(ADD_ON_FEES) as QuoteAddOn[];

/* ──── client-side instant price calc (uses same calculateQuote as server) ──── */
function calcClientPrice(opts: {
  serviceType: QuoteServiceType;
  frequency: QuoteFrequency;
  locationTier: QuoteLocationTier;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  addOns: QuoteAddOn[];
  isFirst: boolean;
  flooringType: FlooringType;
  conditionLevel: ConditionLevel;
  petSituation: PetSituation;
  kitchenType: KitchenType;
  clutterLevel: ClutterLevel;
  homeAge: HomeAge;
  hasGarage: boolean;
  hasLaundryRoom: boolean;
  hasLanaiPatio: boolean;
  stories: number;
}) {
  const breakdown = calculateQuote({
    serviceType: opts.serviceType,
    frequency: opts.frequency,
    locationTier: opts.locationTier,
    bedrooms: opts.bedrooms,
    bathrooms: opts.bathrooms,
    squareFootage: opts.sqft,
    addOns: opts.addOns,
    isFirstTimeClient: opts.isFirst,
    flooringType: opts.flooringType,
    conditionLevel: opts.conditionLevel,
    petSituation: opts.petSituation,
    kitchenType: opts.kitchenType,
    clutterLevel: opts.clutterLevel,
    homeAge: opts.homeAge,
    hasGarage: opts.hasGarage,
    hasLaundryRoom: opts.hasLaundryRoom,
    hasLanaiPatio: opts.hasLanaiPatio,
    stories: opts.stories
  });
  return {
    total: breakdown.total,
    freqDisc: breakdown.frequencyDiscount,
    addOnTotal: breakdown.addOnTotal,
    hours: breakdown.estimatedDurationHours,
    conditionAdj: breakdown.conditionAdjustment,
    petAdj: breakdown.petAdjustment
  };
}

type FormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  serviceType: QuoteServiceType;
  frequency: QuoteFrequency;
  locationTier: QuoteLocationTier;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  addOns: QuoteAddOn[];
  keepBasic: boolean;
  day1: string;
  day2: string;
  day3: string;
  time1: string;
  time2: string;
  notes: string;
  // Granular fields for accuracy
  flooringType: FlooringType;
  conditionLevel: ConditionLevel;
  petSituation: PetSituation;
  kitchenType: KitchenType;
  clutterLevel: ClutterLevel;
  homeAge: HomeAge;
  hasGarage: boolean;
  hasLaundryRoom: boolean;
  hasLanaiPatio: boolean;
  stories: number;
  showDetails: boolean;
  referralCode: string;
};

const initial: FormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "FL",
  zip: "",
  serviceType: "healthy_home",
  frequency: "one_time",
  locationTier: "sarasota",
  bedrooms: 2,
  bathrooms: 2,
  sqft: 1500,
  addOns: [],
  keepBasic: true,
  day1: "",
  day2: "",
  day3: "",
  time1: "",
  time2: "",
  notes: "",
  flooringType: "mixed",
  conditionLevel: "average",
  petSituation: "none",
  kitchenType: "standard",
  clutterLevel: "average",
  homeAge: "10_to_30",
  hasGarage: false,
  hasLaundryRoom: false,
  hasLanaiPatio: false,
  stories: 1,
  showDetails: false,
  referralCode: ""
};

export default function GetAQuotePage() {
  const searchParams = useSearchParams();
  const [f, setF] = useState<FormState>(initial);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [quoteResult, setQuoteResult] = useState<{ quoteId: string; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [referralValid, setReferralValid] = useState<null | { valid: boolean; discount?: number; message?: string }>(null);
  const [referralChecking, setReferralChecking] = useState(false);

  // Auto-fill form fields from URL query params (rebook / referral)
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setF((prev) => ({ ...prev, referralCode: ref }));
      // Validate it immediately
      validateReferralCode(ref);
    }

    // Pre-fill from rebook query params
    const updates: Partial<FormState> = {};
    const service = searchParams.get("service");
    if (service && ["healthy_home", "deep_refresh", "move_in_out", "commercial"].includes(service)) {
      updates.serviceType = service as QuoteServiceType;
    }
    const bedrooms = searchParams.get("bedrooms");
    if (bedrooms) updates.bedrooms = Math.max(1, Math.min(8, Number(bedrooms) || 2));
    const bathrooms = searchParams.get("bathrooms");
    if (bathrooms) updates.bathrooms = Math.max(1, Math.min(8, Number(bathrooms) || 2));
    const sqft = searchParams.get("sqft");
    if (sqft) updates.sqft = Math.max(500, Math.min(10000, Number(sqft) || 1500));
    const address = searchParams.get("address");
    if (address) updates.address = address;
    const city = searchParams.get("city");
    if (city) updates.city = city;
    const state = searchParams.get("state");
    if (state) updates.state = state;
    const zip = searchParams.get("zip");
    if (zip) updates.zip = zip;
    const frequency = searchParams.get("frequency");
    if (frequency && ["one_time", "weekly", "biweekly", "monthly"].includes(frequency)) {
      updates.frequency = frequency as QuoteFrequency;
    }

    if (Object.keys(updates).length > 0) {
      setF((prev) => ({ ...prev, ...updates }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const validateReferralCode = async (code: string) => {
    if (!code.trim()) {
      setReferralValid(null);
      return;
    }
    setReferralChecking(true);
    try {
      const res = await fetch(`/api/referral/validate?code=${encodeURIComponent(code.trim())}`);
      const data = await res.json();
      setReferralValid(data);
    } catch {
      setReferralValid(null);
    } finally {
      setReferralChecking(false);
    }
  };

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setF((prev) => ({ ...prev, [key]: val }));

  const toggleAddOn = (a: QuoteAddOn) => {
    setF((prev) => {
      const has = prev.addOns.includes(a);
      return {
        ...prev,
        addOns: has ? prev.addOns.filter((x) => x !== a) : [...prev.addOns, a],
        keepBasic: false
      };
    });
  };

  const selectBasic = () => setF((prev) => ({ ...prev, addOns: [], keepBasic: true }));

  const price = useMemo(
    () =>
      calcClientPrice({
        serviceType: f.serviceType,
        frequency: f.frequency,
        locationTier: f.locationTier,
        bedrooms: f.bedrooms,
        bathrooms: f.bathrooms,
        sqft: f.sqft,
        addOns: f.addOns,
        isFirst: true,
        flooringType: f.flooringType,
        conditionLevel: f.conditionLevel,
        petSituation: f.petSituation,
        kitchenType: f.kitchenType,
        clutterLevel: f.clutterLevel,
        homeAge: f.homeAge,
        hasGarage: f.hasGarage,
        hasLaundryRoom: f.hasLaundryRoom,
        hasLanaiPatio: f.hasLanaiPatio,
        stories: f.stories
      }),
    [f.serviceType, f.frequency, f.locationTier, f.bedrooms, f.bathrooms, f.sqft, f.addOns, f.flooringType, f.conditionLevel, f.petSituation, f.kitchenType, f.clutterLevel, f.homeAge, f.hasGarage, f.hasLaundryRoom, f.hasLanaiPatio, f.stories]
  );

  const canSubmit = f.name && f.email && f.phone && f.address && f.city && f.zip && f.day1 && f.time1;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept",
          name: f.name,
          email: f.email,
          phone: f.phone,
          address: f.address,
          city: f.city,
          serviceType: f.serviceType,
          frequency: f.frequency,
          locationTier: f.locationTier,
          bedrooms: f.bedrooms,
          bathrooms: f.bathrooms,
          squareFootage: f.sqft,
          addOns: f.addOns,
          isFirstTimeClient: true,
          preferredDays: [f.day1, f.day2, f.day3].filter(Boolean),
          preferredTimes: [f.time1, f.time2].filter(Boolean),
          notes: f.notes,
          flooringType: f.flooringType,
          conditionLevel: f.conditionLevel,
          petSituation: f.petSituation,
          kitchenType: f.kitchenType,
          clutterLevel: f.clutterLevel,
          homeAge: f.homeAge,
          hasGarage: f.hasGarage,
          hasLaundryRoom: f.hasLaundryRoom,
          hasLanaiPatio: f.hasLanaiPatio,
          stories: f.stories,
          referralCode: f.referralCode || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Quote failed");
      setQuoteResult({ quoteId: data.quoteId, total: data.pricing?.total ?? price.total });
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  /* ─── INPUT HELPERS ─── */
  const inputCls =
    "w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-brand-200 focus:ring-2 focus:ring-brand-200/20 transition";
  const labelCls = "flex flex-col gap-1.5 text-sm text-white/80";
  const sectionTitle = (text: string, num: number) => (
    <div className="flex items-center gap-3 mb-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/40 text-sm font-bold text-white">
        {num}
      </span>
      <h2 className="text-lg font-semibold text-white">{text}</h2>
    </div>
  );

  /* ─── SUCCESS SCREEN ─── */
  if (status === "success" && quoteResult) {
    return (
      <div className="bg-surface py-20">
        <div className="section-wrapper max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-8 text-center text-white"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/30">
              <Check className="h-10 w-10 text-green-300" />
            </div>
            <h1 className="text-3xl font-bold">You&apos;re All Set!</h1>
            <p className="mt-2 text-lg text-white/70">
              Confirmation #{quoteResult.quoteId.slice(0, 8).toUpperCase()}
            </p>
            <div className="mt-6 rounded-2xl bg-white/10 p-6">
              <p className="text-sm text-white/60 uppercase tracking-wider">Your Quote</p>
              <p className="text-4xl font-bold text-green-300">${quoteResult.total.toFixed(2)}</p>
              <p className="mt-1 text-sm text-white/60">per visit</p>
            </div>
            <div className="mt-6 space-y-3 text-left text-sm text-white/70">
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 text-green-400 shrink-0" />
                <p>Your quote has been saved and emailed to <strong className="text-white">{f.email}</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 text-green-400 shrink-0" />
                <p>Our team has been notified and will reach out within the hour</p>
              </div>
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 text-green-400 shrink-0" />
                <p>A crew member in your area will claim your job shortly — you&apos;ll get a text when they do</p>
              </div>
            </div>
            <p className="mt-6 text-xs text-white/50">
              Questions? Call or text us at (606) 836-2534
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ─── MAIN FORM ─── */
  return (
    <div className="bg-surface py-12 pb-32">
      <div className="section-wrapper max-w-4xl">
        {/* HEADER */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-green-100/50 px-3 py-1 text-sm font-semibold text-green-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-600" />
            </span>
            Now booking this week
          </div>
          <h1 className="text-3xl font-bold text-accent md:text-4xl">See Your Price in 30 Seconds</h1>
          <p className="mt-2 text-muted-foreground">
            Answer a few questions — get an instant quote. No spam, no pressure, no commitment.
          </p>
        </div>

        {/* TRUST BAR */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: <ShieldCheck className="h-4 w-4" />, text: "100% Safe for Kids & Pets" },
            { icon: <Sparkles className="h-4 w-4" />, text: "EPA Certified Products" },
            { icon: <Clock className="h-4 w-4" />, text: "Same-Week Availability" },
            { icon: <Check className="h-4 w-4" />, text: "Satisfaction Guaranteed" }
          ].map((t) => (
            <div key={t.text} className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
              {t.icon}
              {t.text}
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* ─── LEFT: FORM ─── */}
          <div className="lg:col-span-2">
            <div className="glass space-y-8 rounded-3xl p-6 md:p-8 text-white">
              {/* SECTION 1: Service Type */}
              <div>
                {sectionTitle("What do you need?", 1)}
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(SERVICE_LABELS) as QuoteServiceType[]).map((key) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => set("serviceType", key)}
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition text-left ${
                        f.serviceType === key
                          ? "border-brand-200 bg-brand-500/30 text-white shadow-brand"
                          : "border-white/20 bg-white/5 text-white/70 hover:border-brand-200"
                      }`}
                    >
                      {SERVICE_LABELS[key]}
                      <span className="block text-xs font-normal text-white/50 mt-0.5">
                        from ${BASE_PRICE_MAP[key]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 2: Home/Space Details */}
              <div>
                {sectionTitle(f.serviceType === "commercial" ? "Tell us about your space" : "Tell us about your home", 2)}
                <div className="grid gap-4 sm:grid-cols-3">
                  {f.serviceType !== "commercial" && (
                    <>
                      <label className={labelCls}>
                        Bedrooms
                        <select value={f.bedrooms} onChange={(e) => set("bedrooms", +e.target.value)} className={inputCls}>
                          {[1, 2, 3, 4, 5, 6].map((n) => (
                            <option key={n} value={n} className="bg-gray-800">{n}{n === 6 ? "+" : ""}</option>
                          ))}
                        </select>
                      </label>
                      <label className={labelCls}>
                        Bathrooms
                        <select value={f.bathrooms} onChange={(e) => set("bathrooms", +e.target.value)} className={inputCls}>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n} className="bg-gray-800">{n}{n === 5 ? "+" : ""}</option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                  <label className={labelCls}>
                    Approx. Sq Ft
                    <select value={f.sqft} onChange={(e) => set("sqft", +e.target.value)} className={inputCls}>
                      {[800, 1000, 1200, 1500, 1800, 2000, 2500, 3000, 3500, 4000, 5000].map((n) => (
                        <option key={n} value={n} className="bg-gray-800">{n.toLocaleString()} sq ft</option>
                      ))}
                    </select>
                  </label>
                  {f.serviceType === "commercial" && (
                    <label className={labelCls}>
                      Area Type
                      <select value={f.notes.includes("Office") ? "office" : "other"} onChange={(e) => set("notes", `Area: ${e.target.value}. ${f.notes}`)} className={inputCls}>
                        <option value="office" className="bg-gray-800">Office</option>
                        <option value="retail" className="bg-gray-800">Retail / Storefront</option>
                        <option value="medical" className="bg-gray-800">Medical / Clinic</option>
                        <option value="restaurant" className="bg-gray-800">Restaurant / Kitchen</option>
                        <option value="warehouse" className="bg-gray-800">Warehouse / Industrial</option>
                        <option value="other" className="bg-gray-800">Other</option>
                      </select>
                    </label>
                  )}
                </div>
              </div>

              {/* SECTION 2B: Fine-tune details (toggleable) */}
              <div>
                <button
                  type="button"
                  onClick={() => set("showDetails", !f.showDetails)}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/20 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white/80 transition hover:border-brand-200/50 hover:bg-white/10"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-300" />
                    Fine-tune for a more accurate quote
                  </span>
                  <span className="text-white/40">{f.showDetails ? "▲ Hide" : "▼ Show"}</span>
                </button>

                <AnimatePresence>
                  {f.showDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 space-y-5 rounded-2xl border border-white/10 bg-white/5 p-5">
                        {/* Condition + Flooring Row */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className={labelCls}>
                            Current Condition
                            <select value={f.conditionLevel} onChange={(e) => set("conditionLevel", e.target.value as ConditionLevel)} className={inputCls}>
                              {(Object.keys(CONDITION_LABELS) as ConditionLevel[]).map((key) => (
                                <option key={key} value={key} className="bg-gray-800">{CONDITION_LABELS[key]}</option>
                              ))}
                            </select>
                          </label>
                          <label className={labelCls}>
                            Primary Flooring
                            <select value={f.flooringType} onChange={(e) => set("flooringType", e.target.value as FlooringType)} className={inputCls}>
                              {(Object.keys(FLOORING_LABELS) as FlooringType[]).map((key) => (
                                <option key={key} value={key} className="bg-gray-800">{FLOORING_LABELS[key]}</option>
                              ))}
                            </select>
                          </label>
                        </div>

                        {/* Pet + Kitchen Row */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className={labelCls}>
                            Pets
                            <select value={f.petSituation} onChange={(e) => set("petSituation", e.target.value as PetSituation)} className={inputCls}>
                              {(Object.keys(PET_LABELS) as PetSituation[]).map((key) => (
                                <option key={key} value={key} className="bg-gray-800">{PET_LABELS[key]}</option>
                              ))}
                            </select>
                          </label>
                          <label className={labelCls}>
                            Kitchen Type
                            <select value={f.kitchenType} onChange={(e) => set("kitchenType", e.target.value as KitchenType)} className={inputCls}>
                              {(Object.keys(KITCHEN_LABELS) as KitchenType[]).map((key) => (
                                <option key={key} value={key} className="bg-gray-800">{KITCHEN_LABELS[key]}</option>
                              ))}
                            </select>
                          </label>
                        </div>

                        {/* Clutter + Home Age Row */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className={labelCls}>
                            Clutter Level
                            <select value={f.clutterLevel} onChange={(e) => set("clutterLevel", e.target.value as ClutterLevel)} className={inputCls}>
                              {(Object.keys(CLUTTER_LABELS) as ClutterLevel[]).map((key) => (
                                <option key={key} value={key} className="bg-gray-800">{CLUTTER_LABELS[key]}</option>
                              ))}
                            </select>
                          </label>
                          <label className={labelCls}>
                            Home Age
                            <select value={f.homeAge} onChange={(e) => set("homeAge", e.target.value as HomeAge)} className={inputCls}>
                              {(Object.keys(HOME_AGE_LABELS) as HomeAge[]).map((key) => (
                                <option key={key} value={key} className="bg-gray-800">{HOME_AGE_LABELS[key]}</option>
                              ))}
                            </select>
                          </label>
                        </div>

                        {/* Stories + Extra Areas */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className={labelCls}>
                            Stories
                            <select value={f.stories} onChange={(e) => set("stories", +e.target.value)} className={inputCls}>
                              <option value={1} className="bg-gray-800">Single Story</option>
                              <option value={2} className="bg-gray-800">Two Story</option>
                              <option value={3} className="bg-gray-800">Three+ Story</option>
                            </select>
                          </label>
                          <div className="space-y-2 text-sm text-white/80">
                            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Extra Areas</p>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={f.hasGarage} onChange={(e) => set("hasGarage", e.target.checked)} className="rounded border-white/30 bg-white/10 text-brand-500" />
                              Garage (+$15)
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={f.hasLaundryRoom} onChange={(e) => set("hasLaundryRoom", e.target.checked)} className="rounded border-white/30 bg-white/10 text-brand-500" />
                              Laundry Room (+$12)
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={f.hasLanaiPatio} onChange={(e) => set("hasLanaiPatio", e.target.checked)} className="rounded border-white/30 bg-white/10 text-brand-500" />
                              Lanai / Patio (+$20)
                            </label>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* SECTION 3: Extras */}
              <div>
                {sectionTitle("Extras (or keep it basic)", 3)}
                <button
                  type="button"
                  onClick={selectBasic}
                  className={`mb-4 w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    f.keepBasic && f.addOns.length === 0
                      ? "border-brand-200 bg-brand-500/30 text-white shadow-brand"
                      : "border-white/20 bg-white/5 text-white/70 hover:border-brand-200"
                  }`}
                >
                  <Check className={`inline h-4 w-4 mr-2 ${f.keepBasic && f.addOns.length === 0 ? "text-green-300" : "text-white/30"}`} />
                  Keep It Basic — Standard Service Only
                </button>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {ADD_ON_KEYS.map((key) => {
                    const active = f.addOns.includes(key);
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => toggleAddOn(key)}
                        className={`rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition ${
                          active
                            ? "border-brand-200 bg-brand-500/30 text-white"
                            : "border-white/15 bg-white/5 text-white/60 hover:border-brand-200/50"
                        }`}
                      >
                        <span className="block">{ADD_ON_LABELS[key]}</span>
                        <span className="block text-white/40 mt-0.5">+${ADD_ON_FEES[key]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 4: How Often */}
              <div>
                {sectionTitle("How often?", 4)}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(Object.keys(FREQUENCY_LABELS) as QuoteFrequency[]).map((key) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => set("frequency", key)}
                      className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                        f.frequency === key
                          ? "border-brand-200 bg-brand-500/30 text-white shadow-brand"
                          : "border-white/20 bg-white/5 text-white/70 hover:border-brand-200"
                      }`}
                    >
                      {FREQUENCY_LABELS[key]}
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 5: Scheduling */}
              <div>
                {sectionTitle("When works best?", 5)}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Preferred Day</p>
                    {[
                      { label: "1st choice", key: "day1" as const },
                      { label: "2nd choice", key: "day2" as const },
                      { label: "3rd choice", key: "day3" as const }
                    ].map(({ label, key }) => (
                      <label key={key} className={labelCls}>
                        {label} {key === "day1" && <span className="text-red-300">*</span>}
                        <select value={f[key]} onChange={(e) => set(key, e.target.value)} className={inputCls}>
                          <option value="" className="bg-gray-800">Select day...</option>
                          {DAYS_OF_WEEK.map((d) => (
                            <option key={d} value={d} className="bg-gray-800">{d}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Preferred Time</p>
                    {[
                      { label: "1st choice", key: "time1" as const },
                      { label: "2nd choice", key: "time2" as const }
                    ].map(({ label, key }) => (
                      <label key={key} className={labelCls}>
                        {label} {key === "time1" && <span className="text-red-300">*</span>}
                        <select value={f[key]} onChange={(e) => set(key, e.target.value)} className={inputCls}>
                          <option value="" className="bg-gray-800">Select time...</option>
                          {TIME_SLOTS.map((t) => (
                            <option key={t.value} value={t.value} className="bg-gray-800">{t.label}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 6: Location */}
              <div>
                {sectionTitle("Where are you located?", 6)}
                <div className="mb-4">
                  <label className={labelCls}>
                    County
                    <select value={f.locationTier} onChange={(e) => set("locationTier", e.target.value as QuoteLocationTier)} className={inputCls}>
                      {(Object.keys(LOCATION_LABELS) as QuoteLocationTier[]).map((key) => (
                        <option key={key} value={key} className="bg-gray-800">{LOCATION_LABELS[key]}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelCls}>
                    Street Address <span className="text-red-300">*</span>
                    <input value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="123 Palm Ave" className={inputCls} />
                  </label>
                  <label className={labelCls}>
                    City <span className="text-red-300">*</span>
                    <input value={f.city} onChange={(e) => set("city", e.target.value)} placeholder="Flatwoods" className={inputCls} />
                  </label>
                  <label className={labelCls}>
                    State
                    <input value={f.state} onChange={(e) => set("state", e.target.value)} maxLength={2} className={`${inputCls} uppercase`} />
                  </label>
                  <label className={labelCls}>
                    Zip <span className="text-red-300">*</span>
                    <input value={f.zip} onChange={(e) => set("zip", e.target.value)} placeholder="34236" className={inputCls} />
                  </label>
                </div>
              </div>

              {/* SECTION 7: Contact */}
              <div>
                {sectionTitle("Your contact info", 7)}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelCls}>
                    Full Name <span className="text-red-300">*</span>
                    <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Jane Smith" className={inputCls} />
                  </label>
                  <label className={labelCls}>
                    Email <span className="text-red-300">*</span>
                    <input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@example.com" className={inputCls} />
                  </label>
                  <label className={labelCls}>
                    Phone <span className="text-red-300">*</span>
                    <input type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(941) 555-0123" className={inputCls} />
                  </label>
                  <label className={labelCls}>
                    Notes for your crew
                    <input value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Gate code, pet info..." className={inputCls} />
                  </label>
                </div>

                {/* Referral Code */}
                <div className="mt-4">
                  <label className={labelCls}>
                    <span className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-brand-300" />
                      Referral Code
                    </span>
                    <div className="flex gap-2">
                      <input
                        value={f.referralCode}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          set("referralCode", val);
                          setReferralValid(null);
                        }}
                        onBlur={() => validateReferralCode(f.referralCode)}
                        placeholder="TRISTATE..."
                        className={`${inputCls} font-mono tracking-wider`}
                      />
                      {referralChecking && (
                        <div className="flex items-center">
                          <Loader2 className="h-4 w-4 animate-spin text-white/50" />
                        </div>
                      )}
                    </div>
                    {referralValid?.valid && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-green-300">
                        <Check className="h-3.5 w-3.5" />
                        Referral applied — ${referralValid.discount ?? 25} off your first service!
                      </p>
                    )}
                    {referralValid && !referralValid.valid && (
                      <p className="mt-1 text-xs text-red-300">
                        {referralValid.message || "Invalid referral code"}
                      </p>
                    )}
                  </label>
                </div>
              </div>

              {/* SUBMIT */}
              <AnimatePresence>
                {status === "error" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                  >
                    {errorMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={handleSubmit}
                disabled={!canSubmit || status === "loading"}
                className="w-full rounded-full bg-brand-500 px-6 py-4 text-lg font-bold text-white shadow-brand transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-white/20 flex items-center justify-center gap-2"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    Book My Service — ${price.total.toFixed(2)}
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              <p className="text-center text-xs text-white/40">
                No credit card required. No commitment. Cancel anytime. 100% satisfaction guaranteed.
              </p>
            </div>
          </div>

          {/* ─── RIGHT: LIVE PRICE SIDEBAR ─── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-3xl bg-white p-6 shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Estimate</p>
              <p className="mt-1 text-4xl font-bold text-accent">${price.total.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">per visit</p>

              {/* Estimated Duration */}
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm">
                <Clock className="h-4 w-4 text-brand-600" />
                <span className="font-semibold text-brand-700">{price.hours} hours</span>
                <span className="text-muted-foreground">estimated</span>
              </div>

              <div className="mt-4 space-y-2 border-t border-brand-100 pt-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{SERVICE_LABELS[f.serviceType]}</span>
                  <span>${BASE_PRICE_MAP[f.serviceType]}</span>
                </div>
                {f.serviceType !== "commercial" && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{f.bedrooms} bed + {f.bathrooms} bath</span>
                  <span>+${(f.bedrooms * 14 + f.bathrooms * 22).toFixed(0)}</span>
                </div>
                )}
                {price.conditionAdj !== 0 && (
                  <div className={`flex justify-between ${price.conditionAdj > 0 ? "text-amber-600" : "text-green-600"} font-medium`}>
                    <span>Condition adj.</span>
                    <span>{price.conditionAdj > 0 ? "+" : ""}${price.conditionAdj.toFixed(0)}</span>
                  </div>
                )}
                {price.petAdj > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Pet adjustment</span>
                    <span>+${price.petAdj.toFixed(0)}</span>
                  </div>
                )}
                {price.addOnTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{f.addOns.length} extra{f.addOns.length > 1 ? "s" : ""}</span>
                    <span>+${price.addOnTotal}</span>
                  </div>
                )}
                {price.freqDisc > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Recurring discount</span>
                    <span>-${price.freqDisc.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-accent border-t border-brand-100 pt-2">
                  <span>Total</span>
                  <span>${price.total.toFixed(2)}</span>
                </div>
              </div>

              {f.frequency !== "one_time" && (
                <div className="mt-4 rounded-xl bg-green-50 p-3 text-center text-xs text-green-700">
                  <strong>You save ${price.freqDisc.toFixed(2)}</strong> per visit with {FREQUENCY_LABELS[f.frequency].split(" (")[0]} service
                </div>
              )}

              <div className="mt-6 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                  <span>Licensed, Insured & Background-Checked</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-green-600" />
                  <span>Licensed, Bonded &amp; Insured Since 1992</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                  <span>100% Satisfaction Guarantee</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
