"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const GlobalError = ({ error, reset }: GlobalErrorProps) => {
  useEffect(() => {
    console.error("[app:error]", error);
  }, [error]);

  return (
    <div className="section-wrapper py-16">
      <Card className="bg-white">
        <CardHeader>
          <h1 className="text-2xl font-semibold text-accent">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t load this page. Try again, or head back home.
          </p>
        </CardHeader>
        <CardContent>
          {process.env.NODE_ENV !== "production" ? (
            <pre className="whitespace-pre-wrap rounded-2xl border border-brand-100 bg-brand-50/40 p-4 text-xs text-accent">
              {error.message}
            </pre>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-brand transition hover:bg-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
            >
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-brand-200 bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent transition hover:bg-brand-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
            >
              Go home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalError;
