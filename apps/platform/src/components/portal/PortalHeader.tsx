"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import { LogoutButton } from "@/src/components/LogoutButton";
import { cn } from "@/src/lib/utils";

export type PortalNavItem = {
  label: string;
  href: string;
  match?: "exact" | "prefix";
  children?: PortalNavItem[];
};

type PortalHeaderProps = {
  brand: string;
  navItems: PortalNavItem[];
  userName: string;
  portalRoot?: string;
};

type DesktopDropdownProps = {
  item: PortalNavItem & { isActive: boolean };
  isOpen: boolean;
  onToggle: (label: string) => void;
  onClose: () => void;
};

const DesktopDropdown = ({ item, isOpen, onToggle, onClose }: DesktopDropdownProps) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (!isOpen) onToggle(item.label);
  };

  const handleMouseLeave = () => {
    // Generous 400ms delay so menu stays open while moving to it
    timeoutRef.current = setTimeout(() => onClose(), 400);
  };

  const handleClick = () => {
    onToggle(item.label);
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
        onClick={onClose}
        aria-current={item.isActive ? "page" : undefined}
        className={cn(
          "flex-shrink-0 rounded-full px-3 py-2 text-sm font-medium transition-colors",
          item.isActive ? "bg-brand-50 text-brand-700" : "hover:text-brand-600"
        )}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition-colors",
          item.isActive ? "bg-brand-50 text-brand-700" : "hover:text-brand-600",
          isOpen && "bg-brand-50 text-brand-700"
        )}
      >
        {item.label}
        <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {/* Invisible bridge between button and dropdown to prevent gap death zone */}
      {isOpen && <div className="absolute left-0 right-0 top-full h-2" />}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full z-50 mt-2 min-w-[200px] rounded-2xl border border-brand-100 bg-white py-2 shadow-2xl ring-1 ring-black/5"
          >
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                onClick={onClose}
                className="flex items-center px-4 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-brand-50 hover:text-brand-700"
              >
                {child.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

type MobileDropdownProps = {
  item: PortalNavItem & { isActive: boolean };
  close: () => void;
};

const MobileDropdown = ({ item, close }: MobileDropdownProps) => {
  const [expanded, setExpanded] = useState(false);

  if (!item.children || item.children.length === 0) {
    return (
      <Link
        href={item.href}
        onClick={close}
        aria-current={item.isActive ? "page" : undefined}
        className={cn(
          "flex items-center justify-between rounded-2xl px-4 py-3.5 text-base font-semibold transition min-h-[44px]",
          item.isActive
            ? "bg-brand-50 text-brand-700"
            : "bg-white text-accent shadow-sm hover:bg-brand-50/70 hover:text-brand-700"
        )}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-base font-semibold transition min-h-[44px]",
          item.isActive
            ? "bg-brand-50 text-brand-700"
            : "bg-white text-accent shadow-sm hover:bg-brand-50/70 hover:text-brand-700"
        )}
      >
        {item.label}
        <ChevronDown className={cn("h-5 w-5 transition-transform", expanded && "rotate-180")} />
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
                  onClick={close}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-accent transition hover:bg-brand-100 hover:text-brand-700 min-h-[44px] flex items-center"
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

export const PortalHeader = ({ brand, navItems, userName, portalRoot = "/" }: PortalHeaderProps) => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  const items = useMemo(() => {
    const normalized = navItems.map((item) => ({ ...item, match: item.match ?? "prefix" }));

    const checkActive = (item: PortalNavItem): boolean => {
      const match = item.match ?? "prefix";
      const isActive =
        match === "exact"
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

      if (isActive) return true;

      if (item.children) {
        return item.children.some((child) => {
          const childMatch = child.match ?? "prefix";
          return childMatch === "exact"
            ? pathname === child.href
            : pathname === child.href || pathname.startsWith(`${child.href}/`);
        });
      }

      return false;
    };

    return normalized.map((item) => ({
      ...item,
      isActive: checkActive(item),
    }));
  }, [navItems, pathname]);

  const close = () => setOpen(false);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Escape key to close dropdown
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleDropdownToggle = (label: string) => {
    setOpenDropdown((prev) => (prev === label ? null : label));
  };

  const handleDropdownClose = () => {
    setOpenDropdown(null);
  };

  return (
    <header ref={headerRef} className="sticky top-0 z-50 w-full border-b border-brand-100 bg-white/98 backdrop-blur-md shadow-sm">
      <div className="section-wrapper flex h-16 items-center justify-between gap-4">
        <Link href={portalRoot} className="text-sm font-semibold uppercase tracking-[0.4em] text-accent" onClick={close}>
          {brand}
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:gap-4 text-sm font-medium text-accent/80 md:flex">
          {items.map((item) => (
            <DesktopDropdown
              key={item.label}
              item={item}
              isOpen={openDropdown === item.label}
              onToggle={handleDropdownToggle}
              onClose={handleDropdownClose}
            />
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <span className="hidden text-xs font-semibold uppercase tracking-[0.3em] text-brand-600 lg:inline">
            {userName}
          </span>
          <LogoutButton />
        </div>

        <button
          type="button"
          className="rounded-full border border-brand-100 bg-white px-3 py-2 text-accent shadow-sm transition hover:bg-brand-50/60 md:hidden"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls="portal-mobile-nav"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.nav
            id="portal-mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="border-t border-brand-50 bg-white/98 shadow-lg md:hidden"
          >
            <div className="section-wrapper flex flex-col gap-2 py-4">
              {items.map((item) => (
                <MobileDropdown key={item.label} item={item} close={close} />
              ))}

              <div className="mt-2 rounded-3xl border border-brand-100 bg-brand-50/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-700">{userName}</p>
                <div className="mt-3">
                  <LogoutButton
                    variant="button"
                    className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-accent bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent"
                  />
                </div>
              </div>
            </div>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
};
