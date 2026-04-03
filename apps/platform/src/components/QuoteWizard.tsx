"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Sparkles, RefreshCcw, Building2, Check, ChevronRight, ChevronLeft, Clock, Users, Zap } from "lucide-react";
import { Input } from "@/src/components/ui/input";
import { AddressAutocomplete } from "@/src/components/AddressAutocomplete";
import type {
  QuoteAddOn, QuoteFrequency, QuoteServiceType, QuoteLocationTier,
  FlooringType, ConditionLevel, KitchenType, PetSituation, ClutterLevel, HomeAge,
  BathroomType, BedroomSize,
} from "@/src/lib/pricing";
import {
  FLOORING_LABELS, CONDITION_LABELS, KITCHEN_LABELS, PET_LABELS,
  CLUTTER_LABELS, HOME_AGE_LABELS, BATHROOM_TYPE_LABELS, BEDROOM_SIZE_LABELS,
} from "@/src/lib/pricing";

// Static trust line — no fake urgency/scarcity data

type WizardStep = "service" | "size" | "details" | "frequency" | "addons" | "schedule" | "contact" | "review";

const STEPS: WizardStep[] = ["service", "size", "details", "frequency", "addons", "schedule", "contact", "review"];

const SERVICE_OPTIONS: { value: QuoteServiceType; label: string; description: string; icon: typeof Home; popular?: boolean }[] = [
  { 
    value: "healthy_home", 
    label: "Healthy Home", 
    description: "Weekly, bi-weekly, or monthly maintenance service",
    icon: Home,
    popular: true
  },
  { 
    value: "deep_refresh", 
    label: "Deep Refresh", 
    description: "Thorough top-to-bottom detox for your space",
    icon: Sparkles
  },
  { 
    value: "move_in_out", 
    label: "Move In/Out", 
    description: "Get your full deposit back guaranteed",
    icon: RefreshCcw
  },
  { 
    value: "commercial", 
    label: "Commercial", 
    description: "Offices, studios, and professional spaces",
    icon: Building2
  },
];

const FREQUENCY_OPTIONS: { value: QuoteFrequency; label: string; savings: string; description: string; popular?: boolean }[] = [
  { value: "weekly", label: "Weekly", savings: "Save 22%", description: "Best results + biggest savings", popular: true },
  { value: "biweekly", label: "Every 2 Weeks", savings: "Save 15%", description: "Our most popular choice" },
  { value: "monthly", label: "Monthly", savings: "Save 8%", description: "Perfect for light-traffic homes" },
  { value: "one_time", label: "One Time", savings: "", description: "One-time project or special job" },
];

const ADD_ON_OPTIONS: { value: QuoteAddOn; label: string; price: string; icon: string }[] = [
  { value: "deep_clean_oven", label: "Deep Clean Oven", price: "+$45", icon: "🔥" },
  { value: "deep_scrub_shower", label: "Deep Scrub Shower", price: "+$35", icon: "🚿" },
  { value: "inside_fridge", label: "Inside Fridge", price: "+$30", icon: "🧊" },
  { value: "interior_windows", label: "Interior Windows", price: "+$55", icon: "🪟" },
  { value: "laundry_fold_iron", label: "Laundry & Iron", price: "+$60", icon: "👕" },
  { value: "bed_making", label: "Bed Making", price: "+$25", icon: "🛏️" },
  { value: "curtain_steam", label: "Curtain Steam", price: "+$40", icon: "🪄" },
  { value: "carpet_steaming", label: "Carpet Steaming", price: "+$75", icon: "🧹" },
  { value: "couch_steaming", label: "Couch Steaming", price: "+$65", icon: "🛋️" },
  { value: "pressure_washing", label: "Pressure Wash", price: "+$125", icon: "💦" },
  { value: "car_detailing", label: "Car Detailing", price: "+$95", icon: "🚗" },
  { value: "eco_disinfection", label: "Eco Disinfection", price: "+$60", icon: "🦠" },
];

const LOCATION_OPTIONS: { value: QuoteLocationTier; label: string }[] = [
  { value: "sarasota", label: "Flatwoods County" },
  { value: "manatee", label: "Manatee County" },
  { value: "pinellas", label: "Pinellas County" },
  { value: "hillsborough", label: "Hillsborough County" },
  { value: "pasco", label: "Pasco County" },
  { value: "out_of_area", label: "Other Area" },
];

