import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

const NotFound = () => {
  return (
    <div className="section-wrapper py-16">
      <Card className="bg-white">
        <CardHeader>
          <h1 className="text-2xl font-semibold text-accent">Page not found</h1>
          <p className="text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist, or it may have moved.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-brand transition hover:bg-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
            >
              Go home
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-brand-200 bg-white px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent transition hover:bg-brand-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
            >
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
