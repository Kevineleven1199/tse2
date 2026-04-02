"use client";

export type MarketplaceJob = {
  id: string;
  type: string;
  payout: string;
  duration: string;
  location: string;
  start: string;
  status: string;
};

type MarketplaceBoardProps = {
  jobs: MarketplaceJob[];
  onlineCrews: number;
};

const MarketplaceBoard = ({ jobs, onlineCrews }: MarketplaceBoardProps) => (
  <section className="glass rounded-3xl p-6 text-white">
    <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="font-display text-2xl">Crew marketplace</h2>
        <p className="text-sm text-white/70">
          Jobs appear here after customer approval. Cleans run on a 65/35 split.
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-white/60">
        <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-emerald-200">
          {onlineCrews} crew{onlineCrews !== 1 ? "s" : ""} online
        </span>
        <span className="inline-flex items-center rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-sky-200">
          Smart routing enabled
        </span>
      </div>
    </header>
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {jobs.length === 0 && (
        <div className="col-span-2 rounded-3xl border border-dashed border-white/20 p-12 text-center text-white/60">
          <p className="text-lg font-semibold text-white/80">No open jobs</p>
          <p className="mt-2 text-sm">
            When customers accept quotes and jobs are created, they will appear here for crews to claim.
          </p>
        </div>
      )}
      {jobs.map((job) => (
        <article
          key={job.id}
          className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/80 transition hover:border-brand-200 hover:text-white"
        >
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-white/50">
              {job.id.slice(0, 12)}
            </p>
            <h3 className="font-display text-2xl text-white">{job.type}</h3>
            <p>{job.location}</p>
            <p className="text-white/60">{job.start}</p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                {job.duration}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs ${
                job.status === "PENDING" ? "bg-amber-500/20 text-amber-200" :
                job.status === "CLAIMED" ? "bg-sky-500/20 text-sky-200" :
                job.status === "SCHEDULED" ? "bg-emerald-500/20 text-emerald-200" :
                "bg-white/10"
              }`}>
                {job.status}
              </span>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <div className="text-xl font-semibold text-white">{job.payout}</div>
          </div>
        </article>
      ))}
    </div>
  </section>
);

export default MarketplaceBoard;
