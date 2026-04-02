import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import TeamsClient from "./teams-client";

export default async function TeamsPage() {
  await requireSession({ roles: ["HQ"], redirectTo: "/login" });

  try {
    const teams = await prisma.cleanerTeam.findMany({
      include: {
        members: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalTeams = teams.length;
    const totalMembers = teams.reduce((sum, team) => sum + team.members.length, 0);

    // Serialize dates
    const serializedTeams = teams.map((team) => ({
      id: team.id,
      name: team.name,
      description: team.description,
      memberCount: team.members.length,
      memberIds: team.members.map((m) => m.cleanerId),
      createdAt: team.createdAt.toISOString(),
    }));

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
            TEAM MANAGEMENT
          </p>
          <h1 className="text-2xl font-semibold">Cleaner Teams</h1>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm text-muted-foreground">Total Teams</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalTeams}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm text-muted-foreground">Total Members</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalMembers}</p>
            </CardContent>
          </Card>
        </div>

        <TeamsClient initialData={serializedTeams} />
      </div>
    );
  } catch (error) {
    console.error("Failed to load Cleaner Teams:", error);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Cleaner Teams</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load data. Please try refreshing the page.
        </div>
      </div>
    );
  }
}
