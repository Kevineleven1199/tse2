"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useToast } from "@/src/lib/toast";

type Profile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
};

export const SettingsForm = () => {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/client/profile", { method: "GET" });
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "Unable to load profile.");
        }

        const data = (await response.json()) as { profile: Profile };
        if (!active) return;

        setProfile(data.profile);
        setFirstName(data.profile.firstName ?? "");
        setLastName(data.profile.lastName ?? "");
        setPhone(data.profile.phone ?? "");
      } catch (error) {
        toast({
          variant: "error",
          title: "Unable to load profile",
          description: error instanceof Error ? error.message : "Network error"
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [toast]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile) return;

    startTransition(async () => {
      try {
        const response = await fetch("/api/client/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName, phone })
        });

        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "Unable to save profile.");
        }

        const data = (await response.json()) as { profile?: Profile };
        if (data.profile) {
          setProfile(data.profile);
          setFirstName(data.profile.firstName ?? "");
          setLastName(data.profile.lastName ?? "");
          setPhone(data.profile.phone ?? "");
        }

        toast({ variant: "success", title: "Saved", description: "Your profile was updated." });
      } catch (error) {
        toast({
          variant: "error",
          title: "Could not save",
          description: error instanceof Error ? error.message : "Network error"
        });
      }
    });
  };

  if (!profile) {
    return (
      <div className="py-8 text-sm text-muted-foreground">
        {loading ? "Loading your profile…" : "Unable to load your profile. Please refresh."}
      </div>
    );
  }

  const changed =
    firstName !== profile.firstName || lastName !== profile.lastName || phone !== (profile.phone ?? "");

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
          First name
          <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} required autoComplete="given-name" />
        </label>

        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
          Last name
          <Input value={lastName} onChange={(event) => setLastName(event.target.value)} required autoComplete="family-name" />
        </label>

        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent md:col-span-2">
          Email
          <Input value={profile.email} readOnly disabled className="opacity-80" />
        </label>

        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent md:col-span-2">
          Phone
          <Input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" />
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Changes apply across your client hub after you save.</p>
        <Button type="submit" disabled={pending || !changed}>
          {pending ? "Saving…" : changed ? "Save changes" : "Saved"}
        </Button>
      </div>
    </form>
  );
};
