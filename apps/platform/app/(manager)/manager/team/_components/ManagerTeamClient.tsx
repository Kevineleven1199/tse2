"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Brush, Mail, Phone, CheckCircle2, XCircle } from "lucide-react";

type Cleaner = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  rating: number;
  completedJobs: number;
  status: "active" | "inactive";
  createdAt: string;
  hourlyRate: number;
};

type InviteFormData = {
  name: string;
  email: string;
  phone: string;
  hourlyRate: string;
};

export const ManagerTeamClient = ({
  initialCleaners,
}: {
  initialCleaners: Cleaner[];
}) => {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [formData, setFormData] = useState<InviteFormData>({
    name: "",
    email: "",
    phone: "",
    hourlyRate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cleanerList, setCleanerList] = useState(initialCleaners);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/invite-employee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          hourlyRate: parseFloat(formData.hourlyRate),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to invite cleaner");
        return;
      }

      // Add the new cleaner to the list
      const newCleaner: Cleaner = {
        id: data.user.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        rating: 5.0,
        completedJobs: 0,
        status: "active",
        createdAt: new Date().toLocaleDateString(),
        hourlyRate: parseFloat(formData.hourlyRate),
      };

      setCleanerList((prev) => [newCleaner, ...prev]);
      setFormData({
        name: "",
        email: "",
        phone: "",
        hourlyRate: "",
      });
      setShowInviteForm(false);
      setSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader className="space-y-3">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-semibold text-accent">Team</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Manage your cleaners and view their performance metrics.
              </p>
            </div>
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
            >
              {showInviteForm ? "Cancel" : "+ Invite Cleaner"}
            </button>
          </div>
        </CardHeader>
      </Card>

      {success && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          Cleaner invited successfully! They'll receive an email with login
          instructions.
        </div>
      )}

      {showInviteForm && (
        <Card className="bg-white">
          <CardHeader>
            <h2 className="text-lg font-semibold text-accent">
              Invite New Cleaner
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a new cleaner to your team
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-accent">
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                  disabled={loading}
                  className="mt-1 w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm text-accent placeholder-muted-foreground focus:border-accent focus:outline-none disabled:bg-brand-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-accent">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="john@example.com"
                  required
                  disabled={loading}
                  className="mt-1 w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm text-accent placeholder-muted-foreground focus:border-accent focus:outline-none disabled:bg-brand-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-accent">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(555) 123-4567"
                  disabled={loading}
                  className="mt-1 w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm text-accent placeholder-muted-foreground focus:border-accent focus:outline-none disabled:bg-brand-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-accent">
                  Hourly Rate *
                </label>
                <input
                  type="number"
                  name="hourlyRate"
                  value={formData.hourlyRate}
                  onChange={handleInputChange}
                  placeholder="25.00"
                  step="0.01"
                  min="0"
                  required
                  disabled={loading}
                  className="mt-1 w-full rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm text-accent placeholder-muted-foreground focus:border-accent focus:outline-none disabled:bg-brand-50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
              >
                {loading ? "Sending invitation..." : "Send Invitation"}
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-accent">
              <Brush className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-accent">Cleaners</h2>
              <p className="text-sm text-muted-foreground">
                View and manage your team of cleaners
              </p>
            </div>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-accent">
            {cleanerList.length}
          </span>
        </CardHeader>
        <CardContent className="space-y-4">
          {cleanerList.length === 0 ? (
            <div className="rounded-2xl border border-brand-100 bg-white px-4 py-12 text-center text-sm text-muted-foreground">
              No cleaners yet. Add your first cleaner by clicking "Invite Cleaner"
              above.
            </div>
          ) : (
            <div className="space-y-3">
              {cleanerList.map((cleaner) => (
                <div
                  key={cleaner.id}
                  className="rounded-3xl border border-brand-100 bg-brand-50/40 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-accent">
                        {cleaner.name}
                      </p>
                      <span
                        className={`text-xs font-medium rounded-full px-2 py-1 inline-flex items-center gap-1 ${
                          cleaner.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {cleaner.status === "active" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {cleaner.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      {cleaner.createdAt}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {cleaner.email}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {cleaner.phone ?? "—"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Rating: {cleaner.rating.toFixed(1)} | Jobs:{" "}
                    {cleaner.completedJobs} | Rate: ${cleaner.hourlyRate.toFixed(2)}/hr
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
