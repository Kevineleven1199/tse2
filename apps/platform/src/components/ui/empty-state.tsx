import Link from "next/link";
import { Card, CardContent } from "@/src/components/ui/card";

type EmptyStateAction = {
  label: string;
  href: string;
};

type EmptyStateProps = {
  title: string;
  description: string;
  action?: EmptyStateAction;
  variant?: "card" | "inline";
};

export const EmptyState = ({ title, description, action, variant = "card" }: EmptyStateProps) => {
  const body = (
    <div className="rounded-3xl border border-brand-100 bg-brand-50/30 px-6 py-8 text-center">
      <p className="text-lg font-semibold text-accent">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-brand transition hover:bg-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );

  if (variant === "inline") {
    return body;
  }

  return (
    <Card className="bg-white">
      <CardContent>
        {body}
      </CardContent>
    </Card>
  );
};