type FormData = {
  serviceType: QuoteServiceType;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  frequency: QuoteFrequency;
  addOns: QuoteAddOn[];
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  locationTier: QuoteLocationTier;
  notes: string;
  isFirstTimeClient: boolean;
  // Granular home details
  flooringType: FlooringType;
  conditionLevel: ConditionLevel;
  kitchenType: KitchenType;
  petSituation: PetSituation;
  clutterLevel: ClutterLevel;
  homeAge: HomeAge;
  bathroomTypes: BathroomType[];
  bedroomSizes: BedroomSize[];
  preferredDate: string;
  preferredDayOfWeek: string;
  preferredTimeSlot: "morning" | "midday" | "afternoon" | "flexible";
};

const initialFormData: FormData = {
  serviceType: "healthy_home",
  bedrooms: 3,
  bathrooms: 2,
  squareFootage: 1800,
  frequency: "biweekly",
  addOns: [],
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  locationTier: "sarasota",
  notes: "",
  isFirstTimeClient: true,
  flooringType: "mixed",
  conditionLevel: "average",
  kitchenType: "standard",
  petSituation: "none",
  clutterLevel: "average",
  homeAge: "10_to_30",
  bathroomTypes: [],
  bedroomSizes: [],
  preferredDate: "",
  preferredDayOfWeek: "",
  preferredTimeSlot: "flexible",
};

