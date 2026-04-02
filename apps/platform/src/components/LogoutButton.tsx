"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useToast } from "@/src/lib/toast";

type LogoutButtonProps = {
  variant?: "link" | "button";
  className?: string;
};

export const LogoutButton = ({ variant = "link", className }: LogoutButtonProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleLogout = () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/logout", { method: "POST" });
        if (!response.ok) {
          toast({
            variant: "error",
            title: "Unable to sign out",
            description: "Please try again."
          });
          return;
        }

        toast({
          variant: "success",
          title: "Signed out",
          description: "See you next time."
        });
        router.replace("/");
        router.refresh();
      } catch (error) {
        toast({
          variant: "error",
          title: "Unable to sign out",
          description: error instanceof Error ? error.message : "Network error"
        });
      }
    });
  };

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        className={className ?? "rounded-full border border-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent"}
      >
        {pending ? "Signing out..." : "Sign out"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className={className ?? "text-xs font-semibold uppercase tracking-[0.24em] text-accent"}
    >
      {pending ? "Signing out..." : "Log out"}
    </button>
  );
};
