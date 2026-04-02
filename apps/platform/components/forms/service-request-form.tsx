"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { z } from "zod";
import {
  ServiceRequestInput,
  serviceRequestSchema
} from "@/lib/validators";
import EstimatePhotoUpload from "@/src/components/customer/EstimatePhotoUpload";

const surfaces = [
  "Hardwood floors",
  "Tile & grout",
  "Windows",
  "Solar panels",
  "Driveway / patio",
  "Vehicle interior",
  "Vehicle exterior",
  "Upholstery",
  "Carpet",
  "Other"
];

type ServiceRequestFormProps = {
  tenantSlug?: string;
};

const ServiceRequestForm = ({ tenantSlug = "tse" }: ServiceRequestFormProps) => {
  const [state, setState] = useState<ServiceRequestInput>({
    tenantSlug,
    serviceType: "home_clean",
    location: {
      addressLine1: "",
      city: "",
      state: "FL",
      postalCode: ""
    },
    contact: {
      firstName: "",
      lastName: "",
      email: "",
      phone: ""
    },
    preferredWindows: [
      {
        start: "",
        end: ""
      }
    ],
    surfaces: []
  });

  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [estimateSessionId] = useState(() => {
    // Generate a unique session ID for this estimate request
    if (typeof window !== "undefined" && window.crypto) {
      return Array.from(window.crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  });

  const isValid = useMemo(() => {
    try {
      serviceRequestSchema.parse({ ...state, notes });
      return true;
    } catch (error) {
      return false;
    }
  }, [state, notes]);

  const updateField = <K extends keyof ServiceRequestInput>(
    key: K,
    value: ServiceRequestInput[K]
  ) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSurface = (surface: string) => {
    setState((prev) => {
      const exists = prev.surfaces.includes(surface);
      return {
        ...prev,
        surfaces: exists
          ? prev.surfaces.filter((item) => item !== surface)
          : [...prev.surfaces, surface]
      };
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        const payload = serviceRequestSchema.parse({ ...state, notes });
        const response = await fetch("/api/requests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody?.message ?? "Unable to submit request.");
        }

        const data = (await response.json()) as { requestId: string };

        // Link uploaded photos to the new request
        if (estimateSessionId) {
          try {
            await fetch("/api/estimate-photos/link", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId: estimateSessionId, requestId: data.requestId }),
            });
          } catch (photoError) {
            console.error("Failed to link photos to request:", photoError);
            // Don't fail the entire submission if photo linking fails
          }
        }

        setStatus("success");
        setMessage(
          `Your request has been received! Confirmation #${data.requestId}. Watch your phone for the quote.`
        );

        setState({
          tenantSlug,
          serviceType: "home_clean",
          location: {
            addressLine1: "",
            city: "",
            state: "FL",
            postalCode: ""
          },
          contact: {
            firstName: "",
            lastName: "",
            email: "",
            phone: ""
          },
          preferredWindows: [
            {
              start: "",
              end: ""
            }
          ],
          surfaces: []
        });
        setNotes("");
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again."
        );
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass space-y-6 rounded-3xl p-4 sm:p-6 md:p-8 text-white"
    >
      <header className="space-y-2 text-white">
        <h1 className="font-display text-3xl">Get a competitive eco quote</h1>
        <p className="text-white/70">
          Receive an AI-personalized estimate, availability windows, and cleaner
          confirmation in minutes.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-white/80">
          Service
          <select
            value={state.serviceType}
            onChange={(event) =>
              updateField(
                "serviceType",
                event.target.value as ServiceRequestInput["serviceType"]
              )
            }
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:border-brand-200"
          >
            <option value="home_clean">Home clean</option>
            <option value="pressure_wash">Pressure wash</option>
            <option value="auto_detail">Mobile auto detail</option>
            <option value="custom">Custom project</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/80">
          Approx. square footage
          <input
            type="number"
            inputMode="numeric"
            min={200}
            max={8000}
            placeholder="2000"
          value={state.squareFootage ?? ""}
          onChange={(event) =>
              updateField(
                "squareFootage",
                event.target.value ? Number(event.target.value) : undefined
              )
            }
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:border-brand-200"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-white/80">
          First name
          <input
            required
            value={state.contact.firstName}
            onChange={(event) =>
              updateField("contact", {
                ...state.contact,
                firstName: event.target.value
              })
            }
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:border-brand-200"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/80">
          Last name
          <input
            required
            value={state.contact.lastName}
            onChange={(event) =>
              updateField("contact", {
                ...state.contact,
                lastName: event.target.value
              })
            }
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:border-brand-200"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/80">
          Email
          <input
            required
            type="email"
            value={state.contact.email}
            onChange={(event) =>
              updateField("contact", {
                ...state.contact,
                email: event.target.value
              })
            }
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:border-brand-200"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/80">
          Mobile phone
          <input
            required
            type="tel"
            value={state.contact.phone}
            onChange={(event) =>
              updateField("contact", {
                ...state.contact,
                phone: event.target.value
              })
            }
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:border-brand-200"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-white/80">
          Address line 1
          <input
            required
            value={state.location.addressLine1}
            onChange={(event) =>
              updateField("location", {
                ...state.location,
                addressLine1: event.target.value
              })
            }
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:border-brand-200"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/80">
          Address line 2
          <input
            value={state.location.addressLine2 ?? ""}
            onChange={(event) =>
              updateField("location", {
                ...state.location,
                addressLine2: event.target.value
              })
            }
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:border-brand-200"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/80">
          City
          <input
            required
            value={state.location.city}
            onChange={(event) =>
              updateField("location", {
                ...state.location,
                city: event.target.value
              })
            }
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:border-brand-200"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/80">
          State
          <input
            required
            value={state.location.state}
            onChange={(event) =>
              updateField("location", {
                ...state.location,
                state: event.target.value
              })
            }
            maxLength={2}
            className="uppercase rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:border-brand-200"
          />
        </label>
        <label className="md:col-span-2 flex flex-col gap-2 text-sm text-white/80">
          Postal code
          <input
            required
            value={state.location.postalCode}
            onChange={(event) =>
              updateField("location", {
                ...state.location,
                postalCode: event.target.value
              })
            }
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:border-brand-200 md:max-w-xs"
          />
        </label>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-white">
          Preferred availability (2-3 options)
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.preferredWindows.map((window, index) => (
            <div
              key={`window-${index}-${window.start}`}
              className="rounded-2xl bg-white/5 p-4 text-sm text-white/70"
            >
              <label className="flex flex-col gap-1">
                Start
                <input
                  required
                  type="datetime-local"
                  value={window.start}
                  onChange={(event) => {
                    const preferredWindows = [...state.preferredWindows];
                    preferredWindows[index] = {
                      ...window,
                      start: event.target.value
                    };
                    updateField("preferredWindows", preferredWindows);
                  }}
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:border-brand-200"
                />
              </label>
              <label className="mt-3 flex flex-col gap-1">
                End
                <input
                  required
                  type="datetime-local"
                  value={window.end}
                  onChange={(event) => {
                    const preferredWindows = [...state.preferredWindows];
                    preferredWindows[index] = {
                      ...window,
                      end: event.target.value
                    };
                    updateField("preferredWindows", preferredWindows);
                  }}
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:border-brand-200"
                />
              </label>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              updateField("preferredWindows", [
                ...state.preferredWindows,
                { start: "", end: "" }
              ])
            }
            className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/20 text-sm font-semibold text-white/70 transition hover:border-brand-200 hover:text-white"
          >
            + Add window
          </button>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-white">
          Areas to focus on
        </legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {surfaces.map((surface) => {
            const active = state.surfaces.includes(surface);
            return (
              <button
                type="button"
                key={surface}
                onClick={() => toggleSurface(surface)}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "border-brand-200 bg-brand-500/30 text-white shadow-brand"
                    : "border-white/20 bg-white/5 text-white/70 hover:border-brand-200 hover:text-white"
                }`}
              >
                {surface}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2 text-sm text-white/80">
        Notes for your crew
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          placeholder="Key access instructions, pets, parking..."
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none focus:border-brand-200"
        />
      </label>

      <div className="rounded-2xl bg-white/5 p-4">
        <EstimatePhotoUpload sessionId={estimateSessionId} />
      </div>

      <button
        type="submit"
        disabled={!isValid || isPending}
        className="inline-flex w-full items-center justify-center rounded-full bg-brand-500 px-6 py-4 font-semibold text-white shadow-brand transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-white/20"
      >
        {isPending ? "Submitting..." : "Request my GoGreen quote"}
      </button>

      {status !== "idle" && (
        <div
          role="alert"
          className={`rounded-2xl border px-4 py-3 text-sm ${
            status === "success"
              ? "border-emerald-300/60 bg-emerald-400/10 text-emerald-200"
              : "border-rose-300/60 bg-rose-400/10 text-rose-200"
          }`}
        >
          {message}
        </div>
      )}
    </form>
  );
};

export default ServiceRequestForm;
