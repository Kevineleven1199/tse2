"use client";

import Link from "next/link";

type DashboardTopBarProps = {
  tenantName: string;
  basePath?: string;
};

const DashboardTopBar = ({ tenantName, basePath }: DashboardTopBarProps) => (
  <header className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 text-white md:flex-row md:items-center md:justify-between">
    <div>
      <h1 className="font-display text-2xl text-white">
        {tenantName} control center
      </h1>
      <p className="text-sm text-white/70">
        Track revenue, crew capacity, and customer happiness in real time.
      </p>
    </div>
    <div className="flex gap-3">
      <Link
        href={basePath ? `${basePath}/automations` : "/admin/automations"}
        className="inline-flex items-center rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white hover:text-white"
      >
        Automation builder
      </Link>
      <Link
        href="/get-a-quote"
        className="inline-flex items-center rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-brand transition hover:bg-brand-400"
      >
        New booking
      </Link>
    </div>
  </header>
);

export default DashboardTopBar;
