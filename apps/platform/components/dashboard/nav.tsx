"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/brand/logo";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/requests", label: "Requests" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/community", label: "Community" },
  { href: "/clients", label: "Clients" },
  { href: "/settings", label: "Settings" }
];

type DashboardNavProps = {
  tenantSlug: string;
};

const DashboardNav = ({ tenantSlug }: DashboardNavProps) => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = links.map((link) => {
    const href = `/${tenantSlug}${link.href}`;
    const active = pathname === href || pathname?.startsWith(`${href}/`);
    return (
      <Link
        key={link.href}
        href={href}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition ${
          active
            ? "bg-white/15 text-white shadow-brand"
            : "text-white/60 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span>{link.label}</span>
        <span className="text-xs text-white/40">&rarr;</span>
      </Link>
    );
  });

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-lg lg:hidden"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        )}
      </button>

      {/* Mobile slide-out nav */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform bg-slate-900 p-6 text-white transition-transform duration-200 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Logo className="justify-center" />
        <div className="mt-8 space-y-1">{navLinks}</div>
        <div className="mt-auto pt-6">
          <div className="rounded-2xl bg-white/10 p-4 text-xs text-white/70">
            <p className="font-semibold text-white">Quick links</p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href={`/${tenantSlug}/requests`} className="hover:text-white" onClick={() => setMobileOpen(false)}>
                  View Requests
                </Link>
              </li>
              <li>
                <Link href={`/${tenantSlug}/marketplace`} className="hover:text-white" onClick={() => setMobileOpen(false)}>
                  Marketplace
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="glass sticky top-6 hidden h-[calc(100vh-48px)] w-72 flex-col rounded-3xl p-6 text-white lg:flex">
        <Logo className="justify-center" />
        <div className="mt-8 space-y-1">{navLinks}</div>
        <div className="mt-auto rounded-2xl bg-white/10 p-4 text-xs text-white/70">
          <p className="font-semibold text-white">Quick links</p>
          <ul className="mt-3 space-y-2">
            <li>
              <Link href={`/${tenantSlug}/requests`} className="hover:text-white">
                View Requests
              </Link>
            </li>
            <li>
              <Link href={`/${tenantSlug}/marketplace`} className="hover:text-white">
                Marketplace
              </Link>
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
};

export default DashboardNav;
