"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/brand/logo";

const MainNav = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-6 z-40 flex items-center justify-between rounded-full border border-white/10 bg-slate-950/80 px-6 py-3 backdrop-blur">
      <Logo />
      <nav className="hidden items-center gap-6 text-sm font-semibold text-white/70 md:flex">
        <Link href="#features" className="hover:text-white">
          Features
        </Link>
        <Link href="#pricing" className="hover:text-white">
          Pricing
        </Link>
        <Link href="/community" className="hover:text-white">
          Neighbor feed
        </Link>
        <Link href="/login" className="hover:text-white">
          Log in
        </Link>
      </nav>

      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:text-white md:hidden"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        )}
      </button>

      <Link
        href="/register"
        className="hidden items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-brand-100 hover:text-brand-900 md:inline-flex"
      >
        Start free trial
      </Link>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 flex flex-col gap-1 rounded-2xl border border-white/10 bg-slate-950/95 p-4 backdrop-blur md:hidden">
          <Link href="#features" className="rounded-xl px-4 py-3 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setMobileOpen(false)}>
            Features
          </Link>
          <Link href="#pricing" className="rounded-xl px-4 py-3 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setMobileOpen(false)}>
            Pricing
          </Link>
          <Link href="/community" className="rounded-xl px-4 py-3 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setMobileOpen(false)}>
            Neighbor feed
          </Link>
          <Link href="/login" className="rounded-xl px-4 py-3 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setMobileOpen(false)}>
            Log in
          </Link>
          <Link
            href="/register"
            className="mt-2 rounded-full bg-white px-4 py-2 text-center text-sm font-semibold text-slate-900 transition hover:bg-brand-100 hover:text-brand-900"
            onClick={() => setMobileOpen(false)}
          >
            Start free trial
          </Link>
        </div>
      )}
    </header>
  );
};

export default MainNav;
