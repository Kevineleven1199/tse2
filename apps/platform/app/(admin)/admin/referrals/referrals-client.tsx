"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

interface Referral {
  id: string;
  referrerName: string;
  referrerEmail: string;
  referrerPhone: string | null;
  referralCode: string;
  referreeName: string | null;
  referreeEmail: string | null;
  status: string;
  rewardAmount: number;
  referreeDiscount: number;
  qualifiedAt: string | null;
  rewardedAt: string | null;
  createdAt: string;
}

interface Stats {
  byStatus: Record<string, number>;
  totalRewarded: number;
  totalRewardsPaid: number;
}

export default function ReferralsClient() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ referrerName: "", referrerEmail: "", referrerPhone: "" });

  const load = () => {
    fetch("/api/admin/referrals")
      .then((r) => r.json())
      .then((d) => {
        setReferrals(d.referrals || []);
        setStats(d.stats || null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.referrerName || !form.referrerEmail) return;
    setCreating(true);
    await fetch("/api/admin/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ referrerName: "", referrerEmail: "", referrerPhone: "" });
    setCreating(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/referrals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    QUALIFIED: "bg-blue-100 text-blue-800",
    REWARDED: "bg-green-100 text-green-800",
    EXPIRED: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">GROWTH</p>
        <h1 className="text-2xl font-semibold">Referral Program</h1>
        <p className="mt-1 text-sm text-brand-100">Track referrals and reward your advocates</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="bg-white">
            <CardContent className="pt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Referrals</p>
              <p className="mt-2 text-3xl font-bold text-accent">{referrals.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="pt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending</p>
              <p className="mt-2 text-3xl font-bold text-yellow-600">{stats.byStatus.PENDING || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="pt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rewarded</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{stats.totalRewarded}</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="pt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Paid Out</p>
              <p className="mt-2 text-3xl font-bold text-accent">${stats.totalRewardsPaid.toFixed(0)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create New Referral */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold text-accent">Generate Referral Code</h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <input
              placeholder="Customer name"
              value={form.referrerName}
              onChange={(e) => setForm({ ...form, referrerName: e.target.value })}
              className="flex-1 min-w-[180px] rounded-md border px-3 py-2 text-sm"
            />
            <input
              placeholder="Email"
              value={form.referrerEmail}
              onChange={(e) => setForm({ ...form, referrerEmail: e.target.value })}
              className="flex-1 min-w-[180px] rounded-md border px-3 py-2 text-sm"
            />
            <input
              placeholder="Phone (optional)"
              value={form.referrerPhone}
              onChange={(e) => setForm({ ...form, referrerPhone: e.target.value })}
              className="w-[160px] rounded-md border px-3 py-2 text-sm"
            />
            <button
              onClick={create}
              disabled={creating || !form.referrerName || !form.referrerEmail}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Generate Code"}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Referral Table */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-semibold text-accent">All Referrals</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Loading...</p>
          ) : referrals.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No referrals yet. Generate a code above to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="pb-3 pr-4">Referrer</th>
                    <th className="pb-3 pr-4">Code</th>
                    <th className="pb-3 pr-4">Referee</th>
                    <th className="pb-3 pr-4">Reward</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{r.referrerName}</p>
                        <p className="text-xs text-muted-foreground">{r.referrerEmail}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <code className="rounded bg-muted px-2 py-1 text-xs font-mono">{r.referralCode}</code>
                      </td>
                      <td className="py-3 pr-4">
                        {r.referreeName ? (
                          <div>
                            <p className="font-medium">{r.referreeName}</p>
                            <p className="text-xs text-muted-foreground">{r.referreeEmail}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not yet used</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium">${r.rewardAmount}</p>
                        <p className="text-xs text-muted-foreground">{r.referreeDiscount}% off</p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[r.status] || ""}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          {r.status === "PENDING" && r.referreeName && (
                            <button
                              onClick={() => updateStatus(r.id, "QUALIFIED")}
                              className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                            >
                              Qualify
                            </button>
                          )}
                          {r.status === "QUALIFIED" && (
                            <button
                              onClick={() => updateStatus(r.id, "REWARDED")}
                              className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
                            >
                              Mark Rewarded
                            </button>
                          )}
                          {r.status === "PENDING" && (
                            <button
                              onClick={() => updateStatus(r.id, "EXPIRED")}
                              className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                            >
                              Expire
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
