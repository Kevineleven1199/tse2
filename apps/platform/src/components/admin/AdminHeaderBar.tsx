"use client";
import { GlobalSearch } from "./GlobalSearch";

interface AdminHeaderBarProps {
  userName: string;
}

export function AdminHeaderBar({ userName }: AdminHeaderBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-3">
        <GlobalSearch />
        <span className="hidden text-xs text-muted-foreground lg:inline">
          Press <kbd className="rounded border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-brand-700">⌘K</kbd> to search
        </span>
      </div>
    </div>
  );
}
