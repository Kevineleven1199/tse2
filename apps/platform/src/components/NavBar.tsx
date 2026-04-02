"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useRef, useEffect } from "react";
import { Menu, X, Phone, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { LogoutButton } from "@/src/components/LogoutButton";

type NavItem = {
  label: string;
  href: string;
  external?: boolean;
  children?: NavItem[];
};

type NavBarSession = {
  name: string;
  role: "HQ" | "MANAGER" | "CLEANER" | "CUSTOMER";
};

type NavBarProps = {
  session?: NavBarSession | null;
};

const SERVICES: NavItem[] = [
  { label: "All Services", href: "/services" },
  { label: "Home Cleaning", href: "/services#healthy-home" },
  { label: "Deep Refresh & Detox", href: "/services#deep-refresh" },
  { label: "Move-In / Move-Out", href: "/services#move-clean" },
  { label: "Pressure Washing", href: "/services#pressure-wash" },
  { label: "Auto Detailing", href: "/services#auto-detail" },
  { label: "Home Watch", href: "/services#home-watch" },
  { label: "Airbnb Turnover", href: "/services#airbnb-turnover" },
  { label: "Carpet & Steam", href: "/services#carpet-steam" },
  { label: "Commercial Solutions", href: "/commercial" },
];

const NAV_ITEMS: NavItem[] = [
  { label: "Services", href: "/services", children: SERVICES },
  { label: "Commercial", href: "/commercial" },
  { label: "Why Organic?", href: "/#why-green" },
  { label: "Reviews", href: "/reviews" },
  { label: "FAQ", href: "/#faq" },
  { label: "Blog", href: "/blog" }
];

const PORTAL_LINK: Record<NavBarSession["role"], string> = {
  HQ: "/admin",
  MANAGER: "/manager",
  CLEANER: "/employee-hub",
  CUSTOMER: "/client"
};

type DesktopNavItemProps = {
  item: NavItem;
  close: () => void;
};

const DesktopNavItem = ({ item, close }: DesktopNavItemProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowDropdown(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setShowDropdown(false), 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!item.children || item.children.length === 0) {
    return (
      <Link
        href={item.href}
        onClick={close}
        target={item.external ? "_blank" : undefined}
        rel={item.external ? "noopener noreferrer" : undefined}
        className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 transition-colors duration-200 hover:bg-brand-50 hover:text-accent"
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="relative">
      <button className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 transition-colors duration-200 hover:bg-brand-50 hover:text-accent">
        {item.label}
        <ChevronDown className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-50 mt-1 min-w-max rounded-lg border border-brand-100 bg-white shadow-lg"
          >
            <div className="py-1">
              {item.children.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={() => {
                    close();
                    setShowDropdown(false);
                  }}
                  target={child.external ? "_blank" : undefined}
                  rel={child.external ? "noopener noreferrer" : undefined}
                  className="block px-4 py-2 text-sm transition hover:bg-brand-50 hover:text-accent"
                >
                  {child.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

type MobileNavItemProps = {
  item: NavItem;
  close: () => void;
};

const MobileNavItem = ({ item, close }: MobileNavItemProps) => {
  const [expanded, setExpanded] = useState(false);

  if (!item.children || item.children.length === 0) {
    return (
      <Link
        href={item.href}
        target={item.external ? "_blank" : undefined}
        rel={item.external ? "noopener noreferrer" : undefined}
        onClick={close}
        className="rounded-xl px-4 py-3 text-base font-medium text-foreground/80 transition hover:bg-brand-50 hover:text-accent"
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-base font-medium text-foreground/80 transition hover:bg-brand-50 hover:text-accent"
      >
        {item.label}
        <ChevronDown className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-brand-50/50"
          >
            <div className="flex flex-col gap-1 px-2 py-2">
              {item.children.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  target={child.external ? "_blank" : undefined}
                  rel={child.external ? "noopener noreferrer" : undefined}
                  onClick={close}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 transition hover:bg-brand-100 hover:text-accent"
                >
                  {child.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const NavBar = ({ session }: NavBarProps) => {
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen((prev) => !prev);
  const close = () => setOpen(false);
  const portalHref = session ? PORTAL_LINK[session.role] : null;
  const portalLabel = useMemo(() => {
    if (!session) return null;
    return "Go to Dashboard";
  }, [session]);

  return (
    <>
      {/* Top utility bar — phone + login */}
      <div className="hidden border-b border-brand-50 bg-brand-50/60 md:block">
        <div className="section-wrapper flex h-9 items-center justify-between text-xs">
          <Link
            href="tel:+16065550100"
            className="flex items-center gap-1.5 font-medium text-accent transition hover:text-brand-700"
          >
            <Phone className="h-3 w-3" />
            (606) 555-0100
          </Link>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="text-[11px] tracking-wide">
              Serving Flatwoods, Ashland &amp; Tri-State Area
            </span>
            <span className="text-brand-200">|</span>
            {session ? (
              <div className="flex items-center gap-3">
                <span className="font-semibold text-brand-700">{portalLabel}</span>
                <Link
                  href={portalHref ?? "/login"}
                  className="font-semibold text-accent underline-offset-2 hover:underline"
                >
                  Open Portal
                </Link>
                <LogoutButton className="text-muted-foreground hover:text-accent" />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="font-medium text-muted-foreground hover:text-accent">
                  Login
                </Link>
                <Link href="/register" className="font-medium text-accent hover:text-brand-700">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main navigation bar */}
      <header className="sticky top-0 z-50 w-full border-b border-brand-50 bg-white/95 shadow-sm backdrop-blur">
        <div className="section-wrapper flex h-16 items-center justify-between md:h-[72px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3" onClick={close}>
            <Image
              src="/images/cropped-Mobile-Logo-164x76.png"
              alt="Tri State Enterprise logo"
              width={164}
              height={76}
              priority
              className="h-10 w-auto object-contain md:h-12"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <DesktopNavItem key={item.label} item={item} close={close} />
            ))}
            <div className="ml-2 pl-2 border-l border-brand-100">
              <Link
                href="/get-a-quote"
                className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-accent px-6 py-2 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
              >
                Get a Free Quote
              </Link>
            </div>
          </nav>

          {/* Mobile: phone + hamburger */}
          <div className="flex items-center gap-3 md:hidden">
            <Link
              href="tel:+16065550100"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-accent"
              aria-label="Call us"
            >
              <Phone className="h-4 w-4" />
            </Link>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-100 bg-white text-accent shadow-sm transition hover:bg-brand-50/60"
              onClick={toggle}
              aria-expanded={open}
              aria-controls="mobile-nav"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {open ? (
            <motion.nav
              id="mobile-nav"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="border-t border-brand-50 bg-white shadow-lg md:hidden"
            >
              <div className="section-wrapper flex flex-col gap-1 py-4">
                {NAV_ITEMS.map((item) => (
                  <MobileNavItem key={item.label} item={item} close={close} />
                ))}

                <div className="mt-3 flex flex-col gap-2 border-t border-brand-50 pt-4">
                  <Link
                    href="/get-a-quote"
                    onClick={close}
                    className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-700"
                  >
                    Get a Free Quote
                  </Link>
                  {session ? (
                    <>
                      <Link
                        href={portalHref ?? "/login"}
                        onClick={close}
                        className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-brand-200 px-5 py-3 text-sm font-semibold text-accent"
                      >
                        Open {portalLabel}
                      </Link>
                      <LogoutButton
                        variant="button"
                        className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-brand-100 bg-white px-5 py-3 text-sm font-medium text-muted-foreground"
                      />
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/login"
                        onClick={close}
                        className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-brand-200 px-4 py-3 text-sm font-semibold text-accent"
                      >
                        Login
                      </Link>
                      <Link
                        href="/register"
                        onClick={close}
                        className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-brand-200 px-4 py-3 text-sm font-semibold text-accent"
                      >
                        Register
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.nav>
          ) : null}
        </AnimatePresence>
      </header>
    </>
  );
};
