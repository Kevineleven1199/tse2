"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  MessageSquare,
  MoreHorizontal,
  Calendar,
  Briefcase,
  Star,
  DollarSign,
  Settings,
  Package,
  Trophy,
  Home,
  Heart,
} from "lucide-react";
import { useState } from "react";

export type BottomNavItem = {
  label: string;
  href: string;
  icon: string; // icon key
  match?: "exact" | "prefix";
};

type PortalBottomNavProps = {
  items: BottomNavItem[];
};

const ICON_MAP: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  todos: ClipboardList,
  team: Users,
  calls: MessageSquare,
  more: MoreHorizontal,
  schedule: Calendar,
  jobs: Briefcase,
  reviews: Star,
  payroll: DollarSign,
  settings: Settings,
  inventory: Package,
  achievements: Trophy,
  home: Home,
  pipeline: Heart,
};

export const PortalBottomNav = ({ items }: PortalBottomNavProps) => {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {/* Spacer to prevent content from hiding behind bottom nav */}
      <div className="h-20 md:hidden" />

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-brand-100/60 bg-white/90 backdrop-blur-xl backdrop-saturate-150 shadow-[0_-2px_24px_rgba(0,0,0,0.08)] md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-1 pt-1.5 pb-1.5">
          {items.map((item) => {
            const IconComponent = ICON_MAP[item.icon] || LayoutDashboard;
            const isActive =
              item.match === "exact"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-1.5 transition-all duration-150 min-w-[60px] min-h-[52px] active:scale-[0.92]",
                  isActive
                    ? "text-accent"
                    : "text-gray-400"
                )}
              >
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-200",
                  isActive && "bg-brand-100/80 shadow-sm"
                )}>
                  <IconComponent className={cn("h-[22px] w-[22px]", isActive && "text-accent")} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium leading-tight",
                  isActive ? "font-bold text-accent" : "text-gray-400"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="h-1 w-5 rounded-full bg-accent mt-0.5" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};