export const QuoteWizard = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>("service");
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentIndex = STEPS.indexOf(currentStep);
  const progress = ((currentIndex + 1) / STEPS.length) * 100;

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleAddOn = (addOn: QuoteAddOn) => {
    setFormData((prev) => ({
      ...prev,
      addOns: prev.addOns.includes(addOn)
        ? prev.addOns.filter((a) => a !== addOn)
        : [...prev.addOns, addOn],
    }));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case "service":
        return !!formData.serviceType;
      case "size":
        return formData.bedrooms > 0 && formData.bathrooms > 0 && formData.squareFootage >= 400;
      case "details":
        return true; // Optional step — all fields have defaults
      case "frequency":
        return !!formData.frequency;
      case "addons":
        return true; // Optional step
      case "schedule":
        return true; // Optional — "flexible" is a valid default
      case "contact":
        return !!formData.name && !!formData.email && !!formData.phone && !!formData.address;
      case "review":
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          action: "preview",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Unable to generate quote");
      }

      const result = await response.json();
      
      // Store quote data for confirmation page
      if (typeof window !== "undefined") {
        const payload = {
          ...result,
          form: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: `${formData.address}${formData.city ? `, ${formData.city}` : ""}`,
            serviceType: formData.serviceType,
          },
        };
        window.sessionStorage.setItem("quote:last", JSON.stringify(payload));
        window.sessionStorage.setItem(`quote:${result.quoteId}`, JSON.stringify(payload));
      }

      // Redirect to the stunning estimate page if available, otherwise confirmation page
      if (result.estimateUrl) {
        window.location.href = result.estimateUrl;
      } else {
        router.push(`/quote/confirmation?quoteId=${encodeURIComponent(result.quoteId)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 300 : -300, opacity: 0 }),
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Trust Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-center gap-3 sm:gap-6 rounded-2xl bg-gradient-to-r from-brand-50 to-green-50 px-3 sm:px-4 py-3 text-xs sm:text-sm"
      >
        <span className="flex items-center gap-2 font-medium text-accent">
          <Zap className="h-4 w-4 text-brand-500" />
          Instant quote — no obligation
        </span>
        <span className="hidden sm:flex items-center gap-2 text-accent/70">
          <Clock className="h-4 w-4" />
          Takes about 30 seconds
        </span>
        <span className="flex items-center gap-2 text-accent/70">
          <Users className="h-4 w-4" />
          5.0 ★ Google rating
        </span>
      </motion.div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="mb-2 flex justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span>Step {currentIndex + 1} of {STEPS.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-brand-100">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="relative min-h-[400px] overflow-hidden rounded-3xl border border-brand-100 bg-white p-4 sm:p-6 md:p-8 shadow-lg shadow-brand-100/40">
        <AnimatePresence mode="wait" custom={1}>
          <motion.div
            key={currentStep}
            custom={1}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/* Step 1: Service Type */}
            {currentStep === "service" && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="font-display text-2xl font-semibold text-accent">What do you need cleaned?</h2>
                  <p className="mt-2 text-muted-foreground">Choose the service that fits your needs</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {SERVICE_OPTIONS.map((service) => {
                    const Icon = service.icon;
                    const isSelected = formData.serviceType === service.value;
                    return (
                      <button
                        key={service.value}
                        type="button"
                        onClick={() => updateField("serviceType", service.value)}
                        className={`relative flex flex-col items-start rounded-2xl border-2 p-5 text-left transition-all ${
                          isSelected
                            ? "border-brand-500 bg-brand-50 shadow-lg shadow-brand-100"
                            : "border-brand-100 bg-white hover:border-brand-200 hover:shadow-md"
                        }`}
                      >
                        {service.popular && (
                          <span className="absolute -top-2 right-4 rounded-full bg-sunshine px-3 py-0.5 text-xs font-semibold text-accent">
                            Popular
                          </span>
                        )}
                        <div className={`rounded-xl p-2 ${isSelected ? "bg-brand-500 text-white" : "bg-brand-100 text-brand-600"}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <h3 className="mt-3 font-semibold text-accent">{service.label}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                        {isSelected && (
                          <div className="absolute right-3 top-3">
                            <Check className="h-5 w-5 text-brand-600" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Size */}
            {currentStep === "size" && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="font-display text-2xl font-semibold text-accent">How big is your space?</h2>
                  <p className="mt-2 text-muted-foreground">This helps us give you an accurate quote</p>
                </div>

                <div className="space-y-6">
                  {/* Bedrooms */}
                  <div>
                    <label className="mb-3 block text-sm font-semibold text-accent">Bedrooms</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => updateField("bedrooms", num)}
                          className={`flex-1 rounded-xl py-3 text-center font-semibold transition-all ${
                            formData.bedrooms === num
                              ? "bg-brand-500 text-white shadow-lg"
                              : "bg-brand-50 text-accent hover:bg-brand-100"
                          }`}
                        >
                          {num}{num === 5 ? "+" : ""}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bathrooms */}
                  <div>
                    <label className="mb-3 block text-sm font-semibold text-accent">Bathrooms</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => updateField("bathrooms", num)}
                          className={`flex-1 rounded-xl py-3 text-center font-semibold transition-all ${
                            formData.bathrooms === num
                              ? "bg-brand-500 text-white shadow-lg"
                              : "bg-brand-50 text-accent hover:bg-brand-100"
                          }`}
                        >
                          {num}{num === 5 ? "+" : ""}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Square Footage Slider */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-sm font-semibold text-accent">Square Footage</label>
                      <span className="text-lg font-bold text-brand-600">{formData.squareFootage.toLocaleString()} sqft</span>
                    </div>
                    <input
                      type="range"
                      min={500}
                      max={6000}
                      step={100}
                      value={formData.squareFootage}
                      onChange={(e) => updateField("squareFootage", parseInt(e.target.value))}
                      className="w-full accent-brand-500"
                    />
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                      <span>500 sqft</span>
                      <span>6,000+ sqft</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Home Details (Granular) */}
            {currentStep === "details" && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="font-display text-2xl font-semibold text-accent">Tell us about your home</h2>
                  <p className="mt-2 text-muted-foreground">Optional details for a more accurate quote</p>
                </div>

                <div className="space-y-5">
                  {/* Flooring Type */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-accent">Flooring Type</label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(FLOORING_LABELS) as [FlooringType, string][]).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateField("flooringType", value)}
                          className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                            formData.flooringType === value
                              ? "bg-brand-500 text-white shadow-md"
                              : "bg-brand-50 text-accent hover:bg-brand-100"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Condition Level */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-accent">Current Condition</label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(CONDITION_LABELS) as [ConditionLevel, string][]).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateField("conditionLevel", value)}
                          className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                            formData.conditionLevel === value
                              ? "bg-brand-500 text-white shadow-md"
                              : "bg-brand-50 text-accent hover:bg-brand-100"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pet Situation */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-accent">Pets</label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(PET_LABELS) as [PetSituation, string][]).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateField("petSituation", value)}
                          className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                            formData.petSituation === value
                              ? "bg-brand-500 text-white shadow-md"
                              : "bg-brand-50 text-accent hover:bg-brand-100"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Kitchen Type */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-accent">Kitchen</label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(KITCHEN_LABELS) as [KitchenType, string][]).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateField("kitchenType", value)}
                          className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                            formData.kitchenType === value
                              ? "bg-brand-500 text-white shadow-md"
                              : "bg-brand-50 text-accent hover:bg-brand-100"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Home Age */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-accent">Home Age</label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(HOME_AGE_LABELS) as [HomeAge, string][]).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateField("homeAge", value)}
                          className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                            formData.homeAge === value
                              ? "bg-brand-500 text-white shadow-md"
                              : "bg-brand-50 text-accent hover:bg-brand-100"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={nextStep}
                  className="w-full text-center text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline"
                >
                  Skip — use defaults
                </button>
              </div>
            )}

            {/* Step 4: Frequency */}
            {currentStep === "frequency" && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="font-display text-2xl font-semibold text-accent">How often do you need us?</h2>
                  <p className="mt-2 text-muted-foreground">Recurring cleans save you money and keep your home healthier</p>
                </div>
                <div className="space-y-3">
                  {FREQUENCY_OPTIONS.map((freq) => {
                    const isSelected = formData.frequency === freq.value;
                    return (
                      <button
                        key={freq.value}
                        type="button"
                        onClick={() => updateField("frequency", freq.value)}
                        className={`relative flex w-full items-center justify-between rounded-2xl border-2 px-5 py-4 text-left transition-all ${
                          isSelected
                            ? "border-brand-500 bg-brand-50 shadow-lg shadow-brand-100"
                            : "border-brand-100 bg-white hover:border-brand-200"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                            isSelected ? "border-brand-500 bg-brand-500" : "border-brand-200"
                          }`}>
                            {isSelected && <Check className="h-4 w-4 text-white" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-accent">{freq.label}</span>
                              {freq.popular && (
                                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                                  Most Popular
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{freq.description}</p>
                          </div>
                        </div>
                        {freq.savings && (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                            {freq.savings}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Add-ons */}
            {currentStep === "addons" && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="font-display text-2xl font-semibold text-accent">Any extras?</h2>
                  <p className="mt-2 text-muted-foreground">Optional add-ons to customize your clean</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ADD_ON_OPTIONS.map((addon) => {
                    const isSelected = formData.addOns.includes(addon.value);
                    return (
                      <button
                        key={addon.value}
                        type="button"
                        onClick={() => toggleAddOn(addon.value)}
                        className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                          isSelected
                            ? "border-brand-500 bg-brand-50"
                            : "border-brand-100 bg-white hover:border-brand-200"
                        }`}
                      >
                        <span className="text-2xl">{addon.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium text-accent">{addon.label}</p>
                          <p className="text-sm text-muted-foreground">{addon.price}</p>
                        </div>
                        <div className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                          isSelected ? "border-brand-500 bg-brand-500" : "border-brand-200"
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Skip this step if you just want the standard clean
                </p>
              </div>
            )}

            {/* Step 5: Schedule Preference */}
            {currentStep === "schedule" && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="font-display text-2xl font-semibold text-accent">When works best?</h2>
                  <p className="mt-2 text-muted-foreground">Pick a preferred date and time — we'll confirm availability.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-accent">Preferred Date</label>
                    <input
                      type="date"
                      value={formData.preferredDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => updateField("preferredDate", e.target.value)}
                      className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3.5 text-base text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-accent">Preferred Day of Week</label>
                    <div className="flex flex-wrap gap-2">
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => updateField("preferredDayOfWeek", formData.preferredDayOfWeek === day ? "" : day)}
                          className={`rounded-full border-2 px-4 py-2 text-sm font-semibold transition active:scale-[0.97] ${
                            formData.preferredDayOfWeek === day
                              ? "border-accent bg-brand-50 text-accent"
                              : "border-brand-100 bg-white text-muted-foreground hover:border-brand-200"
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-center text-xs text-muted-foreground">Optional — we&apos;ll work around your schedule</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-accent">Preferred Time</label>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { value: "morning", label: "Morning", sub: "8 AM – 11 AM", icon: "🌅" },
                        { value: "midday", label: "Midday", sub: "11 AM – 1 PM", icon: "☀️" },
                        { value: "afternoon", label: "Afternoon", sub: "1 PM – 4 PM", icon: "🌤️" },
                        { value: "flexible", label: "Flexible", sub: "Any time works", icon: "🙌" },
                      ] as const).map((slot) => (
                        <button
                          key={slot.value}
                          type="button"
                          onClick={() => updateField("preferredTimeSlot", slot.value)}
                          className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-4 py-4 text-center transition active:scale-[0.97] ${
                            formData.preferredTimeSlot === slot.value
                              ? "border-accent bg-brand-50 text-accent"
                              : "border-brand-100 bg-white text-muted-foreground hover:border-brand-200"
                          }`}
                        >
                          <span className="text-2xl">{slot.icon}</span>
                          <span className="text-sm font-bold">{slot.label}</span>
                          <span className="text-xs text-muted-foreground">{slot.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  Skip this step for flexible scheduling — we'll reach out to confirm
                </p>
              </div>
            )}

            {/* Step 6: Contact Info */}
            {currentStep === "contact" && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="font-display text-2xl font-semibold text-accent">Almost there!</h2>
                  <p className="mt-2 text-muted-foreground">Where should we send your instant quote?</p>
                </div>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      required
                    />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      required
                    />
                  </div>
                  <Input
                    type="tel"
                    placeholder="Phone number"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    required
                  />
                  <AddressAutocomplete
                    value={formData.address}
                    onChange={(val) => updateField("address", val)}
                    required
                    label=""
                    placeholder="Service address"
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      placeholder="City"
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                    />
                    <select
                      value={formData.locationTier}
                      onChange={(e) => updateField("locationTier", e.target.value as QuoteLocationTier)}
                      className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
                    >
                      {LOCATION_OPTIONS.map((loc) => (
                        <option key={loc.value} value={loc.value}>{loc.label}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    placeholder="Special instructions, gate codes, pets, etc. (optional)"
                    value={formData.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200"
                  />
                </div>
              </div>
            )}

            {/* Step 6: Review */}
            {currentStep === "review" && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="font-display text-2xl font-semibold text-accent">Review your request</h2>
                  <p className="mt-2 text-muted-foreground">Confirm details and get your instant quote</p>
                </div>
                <div className="space-y-4 rounded-2xl bg-brand-50/50 p-5">
                  <div className="flex justify-between border-b border-brand-100 pb-3">
                    <span className="text-muted-foreground">Service</span>
                    <span className="font-medium text-accent">
                      {SERVICE_OPTIONS.find((s) => s.value === formData.serviceType)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-brand-100 pb-3">
                    <span className="text-muted-foreground">Size</span>
                    <span className="font-medium text-accent">
                      {formData.bedrooms} bed / {formData.bathrooms} bath • {formData.squareFootage.toLocaleString()} sqft
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-brand-100 pb-3">
                    <span className="text-muted-foreground">Frequency</span>
                    <span className="font-medium text-accent">
                      {FREQUENCY_OPTIONS.find((f) => f.value === formData.frequency)?.label}
                    </span>
                  </div>
                  {formData.addOns.length > 0 && (
                    <div className="flex justify-between border-b border-brand-100 pb-3">
                      <span className="text-muted-foreground">Add-ons</span>
                      <span className="font-medium text-accent">
                        {formData.addOns.length} selected
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-brand-100 pb-3">
                    <span className="text-muted-foreground">Contact</span>
                    <span className="text-right font-medium text-accent">
                      {formData.name}<br />
                      <span className="text-sm text-muted-foreground">{formData.email}</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address</span>
                    <span className="text-right font-medium text-accent">
                      {formData.address}
                      {formData.city && <>, {formData.city}</>}
                    </span>
                  </div>
                </div>

                {/* Trust Signals */}
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Check className="h-4 w-4 text-brand-500" /> Licensed & Insured
                  </span>
                  <span className="flex items-center gap-1">
                    <Check className="h-4 w-4 text-brand-500" /> Satisfaction Guaranteed
                  </span>
                  <span className="flex items-center gap-1">
                    <Check className="h-4 w-4 text-brand-500" /> Professional Products
                  </span>
                </div>

                {error && (
                  <p className="text-center text-sm font-medium text-red-600" role="alert">{error}</p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentIndex === 0}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
              currentIndex === 0
                ? "invisible"
                : "text-accent hover:bg-brand-50"
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          {currentStep === "review" ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-full bg-accent px-8 py-3 text-sm font-semibold uppercase tracking-wider text-white shadow-brand transition-all hover:bg-brand-700 disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                  />
                  Generating Quote...
                </>
              ) : (
                <>
                  Get My Instant Price
                  <Zap className="h-4 w-4" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-brand transition-all hover:bg-brand-700 disabled:opacity-50"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Social Proof */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-center text-sm text-muted-foreground"
      >
        <p>Join Flatwoods families who trust Tri State for a healthier home</p>
        <div className="mt-2 flex items-center justify-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className="text-sunshine">★</span>
          ))}
          <span className="ml-2 font-medium">Trusted by Flatwoods families</span>
        </div>
      </motion.div>
    </div>
  );
};
