"use client";

export type ClientRow = {
  name: string;
  email: string;
  phone: string;
  jobCount: number;
  status: string;
};

type ClientTableProps = {
  clients: ClientRow[];
};

const healthBadge: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-200",
  inactive: "bg-amber-500/20 text-amber-200",
};

const ClientTable = ({ clients }: ClientTableProps) => (
  <section className="glass rounded-3xl p-6 text-white">
    <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="font-display text-2xl">Client portfolio</h2>
        <p className="text-sm text-white/70">
          {clients.length} customer{clients.length !== 1 ? "s" : ""} on file.
        </p>
      </div>
    </header>
    {clients.length === 0 ? (
      <div className="mt-6 rounded-3xl border border-dashed border-white/20 p-12 text-center text-white/60">
        <p className="text-lg font-semibold text-white/80">No customers yet</p>
        <p className="mt-2 text-sm">
          Customers are created when service requests come in.
        </p>
      </div>
    ) : (
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {clients.map((client) => (
          <article
            key={client.email}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 transition hover:border-brand-200 hover:text-white"
          >
            <h3 className="font-semibold text-white">{client.name}</h3>
            <p className="mt-1 text-xs text-white/50">{client.email}</p>
            {client.phone && (
              <p className="text-xs text-white/50">{client.phone}</p>
            )}
            <p className="mt-2 text-sm text-brand-100">
              {client.jobCount} booking{client.jobCount !== 1 ? "s" : ""}
            </p>
            <span
              className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${healthBadge[client.status] ?? healthBadge.active}`}
            >
              {client.status}
            </span>
          </article>
        ))}
      </div>
    )}
  </section>
);

export default ClientTable;
