import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Brush, ShieldCheck, Mail, Phone, Loader2 } from "lucide-react";

type Cleaner = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  rating: number;
  completedJobs: number;
  totalEarnings: number;
  status: "active" | "inactive";
  createdAt: string;
};

export default async function ManagerTeamPage() {
  await requireSession({ roles: ["MANAGER", "HQ"], redirectTo: "/manager" });

  try {
    const cleaners = await prisma.user.findMany({
      where: { role: "CLEANER" },
      include: {
        cleaner: {
          include: {
            payouts: {
              select: { amount: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const cleanerData: Cleaner[] = cleaners.map((user) => {
      const profile = user.cleaner;
      const totalEarnings = profile?.payouts?.reduce((sum, p) => sum + p.amount, 0) ?? 0;

      return {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        phone: user.phone || undefined,
        rating: profile?.rating ?? 5.0,
        completedJobs: profile?.completedJobs ?? 0,
        totalEarnings,
        status: profile?.active ? "active" : "inactive",
        createdAt: new Date(user.createdAt).toLocaleDateString(),
      };
    });

    const managers = await prisma.user.findMany({
      where: { role: "HQ" },
      orderBy: { createdAt: "desc" },
    });

    return (
      <div className="space-y-6">
        <Card className="bg-white">
          <CardHeader className="space-y-3">
            <h1 className="text-2xl font-semibold text-accent">Team Management</h1>
            <p className="text-sm text-muted-foreground">
              View and manage your team members. Cleaners can see their assigned jobs
              and earnings. HQ managers have full platform access.
            </p>
          </CardHeader>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <TeamListCard
            title="Cleaners"
            icon={Brush}
            description="Active cleaners with access to the job marketplace and payouts dashboard."
            loading={false}
            emptyMessage="No cleaners yet. Add your first cleaner in settings."
            items={cleanerData.map((cleaner) => ({
              id: cleaner.id,
              name: cleaner.name,
              email: cleaner.email,
              phone: cleaner.phone ?? "—",
              meta: `Rating: ${cleaner.rating.toFixed(1)} | Jobs: ${cleaner.completedJobs} | Earnings: $${cleaner.totalEarnings.toFixed(2)}`,
              createdAt: cleaner.createdAt,
              status: cleaner.status,
            }))}
          />

          <TeamListCard
            title="HQ Managers"
            icon={ShieldCheck}
            description="Admin-level teammates who can edit automations, requests, and integrations."
            loading={false}
            emptyMessage="No HQ managers yet."
            items={managers.map((manager) => ({
              id: manager.id,
              name: `${manager.firstName} ${manager.lastName}`.trim(),
              email: manager.email,
              phone: manager.phone ?? "—",
              meta: `Joined ${new Date(manager.createdAt).toLocaleDateString()}`,
              createdAt: new Date(manager.createdAt).toLocaleDateString(),
              status: "active" as const,
            }))}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Failed to fetch team data:", error);
    return (
      <div className="space-y-6">
        <Card className="bg-white">
          <CardHeader className="space-y-3">
            <h1 className="text-2xl font-semibold text-accent">Team Management</h1>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Error loading team data. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
}

type TeamListProps = {
  title: string;
  description: string;
  loading: boolean;
  emptyMessage: string;
  icon: React.ComponentType<{ className?: string }>;
  items: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    meta: string;
    createdAt: string;
    status: "active" | "inactive";
  }>;
};

const TeamListCard = ({
  title,
  description,
  loading,
  emptyMessage,
  icon: Icon,
  items,
}: TeamListProps) => (
  <Card className="bg-white">
    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-accent">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-accent">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-brand-100 px-4 py-12 text-accent">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-brand-100 bg-white px-4 py-12 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl border border-brand-100 bg-brand-50/40 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-accent">{item.name}</p>
                  <span
                    className={`text-xs font-medium rounded-full px-2 py-1 ${
                      item.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {item.status === "active" ? "Active" : "Inactive"}
                  </span>
                </div>
                <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  {item.createdAt}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {item.email}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {item.phone}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{item.meta}</p>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);
