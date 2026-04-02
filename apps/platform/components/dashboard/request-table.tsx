"use client";

export type RequestRow = {
  id: string;
  customer: string;
  service: string;
  submittedAt: string;
  status: string;
};

type RequestTableProps = {
  requests: RequestRow[];
};

const statusStyles: Record<string, string> = {
  NEW: "bg-brand-500/20 text-brand-100",
  QUOTED: "bg-sky-500/20 text-sky-200",
  ACCEPTED: "bg-emerald-500/20 text-emerald-200",
  SCHEDULED: "bg-amber-500/20 text-amber-200",
  COMPLETED: "bg-green-500/20 text-green-200",
  CANCELED: "bg-red-500/20 text-red-200",
};

const RequestTable = ({ requests }: RequestTableProps) => (
  <div className="glass rounded-3xl p-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="font-display text-2xl text-white">Open requests</h2>
        <p className="text-sm text-white/70">
          {requests.length} request{requests.length !== 1 ? "s" : ""} in the pipeline.
        </p>
      </div>
    </div>
    {requests.length === 0 ? (
      <div className="mt-6 rounded-2xl border border-dashed border-white/20 p-12 text-center text-white/60">
        <p className="text-lg font-semibold text-white/80">No requests yet</p>
        <p className="mt-2 text-sm">
          Incoming service requests will appear here as they come in.
        </p>
      </div>
    ) : (
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm text-white/70">
          <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/60">
            <tr>
              <th className="px-6 py-3">Request</th>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Service</th>
              <th className="px-6 py-3">Submitted</th>
              <th className="px-6 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {requests.map((request) => (
              <tr key={request.id} className="bg-white/5 hover:bg-white/10">
                <td className="px-6 py-4 font-semibold text-white">
                  {request.id.slice(0, 8)}
                </td>
                <td className="px-6 py-4">{request.customer}</td>
                <td className="px-6 py-4">{request.service}</td>
                <td className="px-6 py-4">{request.submittedAt}</td>
                <td className="px-6 py-4 text-right">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[request.status] ?? statusStyles.NEW}`}
                  >
                    {request.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

export default RequestTable;
