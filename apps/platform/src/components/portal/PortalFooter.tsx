import Link from "next/link";

export const APP_VERSION = "v11.0.0";

/**
 * Compact footer for all portal pages (admin, manager, employee, client, cleaner).
 * Shows a "Back to Site" link, version number, and copyright.
 */
export const PortalFooter = () => (
  <footer className="mt-auto border-t border-brand-100 bg-white pb-[env(safe-area-inset-bottom)]">
    <div className="section-wrapper flex flex-col items-center justify-between gap-3 py-5 text-sm sm:flex-row">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-brand-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-accent transition hover:bg-accent hover:text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to Site
        </Link>
        <Link
          href="/get-a-quote"
          className="text-xs font-medium text-accent/60 transition hover:text-accent"
        >
          Get a Quote
        </Link>
      </div>

      <p className="text-xs text-accent/50">
        © {new Date().getFullYear()} Tri State Enterprise &middot;{" "}
        <span className="font-mono">{APP_VERSION}</span>
      </p>
    </div>
  </footer>
);
