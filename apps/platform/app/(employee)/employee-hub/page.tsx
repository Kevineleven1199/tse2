import { getSession } from "@/src/lib/auth/session";
import { EmployeeFeedClient } from "@/src/components/employee/EmployeeFeedClient";
import { LevelCard } from "@/src/components/cleaner/LevelCard";
import { getCleanerPortalData } from "@/src/lib/cleaner-portal";
import { getCommunityFeed } from "@/src/lib/community";

const EmployeeHubPage = async () => {
  const session = await getSession();

  // Get real cleaner stats for the level card
  const portalData = session?.userId
    ? await getCleanerPortalData(session.userId)
    : null;
  const teamFeed = await getCommunityFeed(
    "TriState Team",
    undefined,
    undefined,
    "team",
    session?.tenantId
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-accent p-6 text-white shadow-lg md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Crew Hub</p>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">
              Welcome back, {session?.name?.split(" ")[0] ?? "crew member"}
            </h1>
            <p className="mt-1 text-brand-100">
              Your jobs, pay, and documents — all in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="/employee-hub/jobs" className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/25">
              Open Jobs
            </a>
            <a href="/employee-hub/schedule" className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/25">
              My Schedule
            </a>
            <a href="/employee-hub/documents" className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/25">
              Documents
            </a>
            <a href="/employee-hub/paystubs" className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/25">
              Paystubs
            </a>
          </div>
        </div>
      </div>

      {/* Real Level Card — based on actual completed jobs */}
      {portalData && <LevelCard stats={portalData.stats} />}

      {/* Feed */}
      <EmployeeFeedClient
        seedPosts={teamFeed.posts}
        userName={session?.name ?? "crew member"}
        userRole={session?.role ?? "CLEANER"}
      />
    </div>
  );
};

export default EmployeeHubPage;
