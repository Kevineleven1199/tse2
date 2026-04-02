import React from "react";

export type SkeletonVariant = "dashboard" | "table" | "form" | "card-grid";

const Pulse = ({ className }: { className: string }) => (
  <div className={`animate-pulse rounded-xl bg-brand-100/60 ${className}`} />
);

const DashboardSkeleton = () => (
  <div className="space-y-6 p-6">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-brand-100 p-5">
          <Pulse className="mb-3 h-4 w-24" />
          <Pulse className="h-8 w-32" />
          <Pulse className="mt-2 h-3 w-16" />
        </div>
      ))}
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-brand-100 p-5">
        <Pulse className="mb-4 h-5 w-40" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Pulse key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-brand-100 p-5">
        <Pulse className="mb-4 h-5 w-36" />
        <Pulse className="h-48 w-full" />
      </div>
    </div>
  </div>
);

const TableSkeleton = () => (
  <div className="space-y-4 p-6">
    <Pulse className="h-6 w-48" />
    <div className="overflow-hidden rounded-2xl border border-brand-100">
      <div className="border-b border-brand-100 bg-brand-50/50 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Pulse key={i} className="h-4 w-24" />
          ))}
        </div>
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-brand-100/50 px-4 py-3 last:border-b-0">
          {Array.from({ length: 5 }).map((_, j) => (
            <Pulse key={j} className="h-4 w-24" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

const FormSkeleton = () => (
  <div className="mx-auto max-w-2xl space-y-6 p-6">
    <Pulse className="h-8 w-64" />
    <Pulse className="h-4 w-96" />
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i}>
          <Pulse className="mb-2 h-4 w-24" />
          <Pulse className="h-12 w-full" />
        </div>
      ))}
    </div>
    <Pulse className="h-12 w-40" />
  </div>
);

const CardGridSkeleton = () => (
  <div className="space-y-6 p-6">
    <Pulse className="h-6 w-48" />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-brand-100 p-5">
          <Pulse className="mb-3 h-5 w-32" />
          <Pulse className="mb-2 h-4 w-full" />
          <Pulse className="h-4 w-3/4" />
          <Pulse className="mt-4 h-8 w-24" />
        </div>
      ))}
    </div>
  </div>
);

const variants: Record<SkeletonVariant, () => React.ReactElement> = {
  dashboard: DashboardSkeleton,
  table: TableSkeleton,
  form: FormSkeleton,
  "card-grid": CardGridSkeleton,
};

export const LoadingSkeleton = ({ variant = "dashboard" }: { variant?: SkeletonVariant }) => {
  const Component = variants[variant];
  return <Component />;
};
