"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/src/lib/utils";

type AddressAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
};

type Suggestion = {
  id: string;
  label: string;
  context?: string;
};

const MAPBOX_ENDPOINT = "https://api.mapbox.com/geocoding/v5/mapbox.places";

export const AddressAutocomplete = ({
  value,
  onChange,
  label = "Street address",
  placeholder = "Start typing your address",
  required = false
}: AddressAutocompleteProps) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!token || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    let active = true;
    const controller = new AbortController();

    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${MAPBOX_ENDPOINT}/${encodeURIComponent(query)}.json?autocomplete=true&types=address&limit=5&access_token=${token}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error("Address lookup failed");
        const data = await response.json();
        if (!active) return;
        const next = (data.features ?? []).map((feature: any) => ({
          id: feature.id as string,
          label: feature.place_name as string,
          context: feature.context?.map((ctx: any) => ctx.text).join(", ")
        }));
        setSuggestions(next);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("[AddressAutocomplete] Lookup failed", error);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    const timeout = window.setTimeout(fetchSuggestions, 250);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query, token]);

  const hasSuggestions = suggestions.length > 0;

  return (
    <label className="flex flex-col text-xs font-semibold uppercase tracking-[0.25em] text-accent">
      {label}
      <div className="relative mt-2">
        <input
          className={cn(
            "w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-brand-200",
            hasSuggestions && "rounded-b-none"
          )}
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange(event.target.value);
          }}
          required={required}
          autoComplete="street-address"
        />
        {loading ? <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">…</span> : null}
      </div>
      {hasSuggestions ? (
        <ul className="max-h-60 overflow-y-auto rounded-b-2xl border border-t-0 border-brand-100 bg-white shadow-lg shadow-brand-100/50">
          {suggestions.map((suggestion) => (
            <li key={suggestion.id}>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-brand-50"
                onClick={() => {
                  onChange(suggestion.label);
                  setQuery(suggestion.label);
                  setSuggestions([]);
                }}
              >
                {suggestion.label}
                {suggestion.context ? <span className="block text-xs text-muted-foreground">{suggestion.context}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </label>
  );
};
