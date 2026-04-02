import CommunityFeed from "@/components/community/feed";
import { resolveTenantParams, type TenantPageProps } from "@/src/lib/tenant";

const CommunityPage = async ({ params }: TenantPageProps) => {
  const { tenantSlug } = await resolveTenantParams(params);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
        <h1 className="font-display text-3xl">Neighbor feed • {tenantSlug.toUpperCase()}</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/70">
          A nextdoor-inspired hub showcasing transformations, loyalty perks, live-stories from crews, and referral drives to keep neighborhoods
          buzzing about TriState.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/60">
          <span className="rounded-full border border-white/20 px-3 py-1">Weekly newsletter automation ON</span>
          <span className="rounded-full border border-white/20 px-3 py-1">UGC approvals (2 pending)</span>
          <span className="rounded-full border border-white/20 px-3 py-1">Referral leaderboard</span>
        </div>
      </header>
      <CommunityFeed />
    </div>
  );
};

export default CommunityPage;
